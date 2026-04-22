// ============================================
// Jarvis AI Integration
// ============================================

const JARVIS_API = "http://localhost:8000"; // FastAPI server URL

let jarvisMessages = [];
let isJarvisListening = false;

function initJarvis() {
    const modal = document.getElementById('jarvis-modal');
    const openBtn = document.getElementById('jarvis-btn');
    const closeBtn = document.getElementById('jarvis-close');
    const sendBtn = document.getElementById('jarvis-send');
    const input = document.getElementById('jarvis-input');
    const voiceBtn = document.getElementById('jarvis-voice');

    // Open Jarvis modal
    openBtn?.addEventListener('click', () => {
        modal?.classList.add('active');
        initIcons();
        // Focus input
        setTimeout(() => input?.focus(), 100);
    });

    // Close Jarvis modal
    closeBtn?.addEventListener('click', () => {
        modal?.classList.remove('active');
    });

    // Close on backdrop click
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Send message on button click
    sendBtn?.addEventListener('click', sendJarvisCommand);

    // Send message on Enter
    input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendJarvisCommand();
        }
    });

    // Voice button
    voiceBtn?.addEventListener('click', toggleVoiceListening);
}

async function sendJarvisCommand() {
    const input = document.getElementById('jarvis-input');
    const messagesContainer = document.getElementById('jarvis-messages');
    const sendBtn = document.getElementById('jarvis-send');
    
    const command = input?.value.trim();
    if (!command) return;

    // Add user message to UI
    addJarvisMessage(command, 'user');
    input.value = '';

    // Disable send button
    sendBtn.disabled = true;

    // Show typing indicator
    showTypingIndicator();

    try {
        const response = await fetch(`${JARVIS_API}/jarvis/command`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ command: command }),
        });

        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();

        if (data.ok) {
            addJarvisMessage(data.response, 'bot');
        } else {
            addJarvisMessage(`Ошибка: ${data.error}`, 'error');
        }
    } catch (error) {
        removeTypingIndicator();
        
        // Check if server is running
        if (error.message.includes('Failed to fetch')) {
            addJarvisMessage('Не удалось подключиться к серверу Jarvis. Убедитесь, что запущен core/app.py', 'error');
        } else {
            addJarvisMessage(`Ошибка: ${error.message}`, 'error');
        }
    }

    // Re-enable send button
    sendBtn.disabled = false;
    input?.focus();
}

function addJarvisMessage(text, type) {
    const messagesContainer = document.getElementById('jarvis-messages');
    if (!messagesContainer) return;

    const messageEl = document.createElement('div');
    messageEl.className = `jarvis-message ${type}`;
    messageEl.innerHTML = text.replace(/\n/g, '<br>');
    
    messagesContainer.appendChild(messageEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showTypingIndicator() {
    const messagesContainer = document.getElementById('jarvis-messages');
    if (!messagesContainer) return;

    const typingEl = document.createElement('div');
    typingEl.className = 'jarvis-typing';
    typingEl.id = 'jarvis-typing';
    typingEl.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    messagesContainer.appendChild(typingEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function removeTypingIndicator() {
    const typingEl = document.getElementById('jarvis-typing');
    if (typingEl) {
        typingEl.remove();
    }
}

function toggleVoiceListening() {
    const voiceBtn = document.getElementById('jarvis-voice');
    
    if (isJarvisListening) {
        stopVoiceListening();
    } else {
        startVoiceListening();
    }
}

function startVoiceListening() {
    const voiceBtn = document.getElementById('jarvis-voice');
    isJarvisListening = true;
    
    voiceBtn?.classList.add('listening');
    addJarvisMessage('Слушаю... Скажите "Jarvis" для активации', 'bot');
    
    // Note: Actual voice recognition requires the listener.py to be running
    // This is a placeholder for the UI - the actual voice input comes from core/listener.py
}

function stopVoiceListening() {
    const voiceBtn = document.getElementById('jarvis-voice');
    isJarvisListening = false;
    
    voiceBtn?.classList.remove('listening');
}

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', initJarvis);
