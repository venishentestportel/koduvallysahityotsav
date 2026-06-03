const BACKEND_URL = (window.parent && window.parent.WA_BACKEND_URL) 
    ? window.parent.WA_BACKEND_URL 
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3001' : 'https://koduvelly-backend.onrender.com');
const clientId = localStorage.getItem('whatsapp_client_id') || 'default';
let socket;
let activeChatId = null;
let chatsData = [];
let myInfo = null;

// DOM Elements
const connectionScreen = document.getElementById('connection-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const qrContainer = document.getElementById('qr-container');
const qrImage = document.getElementById('qr-image');
const connectionTitle = document.getElementById('connection-title');
const connectionSubtitle = document.getElementById('connection-subtitle');
const spinner = document.getElementById('loading-spinner');
const chatList = document.getElementById('chat-list');
const emptyState = document.getElementById('empty-state');
const activeChat = document.getElementById('active-chat');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const statusIndicator = document.querySelector('.status-indicator');
const searchInput = document.getElementById('search-input');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initSocket();
    
    // Add enter key listener for sending messages
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMsg();
        }
    });

    // Add search listener
    searchInput.addEventListener('input', (e) => {
        renderChats(e.target.value);
    });
});

function initSocket() {
    socket = io(BACKEND_URL, {
        reconnectionDelay: 500,       // Start reconnecting after 0.5s instead of 1s
        reconnectionDelayMax: 1500,    // Maximum delay between attempts (1.5s instead of 5s)
        randomizationFactor: 0        // No random backoff skew
    });

    socket.on('connect', () => {
        console.log('Connected to server, joining client room:', clientId);
        socket.emit('join_client', clientId);
        statusIndicator.className = 'status-indicator online';
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        statusIndicator.className = 'status-indicator offline';
    });

    socket.on('status_update', (status) => {
        handleStatus(status);
    });

    socket.on('qr', (qrDataUrl) => {
        handleStatus({ state: 'QR_READY', qr: qrDataUrl });
    });

    socket.on('ready', (info) => {
        myInfo = info;
        handleStatus({ state: 'CONNECTED' });
        loadChats();
    });

    socket.on('message', (msg) => {
        handleNewMessage(msg);
    });

    // Initial check
    fetch(`${BACKEND_URL}/status?clientId=${clientId}`)
        .then(res => res.json())
        .then(status => {
            handleStatus(status);
            if (status.state === 'CONNECTED' || status.state === 'AUTHENTICATED') {
                loadChats();
            }
        })
        .catch(err => console.error('Failed to get status:', err));
}

function handleStatus(status) {
    switch (status.state) {
        case 'INITIALIZING':
            showConnectionScreen('Connecting...', 'Initializing WhatsApp client', true);
            break;
        case 'QR_READY':
            showConnectionScreen('Scan QR Code', 'Open WhatsApp on your phone to link device', false);
            qrContainer.classList.remove('hidden');
            if (status.qr) qrImage.src = status.qr;
            break;
        case 'AUTHENTICATED':
            showConnectionScreen('Authenticated', 'Loading your chats...', true);
            qrContainer.classList.add('hidden');
            break;
        case 'CONNECTED':
            showDashboard();
            break;
        case 'DISCONNECTED':
            showConnectionScreen('Disconnected', 'Connection lost or logged out', true);
            qrContainer.classList.add('hidden');
            break;
        case 'AUTH_FAILURE':
            showConnectionScreen('Authentication Failed', 'Please try logging in again', false);
            break;
    }
}

function showConnectionScreen(title, subtitle, showSpinner) {
    connectionScreen.classList.remove('hidden');
    dashboardScreen.classList.add('hidden');
    connectionTitle.innerText = title;
    connectionSubtitle.innerText = subtitle;
    
    if (showSpinner) {
        spinner.classList.remove('hidden');
    } else {
        spinner.classList.add('hidden');
    }
}

function showDashboard() {
    connectionScreen.classList.add('hidden');
    dashboardScreen.classList.remove('hidden');
}

async function loadChats() {
    try {
        // Fetch chats first and render immediately
        fetch(`${BACKEND_URL}/chats?clientId=${clientId}`).then(async res => {
            const chatsDataRes = await res.json();
            if (chatsDataRes.success) {
                // Keep any existing contacts that might have loaded, though unlikely
                const existingContacts = chatsData.filter(c => c.timestamp === 0);
                chatsData = [...chatsDataRes.chats, ...existingContacts].sort((a, b) => b.timestamp - a.timestamp);
                renderChats();
            }
        }).catch(err => console.error('Chats fetch error:', err));

        // Fetch contacts in the background (can take several minutes)
        fetch(`${BACKEND_URL}/contacts?clientId=${clientId}`).then(async res => {
            const contactsDataRes = await res.json();
            if (contactsDataRes.success) {
                const chatIds = new Set(chatsData.map(c => c.id));
                const newContacts = [];
                contactsDataRes.contacts.forEach(contact => {
                    if (!chatIds.has(contact.id)) {
                        newContacts.push(contact);
                    }
                });
                chatsData = [...chatsData, ...newContacts].sort((a, b) => b.timestamp - a.timestamp);
                renderChats(document.getElementById('search-input') ? document.getElementById('search-input').value : '');
            }
        }).catch(err => console.error('Contacts fetch error:', err));
        
    } catch (err) {
        console.error('Failed to initiate load:', err);
    }
}

