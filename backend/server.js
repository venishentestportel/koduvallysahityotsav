require('dotenv').config();

// ── Global crash guards ─────────────────────────────────────────────────────
// Prevent a single LocalAuth EBUSY / Puppeteer error from killing the server
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException] Non-fatal error caught, server continuing:', err.message);
});
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection] Non-fatal rejection caught, server continuing:', reason);
});
// ────────────────────────────────────────────────────────────────────────────

const express = require('express');
const http = require('http');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { initSockets } = require('./sockets');
const { initializeWhatsAppForClient, clients, getChats, getContacts, sendMessage, sendMedia, logout } = require('./whatsapp');

const targetsFilePath = path.join(__dirname, 'whatsapp-targets.json');
const routingFilePath = path.join(__dirname, 'whatsapp-routing.json');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..')));

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

// ── Sahityotsav Scraping System ──────────────────────────────────────────────
let scrapedCache = null;
let lastScrapedTime = 0;
let isScraping = false;

async function scrapeResults() {
    if (isScraping) {
        console.log("[Scraper] Scrape already in progress, skipping duplicate call.");
        return scrapedCache;
    }
    isScraping = true;
    let browser;
    try {
        console.log("[Scraper] Launching Puppeteer browser...");
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        let apiData = null;
        page.on('response', async response => {
            const url = response.url();
            const status = response.status();
            const method = response.request().method();
            
            if (response.request().resourceType() === 'xhr' || response.request().resourceType() === 'fetch' || url.includes('api')) {
                console.log(`[Scraper Network] ${method} ${url} -> Status: ${status}`);
            }

            if (url.includes('/api/results')) {
                try {
                    const text = await response.text();
                    console.log(`[Scraper Intercept] Found results API response (length ${text.length})`);
                    const json = JSON.parse(text);
                    if (json && json.success) {
                        apiData = json;
                    } else {
                        console.log(`[Scraper Intercept] JSON success is false or invalid:`, text.substring(0, 200));
                    }
                } catch(e) {
                    console.log(`[Scraper Intercept] Failed to parse or read response body:`, e.message);
                }
            }
        });

        console.log("[Scraper] Navigating to sahityotsav.com results page...");
        await page.goto('https://sahityotsav.com/app/results?page=1&limit=20', {
            waitUntil: 'networkidle2',
            timeout: 25000
        });

        // Wait up to 3 seconds for XHR interception if not caught already
        let retries = 0;
        while (!apiData && retries < 6) {
            await new Promise(resolve => setTimeout(resolve, 500));
            retries++;
        }

        if (apiData) {
            scrapedCache = apiData;
            lastScrapedTime = Date.now();
            console.log(`[Scraper] Scraped ${apiData.results ? apiData.results.length : 0} results successfully at ${new Date(lastScrapedTime).toLocaleTimeString()}`);
        } else {
            console.warn("[Scraper] Page loaded but results API response was not captured.");
        }
    } catch (err) {
        console.error("[Scraper] Error scraping results:", err.message);
    } finally {
        if (browser) {
            try {
                await browser.close();
            } catch(e) {}
        }
        isScraping = false;
    }
    return scrapedCache;
}
// ────────────────────────────────────────────────────────────────────────────

