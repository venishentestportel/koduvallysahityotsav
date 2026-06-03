require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { initSockets } = require('./sockets');
const { initializeWhatsAppForClient, clients, getChats, getContacts, sendMessage, sendMedia, logout } = require('./whatsapp');

const targetsFilePath = path.join(__dirname, 'whatsapp-targets.json');
const routingFilePath = path.join(__dirname, 'whatsapp-routing.json');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Init Sockets
initSockets(server);

function getClientId(req) {
    if (!req) return 'default';
    const query = req.query || {};
    const body = req.body || {};
    const headers = req.headers || {};
    return query.clientId || body.clientId || headers['client-id'] || 'default';
}

function getActiveClientId(requestedClientId) {
    // 1. If requested is connected, use it
    const requested = clients[requestedClientId];
    if (requested && requested.client && (requested.status.state === 'CONNECTED' || requested.status.state === 'AUTHENTICATED')) {
        return requestedClientId;
    }
    // 2. Otherwise, find the first connected client
    for (const cid of Object.keys(clients)) {
        const c = clients[cid];
        if (c && c.client && (c.status.state === 'CONNECTED' || c.status.state === 'AUTHENTICATED')) {
            console.log(`Failing over message send from ${requestedClientId} to active client ${cid}`);
            return cid;
        }
    }
    return requestedClientId; // fallback
}

