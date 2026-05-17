# P2P Messaging Test Guide

## 🚀 Quick Start

### 1. Start Server
```bash
cd core
python app.py
```

Server will start at `http://localhost:8000`

### 2. Open in Browser
Open `http://localhost:8000` in your browser

### 3. Get Your Peer Hash
- Your peer hash will be displayed at the top of the chat list
- Click the copy button to copy it

### 4. Add a Friend
1. Click menu (burger icon) → "Add Contact"
2. Enter friend's nickname
3. Enter their peer hash
4. Click OK

### 5. Send Messages
1. Click on a contact in the list
2. Type message in the input box
3. Press Enter or click send button

## 📡 How It Works

### Peer Hash
- Unique identifier for each node
- Format: Hex string (e.g., `a1b2c3d4e5f6...`)
- Share this with friends to connect

### Real-time Messages
- SSE (Server-Sent Events) automatically updates messages
- No page refresh needed
- Instant delivery

### Decentralized
- No central server
- Direct P2P connection via Reticulum Network
- Works across different networks/internet

## 🧪 Testing Between Two Machines

### Machine A (Node 1):
```bash
cd core
python app.py
```
- Copy peer hash: `abc123...`
- Send to Machine B

### Machine B (Node 2):
```bash
cd core
python app.py
```
- Add Machine A's peer hash as contact
- Send test message

### Expected Result:
- Messages should appear instantly on both machines
- No central server required

## 🐛 Troubleshooting

### "Reticulum not initialized"
- Wait 2-3 seconds after page load
- Check console for errors (F12)

### Messages not sending
- Verify both nodes are running
- Check peer hash is correct (copy/paste)
- Ensure firewall allows connections

### SSE Connection Failed
- Refresh the page
- Check browser console for errors
- Verify server is running

## 📝 API Reference

### Endpoints
```
POST /reticulum/init          - Initialize network
GET  /reticulum/status        - Get node status
POST /reticulum/peer/add      - Add friend
POST /reticulum/message/send  - Send message
GET  /reticulum/messages      - Get messages
GET  /reticulum/messages/stream - SSE stream
```

### Example API Calls
```javascript
// Initialize
await xcordReticulum.init('./data');

// Add contact
await xcordReticulum.addPeer('Friend', 'abc123...');

// Send message
await xcordReticulum.sendMessage('Friend', 'Hello!');

// Get messages
const messages = await xcordReticulum.getMessages('Friend');
```

## 🎯 Next Steps

1. ✅ Test on localhost (single machine)
2. ⏳ Test between 2 computers on same network
3. ⏳ Test over internet (different networks)
4. ⏳ Test voice calls (LXST protocol)

---

**Created:** 2026-04-29
**Version:** 0.1.0