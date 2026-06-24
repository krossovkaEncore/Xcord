/**
 * Xcord WebRTC P2P Client
 * Прямое соединение между клиентами через DataChannel
 * Signaling через локальный WebSocket сервер (только для handshake)
 */

class WebRTCP2PClient {
    constructor(signalingUrl, userId) {
        this.signalingUrl = signalingUrl;
        this.userId = userId;
        this.ws = null;
        this.peers = new Map(); // peerId -> { connection, dataChannel, state }
        
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
        
        // Callbacks
        this.onConnected = null;
        this.onPeerConnected = null;
        this.onPeerDisconnected = null;
        this.onMessage = null;
        this.onDiscovery = null;
    }

    async connect(username) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = this.signalingUrl.replace('http:', 'ws:').replace('https:', 'wss:');
                this.ws = new WebSocket(wsUrl + '/ws/' + encodeURIComponent(username));

                this.ws.onopen = () => {
                    console.log('[WebRTC] Connected to signaling server');
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('[WebRTC] Disconnected from signaling server');
                };

                this.ws.onerror = (error) => {
                    console.error('[WebRTC] Signaling error:', error);
                    reject(error);
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    this.handleSignalingMessage(data);
                };

            } catch (error) {
                reject(error);
            }
        });
    }

    handleSignalingMessage(data) {
        console.log('[WebRTC] Signaling:', data.type, data);

        switch (data.type) {
            case 'connected':
                this.clientId = data.client_id;
                console.log('[WebRTC] My ID:', this.clientId);
                if (this.onConnected) this.onConnected(this.clientId);
                break;

            case 'peer_list':
                // Существующие пиры - пытаемся соединиться
                data.peers.forEach(peer => {
                    this.connectToPeer(peer.id);
                });
                break;

            case 'peer_joined':
                console.log('[WebRTC] Peer joined:', data.peer);
                if (this.onDiscovery) this.onDiscovery(data.peer);
                break;

            case 'offer':
                this.handleOffer(data.from, data.offer);
                break;

            case 'answer':
                this.handleAnswer(data.from, data.answer);
                break;

            case 'ice_candidate':
                this.handleIceCandidate(data.from, data.candidate);
                break;

            case 'message':
                // Fallback: сообщение через сервер (если DataChannel не работает)
                if (this.onMessage) {
                    this.onMessage(data.from, data.data);
                }
                break;

            case 'peer_left':
                this.closePeerConnection(data.peerId);
                if (this.onPeerDisconnected) this.onPeerDisconnected(data.peerId);
                break;
        }
    }

    async connectToPeer(peerId) {
        if (this.peers.has(peerId)) {
            console.log('[WebRTC] Already connected to', peerId);
            return;
        }

        console.log('[WebRTC] Connecting to', peerId);

        const connection = new RTCPeerConnection(this.config);
        
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignaling({
                    type: 'ice_candidate',
                    to: peerId,
                    candidate: event.candidate
                });
            }
        };

        connection.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state with', peerId, ':', connection.connectionState);
            
            if (connection.connectionState === 'connected') {
                if (this.onPeerConnected) this.onPeerConnected(peerId);
            } else if (connection.connectionState === 'disconnected' || 
                       connection.connectionState === 'failed') {
                this.closePeerConnection(peerId);
                if (this.onPeerDisconnected) this.onPeerDisconnected(peerId);
            }
        };

        this.peers.set(peerId, {
            connection: connection,
            dataChannel: null,
            state: 'connecting'
        });

        // Создаем DataChannel для инициатора
        const dataChannel = connection.createDataChannel('messages');
        this.setupDataChannel(dataChannel, peerId);
        this.peers.get(peerId).dataChannel = dataChannel;

        // Создаем offer
        try {
            const offer = await connection.createOffer();
            await connection.setLocalDescription(offer);
            
            this.sendSignaling({
                type: 'offer',
                to: peerId,
                offer: offer
            });
        } catch (error) {
            console.error('[WebRTC] Create offer error:', error);
        }
    }

    async handleOffer(fromPeerId, offer) {
        console.log('[WebRTC] Received offer from', fromPeerId);

        let peerData = this.peers.get(fromPeerId);
        
        if (!peerData) {
            const connection = new RTCPeerConnection(this.config);
            
            connection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.sendSignaling({
                        type: 'ice_candidate',
                        to: fromPeerId,
                        candidate: event.candidate
                    });
                }
            };

            connection.onconnectionstatechange = () => {
                console.log('[WebRTC] Connection state with', fromPeerId, ':', connection.connectionState);
                
                if (connection.connectionState === 'connected') {
                    if (this.onPeerConnected) this.onPeerConnected(fromPeerId);
                } else if (connection.connectionState === 'disconnected' || 
                           connection.connectionState === 'failed') {
                    this.closePeerConnection(fromPeerId);
                    if (this.onPeerDisconnected) this.onPeerDisconnected(fromPeerId);
                }
            };

            connection.ondatachannel = (event) => {
                console.log('[WebRTC] Received data channel from', fromPeerId);
                this.setupDataChannel(event.channel, fromPeerId);
                peerData.dataChannel = event.channel;
            };

            peerData = {
                connection: connection,
                dataChannel: null,
                state: 'connecting'
            };
            this.peers.set(fromPeerId, peerData);
        }

        try {
            await peerData.connection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peerData.connection.createAnswer();
            await peerData.connection.setLocalDescription(answer);

            this.sendSignaling({
                type: 'answer',
                to: fromPeerId,
                answer: answer
            });
        } catch (error) {
            console.error('[WebRTC] Handle offer error:', error);
        }
    }

    async handleAnswer(fromPeerId, answer) {
        console.log('[WebRTC] Received answer from', fromPeerId);

        const peerData = this.peers.get(fromPeerId);
        if (!peerData) {
            console.warn('[WebRTC] No connection for', fromPeerId);
            return;
        }

        try {
            await peerData.connection.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (error) {
            console.error('[WebRTC] Handle answer error:', error);
        }
    }

    async handleIceCandidate(fromPeerId, candidate) {
        const peerData = this.peers.get(fromPeerId);
        if (!peerData || !candidate) return;

        try {
            await peerData.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
            console.error('[WebRTC] Add ICE candidate error:', error);
        }
    }

    setupDataChannel(dataChannel, peerId) {
        dataChannel.onopen = () => {
            console.log('[WebRTC] DataChannel opened with', peerId);
            this.peers.get(peerId).state = 'connected';
        };

        dataChannel.onclose = () => {
            console.log('[WebRTC] DataChannel closed with', peerId);
        };

        dataChannel.onerror = (error) => {
            console.error('[WebRTC] DataChannel error with', peerId, ':', error);
        };

        dataChannel.onmessage = (event) => {
            console.log('[WebRTC] Message received from', peerId);
            try {
                const data = JSON.parse(event.data);
                if (this.onMessage) {
                    this.onMessage(peerId, data);
                }
            } catch (error) {
                console.error('[WebRTC] Parse message error:', error);
            }
        };
    }

    sendSignaling(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebRTC] Signaling not connected');
            return false;
        }

        this.ws.send(JSON.stringify(message));
        return true;
    }

    sendMessage(peerId, message) {
        const peerData = this.peers.get(peerId);
        
        if (!peerData) {
            console.warn('[WebRTC] No connection to', peerId);
            // Fallback: отправить через сервер
            return this.sendSignaling({
                type: 'message',
                to: peerId,
                data: message
            });
        }

        if (peerData.dataChannel && peerData.dataChannel.readyState === 'open') {
            peerData.dataChannel.send(JSON.stringify(message));
            return true;
        } else {
            console.warn('[WebRTC] DataChannel not ready, using signaling fallback');
            return this.sendSignaling({
                type: 'message',
                to: peerId,
                data: message
            });
        }
    }

    broadcast(message) {
        let sent = 0;
        this.peers.forEach((peerData, peerId) => {
            if (this.sendMessage(peerId, message)) {
                sent++;
            }
        });
        return sent;
    }

    closePeerConnection(peerId) {
        const peerData = this.peers.get(peerId);
        if (!peerData) return;

        if (peerData.dataChannel) {
            peerData.dataChannel.close();
        }
        if (peerData.connection) {
            peerData.connection.close();
        }
        this.peers.delete(peerId);
        console.log('[WebRTC] Closed connection to', peerId);
    }

    getPeers() {
        const peers = [];
        this.peers.forEach((peerData, peerId) => {
            peers.push({
                id: peerId,
                state: peerData.state
            });
        });
        return peers;
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    disconnect() {
        this.peers.forEach((peerData, peerId) => {
            this.closePeerConnection(peerId);
        });
        
        if (this.ws) {
            this.ws.close();
        }
    }

    // Heartbeat для signaling
    startHeartbeat(interval = 30000) {
        setInterval(() => {
            if (this.isConnected()) {
                this.sendSignaling({ type: 'ping' });
            }
        }, interval);
    }

    // UDP Discovery (через сервер)
    async discoverPeers() {
        // Запрос на обнаружение пиров через signaling
        this.sendSignaling({ type: 'discover' });
    }
}

// Export
window.WebRTCP2PClient = WebRTCP2PClient;
