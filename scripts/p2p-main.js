/**
 * Xcord P2P Main Application Logic
 */

let p2pClient = null;
let currentChat = null;       // peerId текущего чата
let currentChatName = null;    // username текущего чата
let myUsername = null;
let myUserId = null;           // ID текущего пользователя для БД
let messages = [];
let store = null;             // MessageStore instance

// Делаем глобальными для jarvis.js
window.currentChat = null;
window.currentChatName = null;
window.messages = [];
window.isJarvisChat = false;

// Получить ID текущего пользователя из localStorage
function getCurrentUserId() {
    if (myUserId) return myUserId;
    const auth = localStorage.getItem('xcord_auth');
    if (auth) {
        try {
            const parsed = JSON.parse(auth);
            myUserId = parsed.userId;
            return myUserId;
        } catch (e) {}
    }
    return null;
}

async function initXcord() {
    try {
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
        
        // Инициализируем хранилище
        if (typeof messageStore !== 'undefined') {
            store = messageStore;
            await store.init();
            console.log('[Xcord] Message store ready');
        } else {
            console.warn('[Xcord] messageStore not loaded, messages will not persist');
        }
        
        // Проверяем сохранённое имя
        myUsername = localStorage.getItem('xcord_username');
        
        if (!myUsername) {
            // Показываем модал для ввода имени
            await showUsernameModal();
            return;
        }
        
        await continueInit();
    } catch (error) {
        console.error('[Xcord] Initialization error:', error);
        showError('Ошибка: ' + error.message);
        setTimeout(() => initXcord(), 3000);
    }
}

async function showUsernameModal() {
    const modal = document.getElementById('username-modal');
    const input = document.getElementById('username-input');
    const btn = document.getElementById('username-submit-btn');
    
    if (!modal || !input || !btn) {
        // Fallback: генерируем случайное имя
        myUsername = 'user_' + Math.random().toString(36).substr(2, 6);
        localStorage.setItem('xcord_username', myUsername);
        
        // Сохраняем себя в базу (проверяем на дубликаты)
        if (store) {
            const existing = await store.getUser(myUsername);
            if (!existing) {
                await store.saveUser({
                    id: myUsername,
                    username: myUsername,
                    displayName: myUsername
                });
            }
        }
        
        await continueInit();
        return;
    }
    
    modal.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
    input.focus();
    
    const submit = async () => {
        const name = input.value.trim();
        if (name.length < 2) {
            input.style.borderColor = '#ef4444';
            input.focus();
            return;
        }
        myUsername = name;
        localStorage.setItem('xcord_username', myUsername);
        
        // Сохраняем себя в базу (проверяем на дубликаты)
        if (store) {
            const existing = await store.getUser(myUsername);
            if (!existing) {
                await store.saveUser({
                    id: myUsername,
                    username: myUsername,
                    displayName: myUsername
                });
            }
        }
        
        modal.style.display = 'none';
        await continueInit();
    };
    
    btn.onclick = submit;
    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submit();
        }
    };
}
    
