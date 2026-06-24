/**
 * Xcord P2P - Simplified WebSocket Messaging
 * Works through server as signaling hub
 */

class XcordP2PClient {
    constructor(signalingUrl) {
        this.signalingUrl = signalingUrl;
        this.ws = null;
        this.userId = null;
        this.clientId = null;
        this.peers = new Map();
        
        // Callbacks
        this.onConnected = null;
        this.onPeerJoined = null;
        this.onPeerLeft = null;
        this.onMessage = null;
        this.onDisconnected = null;
    }

    async connect(username) {
        return new Promise((resolve, reject) => {
            try {
                this.userId = username;
                const wsUrl = this.signalingUrl.replace('http:', 'ws:').replace('https:', 'wss:');
                this.ws = new WebSocket(wsUrl + '/ws/' + encodeURIComponent(username));

                this.ws.onopen = () => {
                    console.log('[P2P] Connected to server');
                    // Start heartbeat immediately
                    this.startHeartbeat(15000);
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('[P2P] Disconnected from server');
                    if (this.onDisconnected) this.onDisconnected();
                };

                this.ws.onerror = (error) => {
                    console.error('[P2P] Error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleMessage(data);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    handleMessage(data) {
        console.log('[P2P] Received:', data.type, data);

        switch (data.type) {
            case 'connected':
                this.clientId = data.client_id;
                console.log('[P2P] My ID:', this.clientId);
                if (this.onConnected) this.onConnected(this.clientId);
                break;

            case 'peer_list':
                this.peers.clear();
                data.peers.forEach(peer => {
                    this.peers.set(peer.id, peer);
                });
                console.log('[P2P] Peers:', Array.from(this.peers.keys()));
                if (this.onPeerJoined) this.onPeerJoined(Array.from(this.peers.values()));
                break;

            case 'peer_joined':
                this.peers.set(data.peer.id, data.peer);
                console.log('[P2P] ➕ Peer joined:', data.peer);
                if (this.onPeerJoined) this.onPeerJoined([data.peer]);
                break;

            case 'peer_left':
                this.peers.delete(data.peerId);
                console.log('[P2P] ➖ Peer left:', data.peerId);
                if (this.onPeerLeft) this.onPeerLeft(data.peerId);
                break;

            case 'message':
                console.log('[P2P] 📨 Message received from:', data.from, 'data:', data.data);
                if (this.onMessage) {
                    this.onMessage(data.from, data.data);
                }
                break;

            case 'pong':
                // Heartbeat response
                break;
                
            default:
                console.log('[P2P] ❓ Unknown message type:', data.type);
        }
    }

    sendMessage(toClientId, message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.error('[P2P] Not connected');
            return false;
        }

        // Проверка типа toClientId - должен быть строкой
        if (typeof toClientId !== 'string' || !toClientId.trim()) {
            console.error('[P2P] Invalid toClientId:', toClientId, '(must be non-empty string)');
            return false;
        }

        console.log('[P2P] 📤 Sending message to:', toClientId, message);
        this.ws.send(JSON.stringify({
            type: 'message',
            to: toClientId,
            data: message
        }));
        return true;
    }

    broadcast(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            return false;
        }

        this.ws.send(JSON.stringify({
            type: 'message',
            to: null,
            data: message
        }));
        return true;
    }

    getPeers() {
        return Array.from(this.peers.values());
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
        this.peers.clear();
    }

    // Heartbeat to keep connection alive
    startHeartbeat(interval = 30000) {
        setInterval(() => {
            if (this.isConnected()) {
                this.ws.send(JSON.stringify({ type: 'ping' }));
            }
        }, interval);
    }
}

// Export
window.XcordP2PClient = XcordP2PClient;
