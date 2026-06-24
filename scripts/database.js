
class DatabaseManager {
    constructor() {
        this.currentUserId = null;
        this.init();
    }

    async init() {
        try {
            console.log('[Database] Running in browser mode (IndexedDB)');
            this.setupEventListeners();
        } catch (err) {
            console.error('Database init failed:', err);
        }
    }

    setupEventListeners() {
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchUsers(e.target.value));
        }

        const closeBtn = document.getElementById('users-search-close');
        const modal = document.getElementById('users-search-modal');
        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => this.closeSearchModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeSearchModal();
            });
        }
    }

    async searchUsers(query) {
        const resultsDiv = document.getElementById('search-results');
        if (!query || query.length < 2) {
            resultsDiv.innerHTML = `
                <div class="search-placeholder">
                    <i data-lucide="search" size="48"></i>
                    <p>Введите минимум 2 символа</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Ищем среди P2P пиров
        if (window.xcordP2P && typeof window.xcordP2P.getPeers === 'function') {
            const peers = window.xcordP2P.getPeers();
            const filtered = peers.filter(p => {
                const peerObj = typeof p === 'object' ? p : { id: p, username: p };
                return peerObj.username.toLowerCase().includes(query.toLowerCase());
            });
            
            if (filtered.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="search-placeholder">
                        <i data-lucide="user-x" size="48"></i>
                        <p>Пользователи не найдены</p>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = filtered.map(peer => {
                    const peerObj = typeof peer === 'object' ? peer : { id: peer, username: peer };
                    return `
                    <div class="user-result-item" data-user-id="${peerObj.id}">
                        <div class="user-result-avatar">
                            ${peerObj.username[0].toUpperCase()}
                        </div>
                        <div class="user-result-info">
                            <div class="user-result-name">${peerObj.username}</div>
                            <div class="user-result-username">@${peerObj.username}</div>
                        </div>
                        <div class="user-result-actions">
                            <button class="btn-add-contact" onclick="window.startChat('${peerObj.id}')">
                                <i data-lucide="message-circle"></i> Чат
                            </button>
                        </div>
                    </div>
                `}).join('');
            }
            
            if (window.lucide) lucide.createIcons();
            return;
        }
        
        // Fallback: поиск в IndexedDB через messageStore
        if (window.messageStore) {
            const users = await window.messageStore.searchUsers(query);
            
            if (users.length === 0) {
                resultsDiv.innerHTML = `
                    <div class="search-placeholder">
                        <i data-lucide="user-x" size="48"></i>
                        <p>Пользователи не найдены</p>
                    </div>
                `;
            } else {
                resultsDiv.innerHTML = users.map(user => `
                    <div class="user-result-item" data-user-id="${user.id}">
                        <div class="user-result-avatar">
                            ${user.displayName ? user.displayName[0].toUpperCase() : user.username[0].toUpperCase()}
                        </div>
                        <div class="user-result-info">
                            <div class="user-result-name">${user.displayName || user.username}</div>
                            <div class="user-result-username">@${user.username}</div>
                        </div>
                        <div class="user-result-actions">
                            <button class="btn-add-contact" onclick="window.startChat('${user.id}')">
                                <i data-lucide="message-circle"></i> Чат
                            </button>
                        </div>
                    </div>
                `).join('');
            }
            
            if (window.lucide) lucide.createIcons();
            return;
        }
        
        resultsDiv.innerHTML = '<p>База данных недоступна</p>';
    }

    openSearchModal() {
        const modal = document.getElementById('users-search-modal');
        if (modal) {
            modal.classList.add('active');
            const searchInput = document.getElementById('user-search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.addEventListener('input', (e) => this.searchUsers(e.target.value));
            }
        }
    }

    closeSearchModal() {
        const modal = document.getElementById('users-search-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

const dbManager = new DatabaseManager();

window.dbManager = dbManager;