async function continueInit() {
    try {
        console.log('[Xcord] Initializing as:', myUsername);
        
        // Получаем userId из localStorage
        myUserId = getCurrentUserId();
        
        // Сохраняем себя в базу (проверяем на дубликаты)
        if (store) {
            const existing = await store.getUser(myUsername);
            if (!existing) {
                const userId = myUserId || ('user_' + Date.now());
                await store.saveUser({
                    id: userId,
                    username: myUsername,
                    displayName: myUsername
                });
                // Обновляем myUserId если был сгенерирован новый
                if (!myUserId) myUserId = userId;
            } else if (!myUserId) {
                myUserId = existing.id;
            }
        }
        
        if (typeof XcordP2PClient === 'undefined') {
            console.error('[Xcord] XcordP2PClient not loaded!');
            showError('Ошибка загрузки P2P модуля');
            return;
        }
        
        p2pClient = new XcordP2PClient(window.location.origin);
        
        p2pClient.onConnected = (clientId) => {
            console.log('[Xcord] Connected with ID:', clientId);
            updateConnectionUI(true, myUsername);
            updateContactsList();
            loadSavedChats();
        };
        
        p2pClient.onPeerJoined = (peers) => {
            console.log('[Xcord] Peers joined:', peers);
            if (Array.isArray(peers)) {
                peers.forEach(peer => {
                    if (typeof peer === 'object') {
                        // Проверяем что это не мы сами
                        if (peer.username === myUsername) return;
                        
                        p2pClient.peers.set(peer.id, peer);
                        if (store) {
                            // Сохраняем только если нового пользователя
                            store.getUser(peer.id).then(existing => {
                                if (!existing) {
                                    store.saveUser({
                                        id: peer.id,
                                        username: peer.username,
                                        displayName: peer.username
                                    });
                                }
                            });
                        }
                    }
                });
            }
            updateContactsList();
            showNotification('Пользователь подключился!');
        };
        
        p2pClient.onPeerLeft = (peerId) => {
            console.log('[Xcord] Peer left:', peerId);
            updateContactsList();
        };
        
        p2pClient.onMessage = (from, data) => {
            console.log('[Xcord] Message from', from, data);
            handleIncomingMessage(from, data);
        };
        
        p2pClient.onDisconnected = () => {
            console.log('[Xcord] Disconnected - reconnecting...');
            updateConnectionUI(false);
            setTimeout(() => continueInit(), 3000);
        };
        
        console.log('[Xcord] Connecting...');
        await p2pClient.connect(myUsername);
        console.log('[Xcord] Connected!');
        
        p2pClient.startHeartbeat(15000);
        
        setupUI();
        updateContactsList();
        loadSavedChats();
        
        // Открываем Jarvis по умолчанию
        if (typeof openJarvisChat === 'function') {
            openJarvisChat();
        }
        
        console.log('[Xcord] Initialized successfully');
        
    } catch (error) {
        console.error('[Xcord] Init continuation error:', error);
        showError('Ошибка: ' + error.message);
        setTimeout(() => continueInit(), 3000);
    }
}

function setupUI() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-message-btn');
    
    console.log('[Xcord] Setting up UI...');
    
    if (messageInput) {
        // Enter = отправить, Shift+Enter = новая строка
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
            // Shift+Enter - стандартное поведение textarea (новая строка)
        });
        
        // Авто-resize textarea
        messageInput.addEventListener('input', () => {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 150) + 'px';
        });
    }
    
    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            handleSend();
        });
    }
    
    const findUsersBtn = document.getElementById('open-users-search');
    if (findUsersBtn) {
        findUsersBtn.addEventListener('click', openUserSearch);
    }
    
    const closeBtn = document.getElementById('users-search-close');
    const modal = document.getElementById('users-search-modal');
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    }
    
    console.log('[Xcord] UI setup complete');
}

function handleSend() {
    console.log('[Xcord] handleSend() called');
    console.log('[Xcord] window.isJarvisChat:', window.isJarvisChat);
    console.log('[Xcord] currentChat:', currentChat);
    
    const messageInput = document.getElementById('message-input');
    const text = messageInput?.value.trim();
    
    console.log('[Xcord] Input text:', text ? text.substring(0, 50) + '...' : '(empty)');
    
    if (!text) {
        console.warn('[Xcord] Empty text, aborting send');
        return;
    }
    
    if (window.isJarvisChat) {
        // Отправляем в Jarvis
        console.log('[Xcord] Sending to Jarvis...');
        if (typeof sendJarvisMessage === 'function') {
            console.log('[Xcord] sendJarvisMessage found, calling...');
            sendJarvisMessage(text);
        } else {
            console.error('[Xcord] sendJarvisMessage NOT defined!');
            showNotification('Jarvis не доступен');
        }
    } else {
        // Отправляем P2P
        console.log('[Xcord] Sending P2P...');
        if (currentChat) {
            sendMessage(currentChat, text);
        } else {
            console.warn('[Xcord] No currentChat selected');
            showNotification('Выберите чат');
        }
    }
    
    if (messageInput) {
        messageInput.value = '';
        messageInput.style.height = 'auto';
        console.log('[Xcord] Input cleared');
    }
}

