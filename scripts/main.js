/**
 * Play TTS для сообщения (озвучка по кнопке)
 */
async function playTTS(messageIndex) {
    const msg = APP_STATE.messages[messageIndex];
    if (!msg || !msg.text) return;

    try {
        const btn = document.querySelector(`button[onclick="playTTS(${messageIndex})"]`);
        if (btn) {
            btn.innerHTML = `<i data-lucide="loader-2" class="spin"></i>`;
            initIcons();
        }
        
        // Запрос к API для генерации аудио
        const response = await fetch('/jarvis/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: msg.text })
        });
        
        const data = await response.json();
        
        if (data.ok && data.audio_url) {
            // Воспроизведение аудио
            const audio = new Audio(data.audio_url);
            audio.play();
            
            if (btn) {
                btn.innerHTML = `<i data-lucide="volume-2"></i>`;
                initIcons();
            }
        } else {
            throw new Error(data.error || 'Ошибка TTS');
        }
    } catch (error) {
        console.error('[TTS] Error:', error);
        alert('Не удалось воспроизвести аудио: ' + error.message);
        
        const btn = document.querySelector(`button[onclick="playTTS(${messageIndex})"]`);
        if (btn) {
            btn.innerHTML = `<i data-lucide="volume-2"></i>`;
            initIcons();
        }
    }
}

/**
 * Render messages
 */

// ============================================
// Global State
// ============================================
const APP_STATE = {
    initialized: false,
    reticulumReady: false,
    myPeerHash: null,
    contacts: [],
    currentChat: null,
    messages: [],
    sseConnection: null
};

// ============================================
// Initialize Application
// ============================================
async function initXcord() {
    console.log('🚀 Initializing Xcord...');
    
    try {
        // 1. Load settings
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
        
        // 2. Initialize Reticulum
        await initReticulum();
        
        // 3. Setup UI
        setupUI();
        
        // 4. Connect SSE for real-time messages
        connectSSE();
        
        APP_STATE.initialized = true;
        console.log('✅ Xcord initialized successfully');
        
    } catch (error) {
        console.error('❌ Initialization error:', error);
        showError('Ошибка инициализации: ' + error.message);
    }
}

// ============================================
// Reticulum Integration
// ============================================
async function initReticulum() {
    console.log('🔗 Initializing Reticulum network...');
    
    try {
        const result = await xcordReticulum.init('./xcord_data');
        
        APP_STATE.reticulumReady = true;
        APP_STATE.myPeerHash = result.peer_hash;
        
        console.log('✅ Reticulum ready');
        console.log('📝 My peer hash:', APP_STATE.myPeerHash);
        
        // Show peer hash in UI
        updatePeerHashUI(APP_STATE.myPeerHash);
        
        return result;
    } catch (error) {
        console.error('❌ Reticulum init failed:', error);
        APP_STATE.reticulumReady = false;
        throw error;
    }
}

function updatePeerHashUI(hash) {
    const peerHashElement = document.getElementById('my-peer-hash');
    if (peerHashElement) {
        peerHashElement.textContent = hash;
    }
    
    // Copy to clipboard on click
    const copyBtn = document.getElementById('copy-peer-hash');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(hash).then(() => {
                showNotification('Peer hash скопирован!');
            });
        });
    }
}

// ============================================
// SSE Connection for Real-time Messages
// ============================================
function connectSSE() {
    console.log('📡 Connecting to message stream...');
    
    const eventSource = xcordReticulum.subscribeToMessages((newMessages) => {
        console.log('📨 New messages received:', newMessages);
        
        // Update chat list
        if (typeof updateChatList === 'function') {
            updateChatList();
        }
        
        // Update current chat if open
        if (APP_STATE.currentChat) {
            loadChatMessages(APP_STATE.currentChat);
        }
        
        // Show notification
        showNotification(`Получено ${newMessages.length} новых сообщений`);
    });
    
    APP_STATE.sseConnection = eventSource;
}

