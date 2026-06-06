const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const { getIo } = require('./sockets');

// Multi-client storage map
const clients = {};
const reconnectAttemptsMap = {};
let socketListenerInitialized = false;

async function initializeWhatsAppForClient(clientId) {
    if (!clientId) clientId = 'default';
    
    if (clients[clientId]) {
        console.log(`Cleaning up existing WhatsApp client for ${clientId}...`);
        try {
            clients[clientId].client.removeAllListeners();
            if (clients[clientId].client.pupBrowser) {
                try {
                    const proc = clients[clientId].client.pupBrowser.process();
                    if (proc) {
                        console.log(`Forcefully killing browser process ${proc.pid} for client ${clientId}...`);
                        proc.kill('SIGKILL');
                    }
                } catch (procErr) {
                    console.error(`Error killing browser process for client ${clientId}:`, procErr);
                }
            }
            // Force-delete the lockfile BEFORE calling destroy() to prevent EBUSY crash
            const path = require('path');
            const fs = require('fs');
            const lockfilePath = path.join(__dirname, 'whatsapp-session', `session-${clientId}`, 'lockfile');
            try {
                if (fs.existsSync(lockfilePath)) {
                    fs.unlinkSync(lockfilePath);
                    console.log(`Deleted lockfile for client ${clientId}`);
                }
            } catch (lfErr) {
                console.warn(`Could not delete lockfile for ${clientId}:`, lfErr.message);
            }
            await clients[clientId].client.destroy();
            console.log(`Client ${clientId} destroyed successfully.`);
        } catch (err) {
            console.error(`Error destroying client ${clientId}:`, err);
        }
        delete clients[clientId];
    }
    
    const clientStatus = {
        state: 'INITIALIZING',
        qr: null,
        info: null
    };
    
    function updateStatus(newState, qr = null, info = null) {
        clientStatus.state = newState;
        if (qr !== undefined) clientStatus.qr = qr;
        if (info !== undefined) clientStatus.info = info;
        
        const io = getIo();
        if (io) {
            io.to(clientId).emit('status_update', clientStatus);
        }
    }
    
    const clientAuth = new LocalAuth({
        clientId: clientId,
        dataPath: './whatsapp-session'
    });
    
    const clientInstance = new Client({
        authStrategy: clientAuth,
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/{version}.html',
            strict: false
        },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        puppeteer: {
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined),
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-net-info-api',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-update',
                '--disable-features=Translate',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--metrics-recording-only',
                '--no-default-browser-check',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-translate'
            ]
        }
    });
    
    let isReconnecting = false;
    let reconnectTimeout = null;
    
    function triggerReconnect() {
        if (isReconnecting) return;
        isReconnecting = true;
        
        if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
        }
        
        reconnectAttemptsMap[clientId] = (reconnectAttemptsMap[clientId] || 0) + 1;
        const attempts = reconnectAttemptsMap[clientId];
        const delay = Math.min(2000 * Math.pow(1.5, attempts - 1), 30000);
        
        console.log(`Attempting to reconnect client ${clientId} (attempt ${attempts}) in ${delay}ms...`);
        reconnectTimeout = setTimeout(async () => {
            try {
                await initializeWhatsAppForClient(clientId);
            } catch (err) {
                console.error(`Failed to reconnect client ${clientId}:`, err);
                isReconnecting = false;
                triggerReconnect();
            }
        }, delay);
    }
    
    clientInstance.on('qr', async (qr) => {
        console.log(`QR Code Received for client ${clientId}`);
        try {
            const qrDataUrl = await qrcode.toDataURL(qr);
            updateStatus('QR_READY', qrDataUrl, null);
        } catch (err) {
            console.error(`Failed to generate QR code for ${clientId}`, err);
        }
    });
    
    clientInstance.on('ready', async () => {
        console.log(`WhatsApp Client ${clientId} is Ready!`);
        isReconnecting = false;
        reconnectAttemptsMap[clientId] = 0; // Reset reconnect attempts on success
        updateStatus('CONNECTED', null, clientInstance.info);
        
        // Warm up cache in background
        try {
            console.log(`Warming up chats and contacts cache for client ${clientId}...`);
            await getChats(clientId, true);
            await getContacts(clientId, true);
            console.log(`Cache warmed up successfully for client ${clientId}`);
        } catch (cacheErr) {
            console.warn(`Failed to warm up cache for client ${clientId}:`, cacheErr.message);
        }
    });
    
    clientInstance.on('authenticated', () => {
        console.log(`WhatsApp Client ${clientId} Authenticated`);
        updateStatus('AUTHENTICATED');
    });
    
    clientInstance.on('auth_failure', (msg) => {
        console.error(`WhatsApp Client ${clientId} Authentication Failure:`, msg);
        updateStatus('AUTH_FAILURE');
    });
    
    clientInstance.on('disconnected', async (reason) => {
        console.log(`WhatsApp Client ${clientId} Disconnected:`, reason);
        updateStatus('DISCONNECTED', null, null);
        triggerReconnect();
    });
    
    clientInstance.on('message', async (msg) => {
        const ioConnection = getIo();
        if (ioConnection) {
            let isGroup = false;
            try {
                const chat = await msg.getChat();
                isGroup = chat.isGroup;
            } catch (e) {
                console.error(e);
            }
            ioConnection.to(clientId).emit('message', {
                id: msg.id._serialized,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                timestamp: msg.timestamp,
                author: msg.author,
                isGroup: isGroup,
                fromMe: msg.fromMe
            });
        }
    });
    
    clients[clientId] = {
        client: clientInstance,
        status: clientStatus,
        isReconnecting,
        reconnectTimeout,
        triggerReconnect,
        updateStatus
    };
    
    // Set up Socket.IO connection event listener only once
    const io = getIo();
    if (io && !socketListenerInitialized) {
        socketListenerInitialized = true;
        io.on('connection', (socket) => {
            socket.on('join_client', (roomClientId) => {
                if (!roomClientId) roomClientId = 'default';
                socket.join(roomClientId);
                console.log(`Socket ${socket.id} joined room: ${roomClientId}`);
                
                if (clients[roomClientId]) {
                    socket.emit('status_update', clients[roomClientId].status);
                } else {
                    socket.emit('status_update', { state: 'UNINITIALIZED', qr: null, info: null });
                }
            });
        });
    }
    
    try {
        await clientInstance.initialize();
    } catch (err) {
        console.error(`Error during client ${clientId} initialization:`, err);
        try {
            if (clientInstance.pupBrowser) {
                const proc = clientInstance.pupBrowser.process();
                if (proc) {
                    console.log(`Forcefully killing browser process ${proc.pid} after failed init for client ${clientId}...`);
                    proc.kill('SIGKILL');
                }
            }
            await clientInstance.destroy();
        } catch (destroyErr) {
            console.error(`Error destroying client ${clientId} after failed init:`, destroyErr);
        }
        triggerReconnect();
    }
}