function openUserSearch() {
    const modal = document.getElementById('users-search-modal');
    if (modal) {
        modal.classList.add('active');
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
    }
}

function updateConnectionUI(connected, username = '') {
    const statusEl = document.querySelector('.header-status');
    if (statusEl) {
        statusEl.textContent = connected ? 'Онлайн' : 'Отключено';
        statusEl.style.color = connected ? '#4ade80' : '#f87171';
    }
}

function updateContactsList() {
    const chatListContent = document.querySelector('.chat-list-content');
    if (!chatListContent) {
        console.log('[Xcord] updateContactsList: chatListContent missing');
        return;
    }
    
    console.log('[Xcord] updateContactsList: Starting rebuild');
    
    // Очищаем полностью и перестраиваем
    chatListContent.innerHTML = '';
    
    // Добавляем Jarvis ВСЕГДА (даже если p2pClient ещё не готов)
    const jarvisItem = document.createElement('div');
    jarvisItem.className = 'chat-item jarvis-chat';
    jarvisItem.innerHTML = `
        <div class="avatar-wrapper">
            <img src="assets/avatars/jarvis.png" alt="Jarvis" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">
            <div class="status-indicator online"></div>
        </div>
        <div class="chat-info">
            <div class="chat-name-row">
                <span class="chat-name">Jarvis AI</span>
                <span class="chat-time"></span>
            </div>
            <div class="chat-preview">
                <span class="preview-text">AI Assistant</span>
            </div>
        </div>
    `;
    jarvisItem.addEventListener('click', () => {
        console.log('[Xcord] Jarvis clicked');
        if (typeof openJarvisChat === 'function') {
            openJarvisChat();
        } else {
            console.error('[Xcord] openJarvisChat is not a function!');
        }
    });
    chatListContent.appendChild(jarvisItem);
    console.log('[Xcord] Jarvis item added to chat list');
    
    // Если p2pClient ещё не готов, загружаем только сохранённые чаты
    if (!p2pClient) {
        console.log('[Xcord] p2pClient not ready yet, loading saved chats only');
        loadSavedChats();
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
        return;
    }
    
    const peers = p2pClient.getPeers();
    console.log('[Xcord] Updating contacts, peers:', peers);
    
    if (peers.length === 0) {
        loadSavedChats();
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
        return;
    }
    
    // Фильтруем себя из списка пиров
    const myPeerId = p2pClient.clientId;
    const otherPeers = peers.filter(p => p.id !== myPeerId);
    
    if (otherPeers.length === 0) {
        loadSavedChats();
        setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
        return;
    }
    
    const section = document.createElement('div');
    section.className = 'online-users-section';
    
    const header = document.createElement('div');
    header.className = 'list-section-header';
    header.innerHTML = '<i data-lucide="wifi" size="12"></i> <span>Онлайн</span>';
    section.appendChild(header);
    
    otherPeers.forEach(peer => {
        const item = document.createElement('div');
        item.className = 'chat-item online-user';
        item.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar-placeholder" style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">
                    ${peer.username[0].toUpperCase()}
                </div>
                <div class="status-indicator online"></div>
            </div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <span class="chat-name">${peer.username}</span>
                    <span class="chat-time">Online</span>
                </div>
                <div class="chat-preview">
                    <span class="preview-text">P2P</span>
                </div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            console.log('[Xcord] Click peer:', peer.id, peer.username);
            openChat(peer.id, peer.username);
        });
        
        section.appendChild(item);
    });
    
    chatListContent.appendChild(section);
    
    loadSavedChats();
    
    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
}

