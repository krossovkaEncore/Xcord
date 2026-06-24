/**
 * P2P Discovery - Обнаружение пользователей в локальной сети
 * 
 * Использует WebSocket для сигналинга и WebRTC для P2P соединения
 */

class PeerDiscovery {
    constructor() {
        this.wsUrl = 'ws://localhost:8000';
        this.ws = null;
        this.peers = new Map();
        this.userId = null;
        this.onPeerConnected = null;
        this.onPeerDisconnected = null;
        this.onMessage = null;
    }

    /**
     * Инициализация подключения к серверу сигналинга
     */
    async connect(username) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.wsUrl + '/ws/' + encodeURIComponent(username));
                
                this.ws.onopen = () => {
                    console.log('[Discovery] Connected to signaling server');
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('[Discovery] Disconnected from signaling server');
                    if (this.onPeerDisconnected) {
                        this.onPeerDisconnected();
                    }
                };

                this.ws.onerror = (error) => {
                    console.error('[Discovery] WebSocket error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    this.handleSignalingMessage(JSON.parse(event.data));
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Обработка сигнальных сообщений от сервера
     */
    handleSignalingMessage(data) {
        console.log('[Discovery] Received signaling message:', data.type);

        switch (data.type) {
            case 'peer_list':
                this.handlePeerList(data.peers);
                break;

            case 'offer':
                this.handleOffer(data);
                break;

            case 'answer':
                this.handleAnswer(data);
                break;

            case 'ice_candidate':
                this.handleIceCandidate(data);
                break;

            case 'peer_joined':
                if (this.onPeerConnected) {
                    this.onPeerConnected(data.peer);
                }
                break;

            case 'peer_left':
                this.peers.delete(data.peerId);
                if (this.onPeerDisconnected) {
                    this.onPeerDisconnected(data.peerId);
                }
                break;
        }
    }

    /**
     * Обработка списка пиров от сервера
     */
    handlePeerList(peers) {
        console.log('[Discovery] Received peer list:', peers);
        peers.forEach(peer => {
            if (peer.id !== this.userId) {
                this.peers.set(peer.id, peer);
            }
        });
    }

    /**
     * Отправка сообщения пиру
     */
    async sendMessageToPeer(peerId, message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            throw new Error('Not connected to signaling server');
        }

        this.ws.send(JSON.stringify({
            type: 'message',
            to: peerId,
            data: message
        }));
    }

    /**
     * Запрос списка онлайн пользователей
     */
    requestPeerList() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'get_peers'
            }));
        }
    }

    /**
     * Отключение от сервера
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.peers.clear();
    }

    /**
     * Получить список пиров
     */
    getPeers() {
        return Array.from(this.peers.values());
    }

    /**
     * Проверка подключения
     */
    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PeerDiscovery;
}