// API Routes
app.get('/status', (req, res) => {
    const clientId = getClientId(req);
    try {
        if (!clients[clientId]) {
            // Auto initialize in background
            initializeWhatsAppForClient(clientId).catch(err => {
                console.error(`Error during client auto-init for ${clientId}:`, err);
            });
            res.json({ state: 'INITIALIZING', qr: null, info: null });
            return;
        }
        res.json(clients[clientId].status);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/chats', async (req, res) => {
    const clientId = getClientId(req);
    const forceRefresh = req.query.forceRefresh === 'true';
    try {
        const chats = await getChats(clientId, forceRefresh);
        res.json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/contacts', async (req, res) => {
    const clientId = getClientId(req);
    const forceRefresh = req.query.forceRefresh === 'true';
    try {
        const contacts = await getContacts(clientId, forceRefresh);
        res.json({ success: true, contacts });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Simple Message Deduplication Cache
let lastSentMessages = {}; // clientId_chatId -> { message, timestamp }

app.post('/send-message', async (req, res) => {
    let clientId = getClientId(req);
    const { chatId, message } = req.body;
    console.log(`[POST /send-message] Request received. Client: ${clientId}, ChatId: ${chatId}, Message: "${(message || '').substring(0, 50).replace(/\n/g, ' ')}..."`);
    if (!chatId || !message) {
        console.warn(`[POST /send-message] Rejected: Missing chatId or message`);
        return res.status(400).json({ error: 'Missing chatId or message' });
    }

    // Failover to active connected client if requested is offline
    const resolvedClientId = getActiveClientId(clientId);
    if (resolvedClientId !== clientId) {
        console.log(`[POST /send-message] Client offline failover: resolved ${clientId} -> ${resolvedClientId}`);
    }

    // Deduplicate identical messages sent within 5 seconds
    const now = Date.now();
    const cacheKey = `${resolvedClientId}_${chatId}`;
    if (lastSentMessages[cacheKey] && 
        lastSentMessages[cacheKey].message === message && 
        (now - lastSentMessages[cacheKey].timestamp) < 5000) {
        console.log(`[POST /send-message] Deduplicated duplicate message to ${chatId}`);
        return res.json({ success: true, duplicated: true, note: 'Message deduplicated' });
    }

    // Update cache
    lastSentMessages[cacheKey] = { message: message, timestamp: now };

    try {
        const response = await sendMessage(resolvedClientId, chatId, message);
        console.log(`[POST /send-message] Message sent successfully via client ${resolvedClientId}`);
        res.json({ success: true, response });
    } catch (error) {
        console.error(`[POST /send-message] Failed to send message via client ${resolvedClientId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/send-media', async (req, res) => {
    let clientId = getClientId(req);
    const { chatId, base64Data, filename, caption } = req.body;
    console.log(`[POST /send-media] Request received. Client: ${clientId}, ChatId: ${chatId}, Filename: ${filename || 'poster.jpg'}`);
    if (!chatId || !base64Data) {
        console.warn(`[POST /send-media] Rejected: Missing chatId or base64Data`);
        return res.status(400).json({ error: 'Missing chatId or base64Data' });
    }

    // Failover to active connected client if requested is offline
    const resolvedClientId = getActiveClientId(clientId);
    if (resolvedClientId !== clientId) {
        console.log(`[POST /send-media] Client offline failover: resolved ${clientId} -> ${resolvedClientId}`);
    }

    try {
        const response = await sendMedia(resolvedClientId, chatId, base64Data, filename || 'poster.jpg', caption || '');
        console.log(`[POST /send-media] Media sent successfully via client ${resolvedClientId}`);
        res.json({ success: true, response });
    } catch (error) {
        console.error(`[POST /send-media] Failed to send media via client ${resolvedClientId}:`, error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/logout', async (req, res) => {
    const clientId = getClientId(req);
    try {
        await logout(clientId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Global WhatsApp Targets Storage by ClientId
let globalWhatsAppTargets = {}; // clientId -> array of targets
try {
    if (fs.existsSync(targetsFilePath)) {
        globalWhatsAppTargets = JSON.parse(fs.readFileSync(targetsFilePath, 'utf8'));
        console.log("Loaded global WhatsApp targets from file");
    }
} catch (e) {
    console.error("Failed to load WhatsApp targets from file:", e);
}

app.get('/whatsapp-targets', (req, res) => {
    const clientId = getClientId(req);
    res.json({ success: true, targets: globalWhatsAppTargets[clientId] || [] });
});

app.post('/whatsapp-targets', (req, res) => {
    const clientId = getClientId(req);
    const { targets } = req.body;
    if (Array.isArray(targets)) {
        globalWhatsAppTargets[clientId] = targets;
        try {
            fs.writeFileSync(targetsFilePath, JSON.stringify(globalWhatsAppTargets, null, 2), 'utf8');
        } catch (e) {
            console.error("Failed to save WhatsApp targets to file:", e);
        }
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid targets array' });
    }
});

// Supabase REST Configurations
const SUPABASE_REST_URL = 'https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/whatsapp';
const SUPABASE_HEADERS = {
    'apikey': 'sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT',
    'Authorization': 'Bearer sb_publishable_Ubv4Ofl0uR9o6ct9PvI1uA_C9hglPNT',
    'Content-Type': 'application/json'
};

function cleanName(str) {
    if (!str) return '';
    const withoutGroup = str.replace(/\s*\(group\)\s*/i, '');
    return withoutGroup.toLowerCase()
                       .replace(/[\uFE00-\uFE0F]/g, '')
                       .replace(/[^\p{L}\p{N}\p{M}]/gu, '')
                       .trim();
}

async function getRoutingFromSupabase(clientId) {
    try {
        const response = await fetch(`${SUPABASE_REST_URL}?select=*`, {
            headers: SUPABASE_HEADERS
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch from Supabase: ${response.statusText}`);
        }
        const dbRows = await response.json();
        
        let chats = [];
        let contacts = [];
        try {
            chats = await getChats(clientId);
        } catch (e) {}
        try {
            contacts = await getContacts(clientId);
        } catch (e) {}
        
        const allItems = [...chats, ...contacts];
        const routing = {};
        
        dbRows.forEach(row => {
            const cleanDbName = cleanName(row.conname);
            if (!cleanDbName) return;
            
            const matchedItem = allItems.find(item => {
                const cleanItemName = cleanName(item.name);
                return cleanItemName === cleanDbName;
            });
            
            if (matchedItem) {
                routing[matchedItem.id] = {
                    name: row.conname,
                    sector: row.label
                };
            } else {
                // Keep the record visible in the UI with a temporary key
                routing[`offline_${row.id}`] = {
                    name: row.conname,
                    sector: row.label
                };
            }
        });
        return routing;
    } catch (err) {
        console.error("Error building routing from Supabase:", err);
        return null;
    }
}

async function syncSupabaseRouting(routing) {
    try {
        // 1. Delete all existing records
        const deleteRes = await fetch(`${SUPABASE_REST_URL}?id=gt.0`, {
            method: 'DELETE',
            headers: SUPABASE_HEADERS
        });
        if (!deleteRes.ok) {
            console.error("Failed to delete existing routing in Supabase:", deleteRes.statusText);
        }

        // 2. Insert new records
        const insertData = Object.values(routing).map(item => ({
            conname: item.name,
            label: item.sector
        }));

        if (insertData.length > 0) {
            const insertRes = await fetch(SUPABASE_REST_URL, {
                method: 'POST',
                headers: SUPABASE_HEADERS,
                body: JSON.stringify(insertData)
            });
            if (!insertRes.ok) {
                console.error("Failed to insert new routing in Supabase:", insertRes.statusText);
            } else {
                console.log(`Successfully synced ${insertData.length} records to Supabase whatsapp table.`);
            }
        }
    } catch (err) {
        console.error("Error syncing routing to Supabase:", err);
    }
}

// Global WhatsApp Sector Routing Storage (shared across all clients)
let globalWhatsAppRouting = {}; // routing object
try {
    if (fs.existsSync(routingFilePath)) {
        globalWhatsAppRouting = JSON.parse(fs.readFileSync(routingFilePath, 'utf8'));
        console.log("Loaded global WhatsApp routing from file:", globalWhatsAppRouting);
    }
} catch (e) {
    console.error("Failed to load WhatsApp routing from file:", e);
}

app.get('/whatsapp-routing', async (req, res) => {
    const clientId = getClientId(req);
    // Try to load from Supabase first
    const routing = await getRoutingFromSupabase(clientId);
    if (routing) {
        // Keep in sync locally
        globalWhatsAppRouting = routing;
        try {
            fs.writeFileSync(routingFilePath, JSON.stringify(routing, null, 2), 'utf8');
        } catch (e) {}
        return res.json({ success: true, routing });
    }
    // Fallback to local
    res.json({ success: true, routing: globalWhatsAppRouting });
});

app.post('/whatsapp-routing', async (req, res) => {
    const { routing } = req.body;
    if (routing && typeof routing === 'object') {
        globalWhatsAppRouting = routing;
        try {
            fs.writeFileSync(routingFilePath, JSON.stringify(routing, null, 2), 'utf8');
            console.log("Saved global WhatsApp routing to file.");
        } catch (e) {
            console.error("Failed to save WhatsApp routing to file:", e);
        }
        // Sync with Supabase
        await syncSupabaseRouting(routing);
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, error: 'Invalid routing object' });
    }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`WhatsApp Integration Backend running on port ${PORT}`);
    initializeWhatsAppForClient('default').catch(err => {
        console.error("Failed to initialize default client on startup:", err);
    });
});