function handleClientError(clientId, err) {
    console.error(`Error encountered for client ${clientId}:`, err);
    const msg = err.message || '';
    if (msg.includes('Session closed') || msg.includes('target closed') || msg.includes('Browser sent no response') || msg.includes('Navigation failed') || msg.includes('detached Frame')) {
        console.warn(`Puppeteer crash or detached frame detected for client ${clientId}. Triggering re-initialization...`);
        const clientObj = clients[clientId];
        if (clientObj && typeof clientObj.triggerReconnect === 'function') {
            clientObj.triggerReconnect();
        }
    }
}

async function getChats(clientId, forceRefresh = false) {
    if (!clientId) clientId = 'default';
    const clientObj = clients[clientId];
    if (!clientObj || !clientObj.client) {
        throw new Error('Client not initialized');
    }
    
    const now = Date.now();
    if (!forceRefresh && clientObj.chatsCache && (now - clientObj.chatsCacheTime < 120000)) {
        return clientObj.chatsCache;
    }

    if (clientObj.status.state !== 'CONNECTED') {
        if (clientObj.chatsCache) {
            return clientObj.chatsCache;
        }
        throw new Error('Client not connected');
    }

    try {
        const chats = await clientObj.client.getChats();
        const mappedChats = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name || chat.id.user || 'Unknown',
            unreadCount: chat.unreadCount,
            isGroup: chat.isGroup,
            timestamp: chat.timestamp
        }));
        
        clientObj.chatsCache = mappedChats;
        clientObj.chatsCacheTime = now;
        return mappedChats;
    } catch (err) {
        handleClientError(clientId, err);
        if (clientObj.chatsCache) {
            console.warn(`Error fetching chats, returning cached data for client ${clientId}`);
            return clientObj.chatsCache;
        }
        throw err;
    }
}