function sendMessage(toPeerId, text) {
    console.log('[Xcord] Sending message:', text, 'to:', toPeerId);
    
    if (!p2pClient || !p2pClient.isConnected()) {
        showNotification('Нет подключения');
        console.error('[Xcord] Not connected!');
        return false;
    }
    
    const targetId = toPeerId || currentChat;
    if (!targetId) {
        showNotification('Выберите чат для отправки сообщения');
        console.error('[Xcord] No target chat selected!');
        return false;
    }
    
    if (!text || !text.trim()) {
        console.error('[Xcord] Empty message text!');
        return false;
    }
    
    // Нельзя писать самому себе
    const targetPeer = p2pClient.peers.get(targetId);
    if (targetPeer && targetPeer.username === myUsername) {
        showNotification('Нельзя писать самому себе!');
        return false;
    }
    
    const message = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        from: myUsername,
        text: text.trim(),
        timestamp: Date.now()
    };
    
    console.log('[Xcord] Sending to targetId:', targetId, 'message:', message);
    const sent = p2pClient.sendMessage(targetId, message);
    console.log('[Xcord] Send result:', sent);
    
    if (sent) {
        const msgObj = { ...message, isOwn: true };
        messages.push(msgObj);
        renderMessages();
        
        // Сохраняем в базу
        if (store && currentChat) {
            const chatId = 'chat_' + currentChat;
            const userId = getCurrentUserId();
            store.getOrCreateChat(currentChat, currentChatName || currentChat, userId);
            store.saveMessage({
                id: message.id,
                chatId: chatId,
                senderId: myUsername,
                senderName: myUsername,
                content: message.text,
                timestamp: message.timestamp,
                isOwn: true
            });
        }
        
        return true;
    } else {
        showNotification('Ошибка отправки');
        return false;
    }
}

function handleIncomingMessage(from, data) {
    console.log('[Xcord] Incoming message:', from, data);
    
    // Пытаемся получить username отправителя из peers
    let senderName = from;
    let senderId = from;
    const peer = p2pClient?.peers?.get(from);
    if (peer && peer.username) {
        senderName = peer.username;
    }
    
    // Извлекаем текст сообщения
    let msgText = 'No text';
    let msgId = 'msg_' + Date.now();
    let msgTimestamp = Date.now();
    
    if (data && typeof data === 'object') {
        msgText = data.text || (data.data && data.data.text) || 'No text';
        msgId = data.id || msgId;
        msgTimestamp = data.timestamp || msgTimestamp;
    }
    
    const msg = {
        id: msgId,
        from: senderName,
        text: msgText,
        timestamp: msgTimestamp,
        isOwn: false
    };
    
    messages.push(msg);
    renderMessages();
    
    // Сохраняем в базу
    if (store) {
        const chatId = 'chat_' + senderName;
        const userId = getCurrentUserId();
        store.getOrCreateChat(senderName, senderName, userId);
        store.saveMessage({
            id: msgId,
            chatId: chatId,
            senderId: senderId,
            senderName: senderName,
            content: msgText,
            timestamp: msgTimestamp,
            isOwn: false
        });
    }
    
    if (currentChat !== senderName) {
        showNotification('Сообщение от ' + senderName);
    }
}

function renderMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><h3>Добро пожаловать в Xcord!</h3><p>Выберите пользователя для начала общения</p></div>';
        return;
    }
    
    console.log('[Xcord] Rendering', messages.length, 'messages:', messages);
    
    container.innerHTML = messages.map(msg => {
        const ownClass = msg.isOwn ? 'message-own' : '';
        return `
        <div class="message ${ownClass}" style="margin:8px 16px;max-width:70%;">
            <div class="message-header" style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">
                <span class="message-author" style="font-weight:600;color:var(--accent-primary);">${msg.from}</span>
                <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-text" style="background:var(--bg-modifier-active);padding:10px 14px;border-radius:8px;color:var(--text-normal);word-wrap:break-word;">${escapeHtml(msg.text)}</div>
        </div>
    `}).join('');
    
    container.scrollTop = container.scrollHeight;
}