function renderChats(filter = '') {
    chatList.innerHTML = '';
    
    const filteredChats = chatsData.filter(chat => 
        chat.name.toLowerCase().includes(filter.toLowerCase())
    );

    if (filteredChats.length === 0) {
        chatList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No chats found</div>';
        return;
    }

    filteredChats.forEach(chat => {
        const time = chat.timestamp > 0 ? new Date(chat.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        
        const chatEl = document.createElement('div');
        chatEl.className = `chat-item ${activeChatId === chat.id ? 'active' : ''}`;
        chatEl.onclick = () => openChat(chat);
        
        chatEl.innerHTML = `
            <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random" class="avatar" alt="Avatar">
            <div class="chat-item-info">
                <div class="chat-item-header">
                    <span class="chat-name">${chat.name}</span>
                    <span class="chat-time">${time}</span>
                </div>
                <div class="chat-preview" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis;">${chat.isGroup ? 'Group' : 'Contact'}</span>
                    ${chat.unreadCount > 0 ? `<span class="unread-badge">${chat.unreadCount}</span>` : ''}
                </div>
            </div>
        `;
        chatList.appendChild(chatEl);
    });
}

function openChat(chat) {
    activeChatId = chat.id;
    renderChats(searchInput.value); // Re-render to show active state
    
    emptyState.classList.add('hidden');
    activeChat.classList.remove('hidden');
    
    document.getElementById('active-chat-name').innerText = chat.name;
    document.getElementById('active-chat-avatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.name)}&background=random`;
    
    // Clear messages for now (in a real app, fetch history)
    messagesContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-secondary);">Message history not available in this demo.</div>';
    
    // Reset unread count
    const chatIndex = chatsData.findIndex(c => c.id === chat.id);
    if (chatIndex !== -1) {
        chatsData[chatIndex].unreadCount = 0;
        renderChats(searchInput.value);
    }
}

function handleNewMessage(msg) {
    // Update chat list
    const chatId = msg.isGroup ? msg.to : (msg.fromMe ? msg.to : msg.from);
    const existingChatIndex = chatsData.findIndex(c => c.id === chatId);
    
    if (existingChatIndex !== -1) {
        const chat = chatsData[existingChatIndex];
        chat.timestamp = msg.timestamp;
        if (activeChatId !== chatId && !msg.fromMe) {
            chat.unreadCount = (chat.unreadCount || 0) + 1;
        }
        // Move to top
        chatsData.splice(existingChatIndex, 1);
        chatsData.unshift(chat);
    } else {
        // New chat
        chatsData.unshift({
            id: chatId,
            name: chatId.split('@')[0],
            unreadCount: msg.fromMe ? 0 : 1,
            isGroup: msg.isGroup,
            timestamp: msg.timestamp
        });
    }
    
    renderChats(searchInput.value);

    // Add to active chat if open
    if (activeChatId === chatId) {
        appendMessage(msg);
    }
}

function appendMessage(msg) {
    // Remove default empty state message if it's the first message
    if (messagesContainer.querySelector('div[style*="text-align:center"]')) {
        messagesContainer.innerHTML = '';
    }

    const time = new Date(msg.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isOutgoing = msg.fromMe;
    
    const msgEl = document.createElement('div');
    msgEl.className = `message ${isOutgoing ? 'outgoing' : 'incoming'}`;
    
    let senderHtml = '';
    if (!isOutgoing && msg.isGroup) {
        senderHtml = `<div style="font-size: 0.75rem; color: #718096; margin-bottom: 2px; font-weight: bold;">${(msg.author || msg.from).split('@')[0]}</div>`;
    }

    msgEl.innerHTML = `
        ${senderHtml}
        <div>${msg.body}</div>
        <div class="message-time">${time}</div>
    `;
    
    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendMsg() {
    const text = messageInput.value.trim();
    if (!text || !activeChatId) return;
    
    messageInput.value = '';
    
    // Optimistic UI update
    const tempMsg = {
        id: 'temp_' + Date.now(),
        from: 'me',
        to: activeChatId,
        body: text,
        timestamp: Math.floor(Date.now() / 1000),
        fromMe: true,
        isGroup: activeChatId.includes('@g.us')
    };
    
    appendMessage(tempMsg);
    
    try {
        const res = await fetch(`${BACKEND_URL}/send-message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: clientId, chatId: activeChatId, message: text })
        });
        const data = await res.json();
        if (!data.success) {
            alert('Failed to send message');
        }
    } catch (err) {
        console.error('Send error:', err);
        alert('Failed to send message');
    }
}

async function logout() {
    if (confirm('Are you sure you want to logout from WhatsApp?')) {
        try {
            await fetch(`${BACKEND_URL}/logout?clientId=${clientId}`, { method: 'POST' });
        } catch (err) {
            console.error('Logout error:', err);
        }
    }
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
}