async function getContacts(clientId, forceRefresh = false) {
    if (!clientId) clientId = 'default';
    const clientObj = clients[clientId];
    if (!clientObj || !clientObj.client) {
        throw new Error('Client not initialized');
    }

    const now = Date.now();
    if (!forceRefresh && clientObj.contactsCache && (now - clientObj.contactsCacheTime < 120000)) {
        return clientObj.contactsCache;
    }

    if (clientObj.status.state !== 'CONNECTED') {
        if (clientObj.contactsCache) {
            return clientObj.contactsCache;
        }
        throw new Error('Client not connected');
    }

    try {
        const contacts = await clientObj.client.getContacts();
        const mappedContacts = contacts.map(contact => ({
            id: contact.id._serialized,
            name: contact.name || contact.pushname || contact.number || 'Unknown',
            isGroup: contact.isGroup,
            timestamp: 0
        })).filter(c => c.name !== 'Unknown');

        clientObj.contactsCache = mappedContacts;
        clientObj.contactsCacheTime = now;
        return mappedContacts;
    } catch (err) {
        handleClientError(clientId, err);
        if (clientObj.contactsCache) {
            console.warn(`Error fetching contacts, returning cached data for client ${clientId}`);
            return clientObj.contactsCache;
        }
        throw err;
    }
}

async function sendMessage(clientId, chatId, message) {
    if (!clientId) clientId = 'default';
    const clientObj = clients[clientId];
    if (!clientObj || !clientObj.client || clientObj.status.state !== 'CONNECTED') {
        throw new Error('Client not connected');
    }
    try {
        const response = await clientObj.client.sendMessage(chatId, message);
        return response;
    } catch (err) {
        handleClientError(clientId, err);
        throw err;
    }
}

async function sendMedia(clientId, chatId, base64Data, filename, caption = '') {
    if (!clientId) clientId = 'default';
    const clientObj = clients[clientId];
    if (!clientObj || !clientObj.client || clientObj.status.state !== 'CONNECTED') {
        throw new Error('Client not connected');
    }
    try {
        let mimeType = 'image/jpeg';
        let cleanBase64 = base64Data;
        if (base64Data.startsWith('data:')) {
            const parts = base64Data.split(';base64,');
            mimeType = parts[0].split(':')[1];
            cleanBase64 = parts[1];
        }
        const media = new MessageMedia(mimeType, cleanBase64, filename);
        const response = await clientObj.client.sendMessage(chatId, media, { caption });
        return response;
    } catch (err) {
        handleClientError(clientId, err);
        throw err;
    }
}

async function logout(clientId) {
    if (!clientId) clientId = 'default';
    const clientObj = clients[clientId];
    if (clientObj && clientObj.client) {
        try {
            await clientObj.client.logout();
        } catch (err) {
            console.error(`Error during logout for ${clientId}:`, err);
            await initializeWhatsAppForClient(clientId);
        }
    }
}

module.exports = {
    initializeWhatsAppForClient,
    clients,
    getChats,
    getContacts,
    sendMessage,
    sendMedia,
    logout
};
