// Динамический порт сервера (используем текущий host)
const JARVIS_API = window.location.origin;

let jarvisMessages = [];
let isJarvisListening = false;
window.isJarvisChat = false;

console.log('[Jarvis] Module loaded, API:', JARVIS_API);

function initJarvis() {
    console.log('[Jarvis] initJarvis() called');
}

function openJarvisChat() {
    console.log('[Jarvis] openJarvisChat() called');
    
    window.isJarvisChat = true;
    window.currentChat = null;
    window.currentChatName = null;
    window.messages = [];
    
    console.log('[Jarvis] isJarvisChat:', window.isJarvisChat);
    
    const chatHeader = document.querySelector('.header-text h3');
    const headerStatus = document.querySelector('.header-status');
    if (chatHeader) chatHeader.textContent = 'Jarvis AI';
    if (headerStatus) headerStatus.textContent = 'AI Assistant';
    
    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) inputArea.style.display = 'flex';
    
    const container = document.getElementById('messages-container');
    if (container) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--text-muted);">
                <img src="assets/avatars/jarvis.png" alt="Jarvis" style="width:80px;height:80px;border-radius:50%;margin-bottom:16px;">
                <h3>Jarvis AI</h3>
                <p>Привет! Я Jarvis. Задайте любой вопрос.</p>
            </div>
        `;
    }
    
    const input = document.getElementById('message-input');
    if (input) {
        input.value = '';
        input.placeholder = 'Спросите Jarvis...';
        input.focus();
    }
    
    console.log('[Jarvis] Chat opened');
}
    
async function sendJarvisMessage(text) {
    console.log('[Jarvis] >>> sendJarvisMessage:', text);
    
    if (!text || !text.trim()) {
        console.warn('[Jarvis] Empty text');
        return;
    }

    const container = document.getElementById('messages-container');
    if (!container) {
        console.error('[Jarvis] ERROR: container not found');
        return;
    }

    // Удаляем welcome
    const welcome = container.querySelector('div[style*="text-align:center"]');
    if (welcome) welcome.remove();

    // Сообщение пользователя
    const userMsg = document.createElement('div');
    userMsg.className = 'message-group';
    userMsg.innerHTML = `
        <div class="message-text" style="background:var(--accent-primary);color:white;padding:10px 14px;border-radius:8px;margin:8px 16px;max-width:70%;align-self:flex-end;">
            ${escapeHtml(text)}
        </div>
        <div style="font-size:11px;color:var(--text-muted);margin:4px 16px;text-align:right;">${formatTime(Date.now()/1000)}</div>
    `;
    container.appendChild(userMsg);
    container.scrollTop = container.scrollHeight;

    // Индикатор набора
    const typing = document.createElement('div');
    typing.className = 'message-group';
    typing.innerHTML = `
        <div class="message-avatar"><img src="assets/avatars/jarvis.png" style="width:32px;height:32px;border-radius:50%;"></div>
        <div style="background:var(--bg-modifier-hover);padding:10px 14px;border-radius:8px;margin:8px 16px;">
            <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
    `;
    container.appendChild(typing);

    try {
        console.log('[Jarvis] → API request...');
        
        const response = await fetch(`${JARVIS_API}/jarvis/command`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ command: text })
        });

        console.log('[Jarvis] ← Status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log('[Jarvis] ← Response:', data);
        
        typing.remove();

        const botMsg = document.createElement('div');
        botMsg.className = 'message-group';
        const reply = data.response || data.error || 'Пустой ответ';
        botMsg.innerHTML = `
            <div class="message-avatar"><img src="assets/avatars/jarvis.png" style="width:32px;height:32px;border-radius:50%;"></div>
            <div style="background:var(--bg-modifier-hover);padding:10px 14px;border-radius:8px;margin:8px 16px;max-width:70%;">
                <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px;">
                    <span style="font-weight:600;color:var(--accent-primary);">Jarvis AI</span>
                    <span style="margin-left:8px;">${formatTime(Date.now()/1000)}</span>
                </div>
                <div style="color:var(--text-normal);word-wrap:break-word;">${escapeHtml(reply)}</div>
            </div>
        `;
        container.appendChild(botMsg);
        container.scrollTop = container.scrollHeight;

    } catch (error) {
        console.error('[Jarvis] ERROR:', error);
        typing.remove();
        
        const errMsg = document.createElement('div');
        errMsg.className = 'message-group';
        errMsg.innerHTML = `
            <div class="message-avatar"><img src="assets/avatars/jarvis.png" style="width:32px;height:32px;border-radius:50%;"></div>
            <div style="background:rgba(239,68,68,0.2);padding:10px 14px;border-radius:8px;margin:8px 16px;max-width:70%;border:1px solid #ef4444;">
                <div style="color:#ef4444;">
                    <strong>Ошибка Jarvis</strong><br>
                    <small>${error.message}</small><br>
                    <small>Возможно HF токен устарел</small>
                </div>
            </div>
        `;
        container.appendChild(errMsg);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(ts) {
    if (!ts) return '';
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'});
}

document.addEventListener('DOMContentLoaded', () => initJarvis());

window.openJarvisChat = openJarvisChat;
window.sendJarvisMessage = sendJarvisMessage;