async function openChat(peerId, peerUsername) {
    console.log('[Xcord] Opening chat with:', peerId, peerUsername);
    currentChat = peerUsername || peerId;
    currentChatName = peerUsername || peerId;
    window.currentChat = currentChat;
    window.currentChatName = currentChatName;
    window.isJarvisChat = false; // Это P2P чат, не Jarvis
    
    const chatHeader = document.querySelector('.header-text h3');
    const headerStatus = document.querySelector('.header-status');
    if (chatHeader) {
        const peer = p2pClient?.peers?.get(peerId);
        chatHeader.textContent = peer?.username || peerUsername || 'Чат';
        if (headerStatus) headerStatus.textContent = 'Онлайн';
    }
    
    // Показываем поле ввода
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) {
        inputArea.style.display = 'flex';
    }
    
    // Загружаем историю из базы
    messages = [];
    if (store) {
        const chatId = 'chat_' + currentChat;
        const savedMessages = await store.getMessages(chatId, 100);
        console.log('[Xcord] Loaded', savedMessages.length, 'messages from store');
        
        messages = savedMessages.map(m => ({
            id: m.id,
            from: m.senderName || m.senderId,
            text: m.content,
            timestamp: m.timestamp,
            isOwn: m.isOwn === 1 || m.isOwn === true
        }));
    }
    renderMessages();
    
    // Закрываем модалку поиска
    const modal = document.getElementById('users-search-modal');
    if (modal) modal.classList.remove('active');
    
    // Фокус на ввод
    const input = document.getElementById('message-input');
    if (input) {
        input.value = '';
        input.focus();
        input.placeholder = 'Сообщение...';
        input.style.display = 'block';
    }
    
    console.log('[Xcord] Chat opened, currentChat:', currentChat, 'messages:', messages.length);
}

window.startChat = function(peerId) {
    openChat(peerId);
    const modal = document.getElementById('users-search-modal');
    if (modal) modal.classList.remove('active');
};

window.openChat = openChat;

/**
 * Загружает сохранённые чаты из базы и отображает в списке
 */
async function loadSavedChats() {
    if (!store) return;
    
    const chats = await store.getAllChats();
    console.log('[Xcord] Saved chats:', chats);
    
    const chatListContent = document.querySelector('.chat-list-content');
    if (!chatListContent) return;
    
    // Удаляем старую секцию сохранённых чатов
    const oldSection = chatListContent.querySelector('.saved-chats-section');
    if (oldSection) oldSection.remove();
    
    if (chats.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'saved-chats-section';
    
    const header = document.createElement('div');
    header.className = 'list-section-header';
    header.innerHTML = '<i data-lucide="message-square" size="12"></i> <span>Чаты</span>';
    section.appendChild(header);
    
    for (const chat of chats) {
        // Получаем последнее сообщение
        const lastMsg = await store.getLastMessage(chat.id);
        const previewText = lastMsg ? lastMsg.content : 'Нет сообщений';
        const previewTime = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
        
        const item = document.createElement('div');
        item.className = 'chat-item saved-chat';
        item.innerHTML = `
            <div class="avatar-wrapper">
                <div class="avatar-placeholder" style="width:48px;height:48px;background:linear-gradient(135deg,#667eea,#764ba2);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;">
                    ${(chat.name || chat.peerId || '?')[0].toUpperCase()}
                </div>
                <div class="status-indicator offline"></div>
            </div>
            <div class="chat-info">
                <div class="chat-name-row">
                    <span class="chat-name">${chat.name || chat.peerId}</span>
                    <span class="chat-time">${previewTime}</span>
                </div>
                <div class="chat-preview">
                    <span class="preview-text">${escapeHtml(previewText.substring(0, 40))}</span>
                </div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            openChat(chat.peerId || chat.id, chat.name);
        });
        
        section.appendChild(item);
    }
    
    chatListContent.appendChild(section);
    setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 100);
}

function showNotification(message) {
    const el = document.createElement('div');
    el.textContent = message;
    el.style.cssText = 'position:fixed;top:20px;right:20px;background:#2f3136;color:white;padding:12px 24px;border-radius:8px;z-index:9999;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

function showError(message) {
    showNotification('[ERROR] ' + message);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', initXcord);