// API Routes
app.get('/api/scraped-results', async (req, res) => {
    try {
        if (!scrapedCache) {
            console.log("[API] No cache found. Triggering synchronous scrape...");
            await scrapeResults();
        }
        res.json({ success: !!scrapedCache, data: scrapedCache });
    } catch(err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
    const requestedClientId = getClientId(req);
    const clientId = getActiveClientId(requestedClientId);
    if (requestedClientId !== clientId) {
        console.log(`[GET /whatsapp-targets] Client failover: resolved ${requestedClientId} -> ${clientId}`);
    }
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
    const requestedClientId = getClientId(req);
    const clientId = getActiveClientId(requestedClientId);
    if (requestedClientId !== clientId) {
        console.log(`[GET /whatsapp-routing] Client failover: resolved ${requestedClientId} -> ${clientId}`);
    }
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

app.post('/send-sector-notification', async (req, res) => {
    let clientId = getClientId(req);
    const { studentName, sector, regularProgsText, generalProgsText, stage } = req.body;
    console.log(`[POST /send-sector-notification] Request received. Client: ${clientId}, Student: ${studentName}, Sector: ${sector}, Stage: ${stage}`);
    
    if (!studentName || !sector) {
        console.warn(`[POST /send-sector-notification] Rejected: Missing studentName or sector`);
        return res.status(400).json({ error: 'Missing studentName or sector' });
    }

    // Failover to active connected client if requested is offline
    const resolvedClientId = getActiveClientId(clientId);
    if (resolvedClientId !== clientId) {
        console.log(`[POST /send-sector-notification] Client failover: resolved ${clientId} -> ${resolvedClientId}`);
    }

    // Use cached routing mapping (extremely fast, no Supabase/WhatsApp API fetches needed during send)
    let routing = globalWhatsAppRouting;
    
    // Fallback in case routing is not initialized in memory yet
    if (!routing || Object.keys(routing).length === 0) {
        try {
            if (fs.existsSync(routingFilePath)) {
                globalWhatsAppRouting = JSON.parse(fs.readFileSync(routingFilePath, 'utf8'));
                routing = globalWhatsAppRouting;
            }
        } catch (e) {
            console.error("Failed to load routing from file fallback:", e.message);
        }
    }

    let message = `*Student Registration Alert*\n*Student Name:* ${studentName}\n*Sector Name:* ${sector}\n*Registration Stage:* ${stage || 'N/A'}`;
    if (regularProgsText && regularProgsText !== 'None' && regularProgsText !== '') {
        message += `\n*Registered Program:* ${regularProgsText}`;
    }
    if (generalProgsText && generalProgsText !== 'None' && generalProgsText !== '') {
        message += `\n*General Program:* ${generalProgsText}`;
    }

    const cleanSectorName = (str) => {
        if (!str) return '';
        return str.replace(/\s*\(group\)\s*/i, '')
                  .toLowerCase()
                  .replace(/[\p{P}\p{Z}\p{S}\?]/gu, '')
                  .trim();
    };

    const cleanStudentSector = cleanSectorName(sector);
    let sentCount = 0;
    let totalTargets = 0;
    let errors = [];

    const sendPromises = Object.keys(routing).map(async (chatId) => {
        if (chatId.startsWith('offline_')) return;
        let targetSector = (routing[chatId].sector || '').trim();
        if (!targetSector) {
            targetSector = (routing[chatId].name || '').trim();
        }
        
        const cleanTargetSector = cleanSectorName(targetSector);
        if (cleanTargetSector && cleanTargetSector === cleanStudentSector) {
            totalTargets++;
            try {
                await sendMessage(resolvedClientId, chatId, message);
                console.log(`[POST /send-sector-notification] Notification sent successfully to ${chatId} (${routing[chatId].name}) for ${studentName}`);
                sentCount++;
            } catch (err) {
                console.error(`[POST /send-sector-notification] Failed to send to ${chatId}:`, err.message);
                errors.push(err.message);
            }
        }
    });

    await Promise.all(sendPromises);

    if (totalTargets === 0) {
        console.log(`[POST /send-sector-notification] No targets matched for sector "${sector}"`);
        return res.json({ success: false, reason: `No mapped WhatsApp target found for sector "${sector}"` });
    }
    if (sentCount > 0) {
        return res.json({ success: true, sentCount, totalTargets });
    }
    return res.status(500).json({ success: false, error: errors.join(', ') || 'Failed to send' });
});

// ── Supabase Background Polling for Registrations and Stages ─────────────────
let lastRegistMaxId = 0;
let lastStageMaxIds = {};
let isPollingActive = false;

async function startSupabasePolling() {
    console.log("[Supabase Poller] Initializing max IDs from database...");
    
    // 1. Get max ID for regist table
    try {
        const res = await fetch('https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/regist?select=id&order=id.desc&limit=1', {
            headers: {
                'apikey': SUPABASE_HEADERS.apikey,
                'Authorization': SUPABASE_HEADERS.Authorization
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                lastRegistMaxId = data[0].id;
                console.log(`[Supabase Poller] Initialized regist max ID to: ${lastRegistMaxId}`);
            }
        }
    } catch (err) {
        console.error("[Supabase Poller] Failed to initialize regist max ID:", err.message);
    }

    // 2. Get max ID for stages 1-8
    const stages = ['stage 1', 'stage 2', 'stage 3', 'stage 4', 'stage 5', 'stage 6', 'stage 7', 'stage 8'];
    for (const stage of stages) {
        try {
            const res = await fetch(`https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/${encodeURIComponent(stage)}?select=id&order=id.desc&limit=1`, {
                headers: {
                    'apikey': SUPABASE_HEADERS.apikey,
                    'Authorization': SUPABASE_HEADERS.Authorization
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    lastStageMaxIds[stage] = data[0].id;
                    console.log(`[Supabase Poller] Initialized ${stage} max ID to: ${lastStageMaxIds[stage]}`);
                } else {
                    lastStageMaxIds[stage] = 0;
                }
            } else {
                lastStageMaxIds[stage] = 0;
            }
        } catch (err) {
            console.error(`[Supabase Poller] Failed to initialize ${stage} max ID:`, err.message);
            lastStageMaxIds[stage] = 0;
        }
    }

    isPollingActive = true;
    // Poll every 3 seconds
    setInterval(pollSupabaseData, 3000);
}

async function pollSupabaseData() {
    if (!isPollingActive) return;

    // 1. Poll new registrations
    try {
        const res = await fetch(`https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/regist?select=*&id=gt.${lastRegistMaxId}&order=id.asc`, {
            headers: {
                'apikey': SUPABASE_HEADERS.apikey,
                'Authorization': SUPABASE_HEADERS.Authorization
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                console.log(`[Supabase Poller] Found ${data.length} new registrations.`);
                lastRegistMaxId = data[data.length - 1].id;
                for (const row of data) {
                    await handleNewRegistNotification(row);
                }
            }
        }
    } catch (err) {
        console.error("[Supabase Poller] Error polling registrations:", err.message);
    }

    // 2. Poll new stage updates
    const stages = ['stage 1', 'stage 2', 'stage 3', 'stage 4', 'stage 5', 'stage 6', 'stage 7', 'stage 8'];
    for (const stage of stages) {
        const lastId = lastStageMaxIds[stage] || 0;
        try {
            const res = await fetch(`https://lxbvadjjboavxwidxsnl.supabase.co/rest/v1/${encodeURIComponent(stage)}?select=*&id=gt.${lastId}&order=id.asc`, {
                headers: {
                    'apikey': SUPABASE_HEADERS.apikey,
                    'Authorization': SUPABASE_HEADERS.Authorization
                }
            });
            if (res.ok) {
                const data = await res.json();
                if (data && data.length > 0) {
                    console.log(`[Supabase Poller] Found ${data.length} new updates for ${stage}.`);
                    lastStageMaxIds[stage] = data[data.length - 1].id;
                    for (const row of data) {
                        await handleNewStageNotification(stage, row);
                    }
                }
            }
        } catch (err) {
            console.error(`[Supabase Poller] Error polling ${stage}:`, err.message);
        }
    }
}

async function handleNewRegistNotification(row) {
    try {
        const name = row.name || 'Unknown';
        const sector = row.sector || 'Unknown';
        const program = row.program || '';
        const general = row.general || '';
        const stage = row.stage || 'Unknown';
        const codeletter = row.codeletter || '';

        // Get the active client
        const activeClient = getActiveClientId('default');
        
        // Collect checked targets from globalWhatsAppTargets
        const targetIds = new Set();
        Object.keys(globalWhatsAppTargets).forEach(cid => {
            const targets = globalWhatsAppTargets[cid];
            if (Array.isArray(targets)) {
                targets.forEach(t => targetIds.add(t));
            }
        });

        // 1. Dispatch alert to selected WhatsApp groups / contacts
        if (targetIds.size > 0) {
            const progsStr = [program, general].filter(Boolean).join(', ');
            const message = `*Student Registered*\nName: ${name}\nSector: ${sector}\nPrograms: ${progsStr}\nStage: ${stage}${codeletter ? `\nCode Letter: ${codeletter}` : ''}`;
            console.log(`[Supabase Poller] Dispatching registration alert for ${name} to targets:`, Array.from(targetIds));
            for (const chatId of targetIds) {
                try {
                    await sendMessage(activeClient, chatId, message);
                } catch (err) {
                    console.error(`[Supabase Poller] Failed to send registration alert to ${chatId}:`, err.message);
                }
            }
        }

        // 2. Dispatch alert to matched sector group
        const cleanSectorName = (str) => {
            if (!str) return '';
            return str.replace(/\s*\(group\)\s*/i, '')
                      .toLowerCase()
                      .replace(/[\p{P}\p{Z}\p{S}\?]/gu, '')
                      .trim();
        };

        const cleanStudentSector = cleanSectorName(sector);
        if (cleanStudentSector) {
            const routing = globalWhatsAppRouting;
            for (const chatId of Object.keys(routing)) {
                if (chatId.startsWith('offline_')) continue;
                let targetSector = (routing[chatId].sector || '').trim();
                if (!targetSector) {
                    targetSector = (routing[chatId].name || '').trim();
                }
                
                const cleanTargetSector = cleanSectorName(targetSector);
                if (cleanTargetSector && cleanTargetSector === cleanStudentSector) {
                    const sectorMessage = `*Student Registration Alert*\n*Student Name:* ${name}\n*Sector Name:* ${sector}\n*Registration Stage:* ${stage}\n${program ? `*Registered Program:* ${program}` : ''}${general ? `*General Program:* ${general}` : ''}`;
                    try {
                        console.log(`[Supabase Poller] Dispatching sector registration alert for ${name} to sector group ${chatId} (${routing[chatId].name})`);
                        await sendMessage(activeClient, chatId, sectorMessage);
                    } catch (err) {
                        console.error(`[Supabase Poller] Failed to send sector registration alert to ${chatId}:`, err.message);
                    }
                }
            }
        }
    } catch (e) {
        console.error("[Supabase Poller] Error handling registration notification:", e.message);
    }
}

async function handleNewStageNotification(stageName, row) {
    try {
        const situation = row.situation;
        if (!situation) return;

        // Skip check-in logs, only notify situation triggers
        if (situation === 'Check-in') return;

        const category = row.Categories || 'None';
        const program = row.Programs || 'None';

        const activeClient = getActiveClientId('default');
        const targetIds = new Set();
        Object.keys(globalWhatsAppTargets).forEach(cid => {
            const targets = globalWhatsAppTargets[cid];
            if (Array.isArray(targets)) {
                targets.forEach(t => targetIds.add(t));
            }
        });

        if (targetIds.size > 0) {
            const message = `${stageName.toUpperCase()}\nCategorie : ${category}\nProgram : ${program}\naction : ${situation}`;
            console.log(`[Supabase Poller] Dispatching stage alert (${situation}) for ${stageName} to targets:`, Array.from(targetIds));
            for (const chatId of targetIds) {
                try {
                    await sendMessage(activeClient, chatId, message);
                } catch (err) {
                    console.error(`[Supabase Poller] Failed to send stage alert to ${chatId}:`, err.message);
                }
            }
        }
    } catch (e) {
        console.error("[Supabase Poller] Error handling stage notification:", e.message);
    }
}


const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`WhatsApp Integration Backend running on port ${PORT}`);
    initializeWhatsAppForClient('default').catch(err => {
        console.error("Failed to initialize default client on startup:", err);
    });

    // Start initial scrape and background scraper interval (every 30 seconds)
    console.log("[Server] Starting background sahityotsav results scraper...");
    setTimeout(() => {
        scrapeResults().catch(err => console.error("[Initial Scraper Error]:", err.message));
    }, 3000);

    setInterval(() => {
        scrapeResults().catch(err => console.error("[Interval Scraper Error]:", err.message));
    }, 30000);

    // Start background Supabase polling
    setTimeout(() => {
        startSupabasePolling().catch(err => console.error("[Supabase Poller Start Error]:", err.message));
    }, 5000);
});

