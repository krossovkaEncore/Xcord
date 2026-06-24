/**
 * MessageStore - локальное хранение сообщений и контактов
 * 
 * Использует IndexedDB для хранения в браузере.
 * Гарантирует, что история чатов сохраняется локально
 * и переживает перезапуск приложения.
 */

class MessageStore {
    constructor() {
        this.dbName = 'xcord_db';
        this.dbVersion = 1;
        this.idb = null;
        this.ready = false;
    }

    async init() {
        await this.initIndexedDB();
        this.ready = true;
        console.log('[Store] Using IndexedDB');
    }

    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('username', 'username', { unique: true });
                }

                if (!db.objectStoreNames.contains('contacts')) {
                    db.createObjectStore('contacts', { keyPath: 'id', autoIncrement: true });
                }

                if (!db.objectStoreNames.contains('chats')) {
                    const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
                    chatStore.createIndex('peerId', 'peerId', { unique: false });
                }

                if (!db.objectStoreNames.contains('messages')) {
                    const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
                    msgStore.createIndex('chatId', 'chatId', { unique: false });
                    msgStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!db.objectStoreNames.contains('profiles')) {
                    db.createObjectStore('profiles', { keyPath: 'userId' });
                }
            };

            request.onsuccess = () => {
                this.idb = request.result;
                resolve();
            };
        });
    }

    // --- Пользователи ---

    async saveUser(user) {
        return this._idbPut('users', {
            id: user.id || user.username,
            username: user.username,
            displayName: user.displayName || user.username,
            avatarPath: user.avatarPath || null,
            publicKey: user.publicKey || null,
            lastSeen: Date.now()
        });
    }

    async getUser(userId) {
        return this._idbGet('users', userId);
    }

    async getUserByUsername(username) {
        const store = this._idbStore('users', 'readonly');
        const index = store.index('username');
        return this._idbIndexGet(index, username);
    }

    async searchUsers(query) {
        const all = await this._idbGetAll('users');
        const q = query.toLowerCase();
        return all.filter(u =>
            (u.username && u.username.toLowerCase().includes(q)) ||
            (u.displayName && u.displayName.toLowerCase().includes(q))
        );
    }

    async getAllUsers() {
        return this._idbGetAll('users');
    }

    // --- Контакты ---

    async addContact(userId, alias = null) {
        return this._idbAdd('contacts', { userId, alias, addedAt: Date.now() });
    }

    async getContacts() {
        const contacts = await this._idbGetAll('contacts');
        const result = [];
        for (const c of contacts) {
            const user = await this.getUser(c.userId);
            if (user) {
                result.push({ ...c, username: user.username, displayName: user.displayName });
            }
        }
        return result;
    }

    // --- Чаты ---

    async createChat(chatId, type, name, peerId = null) {
        return this._idbPut('chats', {
            id: chatId,
            type,
            name,
            peerId,
            createdAt: Date.now(),
            lastMessageAt: null
        });
    }

    async getOrCreateChat(peerId, peerName, currentUserId = null) {
        const chatId = 'chat_' + peerId;
        let chat = await this._idbGet('chats', chatId);
        if (!chat) {
            chat = {
                id: chatId,
                type: 'private',
                name: peerName,
                peerId,
                createdAt: Date.now(),
                lastMessageAt: null
            };
            await this._idbPut('chats', chat);
        }
        return chat;
    }

    async getAllChats() {
        return this._idbGetAll('chats');
    }

    // --- Сообщения ---

    async saveMessage(message) {
        const msg = {
            id: message.id || 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            chatId: message.chatId,
            senderId: message.senderId || message.from,
            senderName: message.senderName || message.from,
            content: message.content || message.text,
            contentType: message.contentType || 'text',
            timestamp: message.timestamp || Date.now(),
            isOwn: message.isOwn ? 1 : 0,
            isRead: 0
        };

        await this._idbPut('messages', msg);

        const chat = await this._idbGet('chats', msg.chatId);
        if (chat) {
            chat.lastMessageAt = msg.timestamp;
            chat.lastMessage = msg.content;
            await this._idbPut('chats', chat);
        }

        return msg;
    }

    async getMessages(chatId, limit = 100) {
        const all = await this._idbGetAll('messages');
        return all
            .filter(m => m.chatId === chatId)
            .sort((a, b) => a.timestamp - b.timestamp)
            .slice(-limit);
    }

    async getLastMessage(chatId) {
        const messages = await this.getMessages(chatId, 1);
        return messages[messages.length - 1] || null;
    }

    // --- Профили ---

    async saveProfile(userId, profileData) {
        return this._idbPut('profiles', { userId, ...profileData, updatedAt: Date.now() });
    }

    async getProfile(userId) {
        return this._idbGet('profiles', userId);
    }

    // =================== IndexedDB хелперы ===================

    _idbStore(storeName, mode = 'readonly') {
        if (!this.idb) throw new Error('IndexedDB not initialized');
        const tx = this.idb.transaction(storeName, mode);
        return tx.objectStore(storeName);
    }

    _idbPut(storeName, value) {
        return new Promise((resolve, reject) => {
            const store = this._idbStore(storeName, 'readwrite');
            const req = store.put(value);
            req.onsuccess = () => resolve(value);
            req.onerror = () => reject(req.error);
        });
    }

    _idbAdd(storeName, value) {
        return new Promise((resolve, reject) => {
            const store = this._idbStore(storeName, 'readwrite');
            const req = store.add(value);
            req.onsuccess = () => resolve({ ...value, id: req.result });
            req.onerror = () => reject(req.error);
        });
    }

    _idbGet(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._idbStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    _idbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const store = this._idbStore(storeName);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    _idbIndexGet(index, key) {
        return new Promise((resolve, reject) => {
            const req = index.get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    _idbDelete(storeName, key) {
        return new Promise((resolve, reject) => {
            const store = this._idbStore(storeName, 'readwrite');
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
}

const messageStore = new MessageStore();
window.messageStore = messageStore;
