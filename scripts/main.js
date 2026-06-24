/**
 * Xcord P2P - Main Application Logic
 */


const APP_STATE = {
    initialized: false,
    p2pReady: false,
    username: null,
    myClientId: null,
    contacts: [],
    currentChat: null,
    messages: [],
    reconnecting: false
};

async function initXcord() {
    try {
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
        
        const username = prompt('Введите ваше имя пользователя:', 'user_' + Math.random().toString(36).substr(2, 6));
        if (!username) {
            throw new Error('Имя пользователя не введено');
        }
        APP_STATE.username = username;
        
        await connectP2P(username);
        
        setupUI();
        
        APP_STATE.initialized = true;
        
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Ошибка инициализации: ' + error.message);
    }
}

async function connectP2P(username) {
    try {
        await xcordP2P.connect(username);
        
        APP_STATE.p2pReady = true;
        APP_STATE.myClientId = xcordP2P.getClientId();
        
        xcordP2P.onMessageReceived = (msg) => {
            handleIncomingMessage(msg);
        };
        
        updateConnectionUI(true, username);
        
    } catch (error) {
        console.error('P2P connection failed:', error);
        APP_STATE.p2pReady = false;
        showError('Не удалось подключиться к P2P сети');
        throw error;
    }
}

function updateConnectionUI(connected, username) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        statusElement.textContent = connected 
            ? `Подключено как ${username}` 
            : 'Отключено';
        statusElement.className = connected ? 'status-online' : 'status-offline';
    }
}

function handleIncomingMessage(msg) {
    APP_STATE.messages.push(msg);
    
    renderMessages();
    
    if (typeof updateChatList === 'function') {
        updateChatList();
    }
    
    showNotification(`Сообщение от ${msg.sender}`);
}

async function loadContacts() {
    try {
        const result = await xcordP2P.getPeers();
        APP_STATE.contacts = result.peers || [];
        renderContacts();
    } catch (error) {
        console.error('Failed to load contacts:', error);
    }
}

function renderContacts() {
    const contactsList = document.getElementById('contacts-list');
    if (!contactsList) return;
    
    contactsList.innerHTML = '';
    
    APP_STATE.contacts.forEach(contact => {
        const contactEl = document.createElement('div');
        contactEl.className = 'contact-item';
        contactEl.innerHTML = `
            <div class="contact-avatar">
                <i data-lucide="user"></i>
            </div>
            <div class="contact-info">
                <div class="contact-name">${contact.username}</div>
                <div class="contact-hash">ID: ${contact.client_id}</div>
            </div>
        `;
        
        contactEl.addEventListener('click', () => {
            openChat(contact);
        });
        
        contactsList.appendChild(contactEl);
    });
    
    initIcons();
}

async function sendMessage(contact, text) {
    if (!text.trim()) return;
    
    try {
        const success = xcordP2P.sendMessage(contact.username, text);
        
        if (!success) {
            showError('Не удалось отправить: нет подключения');
            return;
        }
        
        const message = {
            id: Date.now().toString(),
            sender: APP_STATE.username,
            text: text,
            timestamp: Date.now() / 1000,
            target: contact.username
        };
        
        APP_STATE.messages.push(message);
        
        const input = document.getElementById('message-input');
        if (input) input.value = '';
        
        renderMessages();
        
    } catch (error) {
        console.error('Failed to send message:', error);
        showError('Не удалось отправить сообщение');
    }
}

async function loadChatMessages(contact) {
    try {
        const result = await xcordP2P.getMessages();
        APP_STATE.messages = result.messages || [];
        
        if (contact) {
            APP_STATE.messages = APP_STATE.messages.filter(
                m => (m.sender === contact.username && m.target === APP_STATE.username) ||
                     (m.sender === APP_STATE.username && m.target === contact.username)
            );
        }
        
        renderMessages();
    } catch (error) {
        console.error('Failed to load messages:', error);
    }
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    APP_STATE.messages.forEach((msg, index) => {
        const isOwn = msg.sender === APP_STATE.username;
        const msgEl = document.createElement('div');
        msgEl.className = `message ${isOwn ? 'message-own' : 'message-other'}`;
        
        const ttsButton = !isOwn ? `
            <button class="message-tts-btn" onclick="playTTS(${index})" title="Озвучить">
                <i data-lucide="volume-2"></i>
            </button>
        ` : '';
        
        msgEl.innerHTML = `
            <div class="message-content">${escapeHtml(msg.text)}</div>
            ${ttsButton}
            <div class="message-time">${formatTime(msg.timestamp)}</div>
        `;
        
        container.appendChild(msgEl);
    });
    
    initIcons();
    
    container.scrollTop = container.scrollHeight;
}

function openChat(contact) {
    APP_STATE.currentChat = contact;
    
    const headerName = document.getElementById('chat-header-name');
    const headerStatus = document.getElementById('chat-header-status');
    if (headerName) headerName.textContent = contact.username;
    if (headerStatus) headerStatus.textContent = 'Online';
    
    loadChatMessages(contact);
    
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) inputArea.style.display = 'flex';
}

function setupUI() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendBtn?.click();
        }
    });
    
    sendBtn?.addEventListener('click', () => {
        if (APP_STATE.currentChat) {
            sendMessage(APP_STATE.currentChat, messageInput.value);
        } else {
            showNotification('Сначала выберите контакт');
        }
    });
    
    const usersSearchBtn = document.getElementById('open-users-search');
    usersSearchBtn?.addEventListener('click', () => {
        if (window.dbManager) {
            window.dbManager.openSearchModal();
        }
    });
    
    setInterval(loadContacts, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(timestamp * 1000);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--bg-tertiary);
        color: var(--text-normal);
        padding: 12px 24px;
        border-radius: var(--radius-md);
        box-shadow: 0 4px 20px var(--glass-shadow);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function showError(message) {
    showNotification(message);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
    }
`;
document.head.appendChild(style);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
    });
} else {
}

if (typeof initJarvis === 'function') {
    setTimeout(() => initJarvis(), 100);
}
