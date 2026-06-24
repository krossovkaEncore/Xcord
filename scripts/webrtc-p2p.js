
/**
 * WebRTC P2P Connection Manager
 */

class WebRTCP2P {
    constructor(signalingUrl = 'ws://localhost:8000') {
        this.signalingUrl = signalingUrl;
        this.ws = null;
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        this.userId = null;
        this.onMessage = null;
        this.onPeerConnected = null;
        this.onPeerDisconnected = null;
        
        this.rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };
    }

    async connect(username) {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.signalingUrl + '/ws/' + encodeURIComponent(username));
                this.userId = username;

                this.ws.onopen = () => {
                    console.log('[WebRTC] Connected to signaling server');
                    resolve();
                };

                this.ws.onclose = () => {
                    console.log('[WebRTC] Disconnected from signaling server');
                };

                this.ws.onerror = (error) => {
                    console.error('[WebRTC] Error:', error);
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

    async handleSignalingMessage(data) {
        console.log('[WebRTC] Signaling:', data.type);

        switch (data.type) {
            case 'peer_list':
                data.peers.forEach(peer => {
                    if (peer.id !== this.userId && !this.peerConnections.has(peer.id)) {
                        this.createPeerConnection(peer.id);
                    }
                });
                break;

            case 'offer':
                await this.handleOffer(data);
                break;

            case 'answer':
                await this.handleAnswer(data);
                break;

            case 'ice_candidate':
                await this.handleIceCandidate(data);
                break;

            case 'message':
                if (this.onMessage) {
                    this.onMessage(data.from, data.data);
                }
                break;
        }
    }

    async createPeerConnection(peerId) {
        console.log('[WebRTC] Creating connection to:', peerId);

        const pc = new RTCPeerConnection(this.rtcConfig);

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal({
                    type: 'ice_candidate',
                    to: peerId,
                    candidate: event.candidate
                });
            }
        };

        pc.onconnectionstatechange = () => {
            console.log('[WebRTC] Connection state:', pc.connectionState);
            if (pc.connectionState === 'connected') {
                if (this.onPeerConnected) {
                    this.onPeerConnected(peerId);
                }
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                this.peerConnections.delete(peerId);
                this.dataChannels.delete(peerId);
                if (this.onPeerDisconnected) {
                    this.onPeerDisconnected(peerId);
                }
            }
        };

        this.peerConnections.set(peerId, pc);
        return pc;
    }

    async handleOffer(data) {
        let pc = this.peerConnections.get(data.from);
        if (!pc) {
            pc = await this.createPeerConnection(data.from);
        }

        pc.ondatachannel = (event) => {
            this.setupDataChannel(event.channel, data.from);
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.sendSignal({
            type: 'answer',
            to: data.from,
            answer: pc.localDescription
        });
    }

    async handleAnswer(data) {
        const pc = this.peerConnections.get(data.from);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    }

    async handleIceCandidate(data) {
        const pc = this.peerConnections.get(data.from);
        if (pc && data.candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (error) {
                console.error('[WebRTC] Error adding ICE candidate:', error);
            }
        }
    }

    setupDataChannel(channel, peerId) {
        console.log('[WebRTC] Setting up data channel for:', peerId);

        channel.onopen = () => {
            console.log('[WebRTC] Data channel open:', peerId);
            this.dataChannels.set(peerId, channel);
        };

        channel.onmessage = (event) => {
            console.log('[WebRTC] Message received:', event.data);
            try {
                const data = JSON.parse(event.data);
                if (this.onMessage) {
                    this.onMessage(peerId, data);
                }
            } catch (error) {
                console.error('[WebRTC] Parse error:', error);
            }
        };

        channel.onclose = () => {
            console.log('[WebRTC] Data channel closed:', peerId);
            this.dataChannels.delete(peerId);
        };
    }

    async sendMessage(peerId, message) {
        const channel = this.dataChannels.get(peerId);
        if (channel && channel.readyState === 'open') {
            channel.send(JSON.stringify(message));
            return true;
        } else {
            // Отправляем через сервер
            this.sendSignal({
                type: 'message',
                to: peerId,
                data: message
            });
            return true;
        }
    }

    sendSignal(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    getPeers() {
        return Array.from(this.peerConnections.keys());
    }

    isConnected() {
        return this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    disconnect() {
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.dataChannels.clear();
        if (this.ws) {
            this.ws.close();
        }
    }
}

// Экспорт класса
window.WebRTCP2P = WebRTCP2P;

const webrtcP2P = new WebRTCP2P();
window.webrtcP2P = webrtcP2P;