// ============================================
// Contact Management
// ============================================
async function addContact(nickname, peerHash) {
    try {
        const result = await xcordReticulum.addPeer(nickname, peerHash);
        
        APP_STATE.contacts.push({
            nickname,
            peerHash,
            lastMessage: null,
            unread: 0
        });
        
        renderContacts();
        showNotification(`Контакт "${nickname}" добавлен`);
        
        return result;
    } catch (error) {
        console.error('❌ Failed to add contact:', error);
        showError('Не удалось добавить контакт');
    }
}

async function getContacts() {
    const status = await xcordReticulum.getStatus();
    return status.peers || [];
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
                <div class="contact-name">${contact.nickname}</div>
                <div class="contact-hash">${contact.peerHash}</div>
            </div>
            <button class="contact-remove-btn" onclick="removeContact('${contact.peerHash}')">
                <i data-lucide="x"></i>
            </button>
        `;
        
        contactEl.addEventListener('click', () => {
            openChat(contact);
        });
        
        contactsList.appendChild(contactEl);
    });
    
    initIcons();
}

// ============================================
// Chat & Messages
// ============================================
async function sendMessage(contact, text) {
    if (!text.trim()) return;
    
    try {
        const result = await xcordReticulum.sendMessage(contact.nickname, text);
        
        // Add to local messages
        const message = {
            id: Date.now().toString(),
            sender: 'me',
            text: text,
            timestamp: new Date(),
            status: 'sent'
        };
        
        APP_STATE.messages.push(message);
        
        // Clear input
        const input = document.getElementById('message-input');
        if (input) input.value = '';
        
        // Update UI
        renderMessages();
        
        return result;
    } catch (error) {
        console.error('❌ Failed to send message:', error);
        showError('Не удалось отправить сообщение');
    }
}

async function loadChatMessages(contact) {
    try {
        const result = await xcordReticulum.getMessages(contact.nickname);
        APP_STATE.messages = result.messages || [];
        renderMessages();
    } catch (error) {
        console.error('❌ Failed to load messages:', error);
    }
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    APP_STATE.messages.forEach((msg, index) => {
        const msgEl = document.createElement('div');
        msgEl.className = `message ${msg.sender === 'me' ? 'message-own' : 'message-other'}`;
        
        // Добавляем кнопку TTS для Jarvis сообщений
        const isJarvis = msg.sender === 'jarvis';
        const ttsButton = isJarvis ? `
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
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
}

function openChat(contact) {
    APP_STATE.currentChat = contact;
    APP_STATE.messages = [];
    
    // Update UI
    document.getElementById('chat-header-name').textContent = contact.nickname;
    document.getElementById('chat-header-status').textContent = 'Online';
    
    // Load messages
    loadChatMessages(contact);
    
    // Show chat input
    document.getElementById('chat-input-area').style.display = 'flex';
}

// ============================================
// UI Setup
// ============================================
function setupUI() {
    // Message input
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    
    messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessageBtn?.click();
        }
    });
    
    sendBtn?.addEventListener('click', () => {
        if (APP_STATE.currentChat) {
            sendMessage(APP_STATE.currentChat, messageInput.value);
        } else {
            showNotification('Сначала выберите контакт');
        }
    });
    
    // Add contact button
    const addContactBtn = document.getElementById('add-contact-btn');
    addContactBtn?.addEventListener('click', showAddContactModal);
}

function showAddContactModal() {
    const nickname = prompt('Введите имя контакта:');
    if (!nickname) return;
    
    const peerHash = prompt('Введите peer hash друга:');
    if (!peerHash) return;
    
    addContact(nickname, peerHash);
}

// ============================================
// Utilities
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function showNotification(message) {
    // Create notification element
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
    showNotification('⚠️ ' + message);
}

// Add CSS animations
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

// ============================================
// Auto-initialize on DOM ready
// ============================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initXcord);
} else {
    initXcord();
}

// Initialize Jarvis separately (it has its own DOMContentLoaded handler)
// This ensures Jarvis modal works independently
if (typeof initJarvis === 'function') {
    initJarvis();
}