/**
 * Xcord Reticulum API Client
 * Интеграция frontend с Reticulum через REST API
 */

const RETICULUM_API_URL = 'http://localhost:8000';

class ReticulumClient {
    constructor() {
        this.initialized = false;
        this.peerHash = null;
    }

    /**
     * Инициализация Reticulum сети
     */
    async init(storagePath = './xcord_data') {
        try {
            const response = await fetch(`${RETICULUM_API_URL}/reticulum/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storage_path: storagePath })
            });
            
            const data = await response.json();
            
            if (data.status === 'started' || data.status === 'already_running') {
                this.initialized = true;
                this.peerHash = data.peer_hash;
                console.log('[Reticulum] Initialized:', this.peerHash);
                return data;
            } else {
                throw new Error('Failed to initialize Reticulum');
            }
        } catch (error) {
            console.error('[Reticulum] Init error:', error);
            throw error;
        }
    }

    /**
     * Получить статус сети
     */
    async getStatus() {
        const response = await fetch(`${RETICULUM_API_URL}/reticulum/status`);
        return await response.json();
    }

    /**
     * Добавить друга
     */
    async addPeer(nickname, peerHash) {
        const response = await fetch(`${RETICULUM_API_URL}/reticulum/peer/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, peer_hash: peerHash })
        });
        
        return await response.json();
    }

    /**
     * Отправить сообщение
     */
    async sendMessage(peerNickname, message, subject = '') {
        const response = await fetch(`${RETICULUM_API_URL}/reticulum/message/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                peer_nickname: peerNickname,
                message,
                subject
            })
        });
        
        return await response.json();
    }

    /**
     * Получить сообщения
     */
    async getMessages(peerNickname = null) {
        const url = peerNickname 
            ? `${RETICULUM_API_URL}/reticulum/messages?peer_nickname=${encodeURIComponent(peerNickname)}`
            : `${RETICULUM_API_URL}/reticulum/messages`;
        
        const response = await fetch(url);
        return await response.json();
    }

    /**
     * Подписаться на новые сообщения (SSE)
     */
    subscribeToMessages(callback) {
        try {
            const eventSource = new EventSource(`${RETICULUM_API_URL}/reticulum/messages/stream`);
            
            eventSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.new_messages) {
                        callback(data.new_messages);
                    }
                } catch (e) {
                    console.warn('[Reticulum] Failed to parse SSE data:', e);
                }
            };
            
            eventSource.onerror = (error) => {
                // Only log once to avoid spam
                if (!this.sseErrorLogged) {
                    console.log('[Reticulum] SSE connection established (errors are normal during reconnect)');
                    this.sseErrorLogged = true;
                }
            };
            
            return eventSource;
        } catch (error) {
            console.error('[Reticulum] SSE init error:', error);
            return null;
        }
    }

    /**
     * Получить свой peer hash
     */
    getMyHash() {
        return this.peerHash;
    }

    /**
     * Проверить инициализацию
     */
    isReady() {
        return this.initialized;
    }
}

// Глобальный клиент
window.xcordReticulum = new ReticulumClient();

// Пример использования:
//
// // Инициализация
// await xcordReticulum.init();
// console.log('My hash:', xcordReticulum.getMyHash());
//
// // Добавить друга
// await xcordReticulum.addPeer('Илья', 'abc123...');
//
// // Отправить сообщение
// await xcordReticulum.sendMessage('Илья', 'Привет!');
//
// // Получить сообщения
// const messages = await xcordReticulum.getMessages();
// console.log('Messages:', messages);
//
// // Подписаться на новые сообщения
// xcordReticulum.subscribeToMessages((newMessages) => {
//     console.log('New messages:', newMessages);
//     // Обновить UI...
// });
