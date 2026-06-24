let currentFilter = 'all';
let activeChatId = 'jarvis';
let isLightTheme = false;

document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    initBurgerMenu();
    initTabs();
    initFolderMenu();
    initThemeToggle();
    initProfileToggle();
    initProfileModal();
    
    // Показываем Jarvis сразу (до инициализации p2p)
    // updateContactsList вызывается из p2p-main.js после загрузки
    renderChatList();
    
    // Jarvis открывается из p2p-main.js после инициализации
});

function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

function initBurgerMenu() {
    const burgerBtn = document.getElementById('burger-btn');
    const mainMenu = document.getElementById('main-menu');

    if (!burgerBtn || !mainMenu) return;

    burgerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        mainMenu.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!mainMenu.contains(e.target) && !burgerBtn.contains(e.target)) {
            mainMenu.classList.remove('active');
        }
    });
}

function initTabs() {
    const tabs = document.querySelectorAll('.filter-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filterType = tab.dataset.filter;
            updateFilterUI(filterType);
        });
    });
}

function initFolderMenu() {
    const folders = document.querySelectorAll('.folder-select');
    const mainMenu = document.getElementById('main-menu');

    folders.forEach(folder => {
        folder.addEventListener('click', () => {
            const filter = folder.dataset.filter;
            updateFilterUI(filter);

            mainMenu.classList.remove('active');
        });
    });
}

function updateFilterUI(filterType) {
    currentFilter = filterType;

    document.querySelectorAll('.filter-tab').forEach(t => {
        if (t.dataset.filter === filterType) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    renderChatList();
}

function initThemeToggle() {
    const toggleItem = document.getElementById('theme-toggle');
    const themeIndicator = document.getElementById('theme-indicator');

    const savedTheme = localStorage.getItem('xcord_theme');
    if (savedTheme === 'light') {
        isLightTheme = true;
        document.body.classList.add('theme-light');
    }

    if (!toggleItem) return;

    toggleItem.addEventListener('click', (e) => {
        e.stopPropagation();

        isLightTheme = !isLightTheme;
        document.body.classList.toggle('theme-light', isLightTheme);

        localStorage.setItem('xcord_theme', isLightTheme ? 'light' : 'dark');
    });
}
    
function renderChatList() {
    const chatListContainer = document.querySelector('.chat-list-content');
    if (!chatListContainer) return;

    // Вызываем обновление списка из p2p-main.js, если функция доступна
    if (typeof updateContactsList === 'function') {
        updateContactsList();
    } else {
        // Fallback: показываем только Jarvis до загрузки p2p-main.js
        chatListContainer.innerHTML = `
            <div class="chat-item jarvis-chat" onclick="if(typeof openJarvisChat==='function')openJarvisChat()">
                <div class="avatar-wrapper">
                    <img src="assets/avatars/jarvis.png" alt="Jarvis" style="width:48px;height:48px;border-radius:50%;object-fit:cover;">
                    <div class="status-indicator online"></div>
                </div>
                <div class="chat-info">
                    <div class="chat-name-row">
                        <span class="chat-name">Jarvis AI</span>
                    </div>
                    <div class="chat-preview">
                        <span class="preview-text">AI Assistant</span>
                    </div>
                </div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }
    
    initIcons();
}

// createChatItem удалена - чаты теперь только динамические (P2P пиры)

function renderChat(chat) {
    if (!chat) return;

    document.querySelector('.header-text h3').innerText = chat.name;
    document.querySelector('.header-status').innerText = chat.type === 'channel' ? 'AI Assistant' : 'Online';

    const container = document.querySelector('.messages-container');
    container.innerHTML = '';

    chat.messages.forEach(msg => {
        const msgGroup = document.createElement('div');
        msgGroup.className = 'message-group';
        msgGroup.innerHTML = `
            <div class="message-avatar">
                <img src="${msg.avatar}" alt="Avatar">
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="username" style="color: var(--header-primary)">${msg.senderName}</span>
                    <span class="timestamp">${msg.date} at ${msg.time}</span>
                </div>
                <div class="message-body">${msg.text}</div>
            </div>
        `;
        container.appendChild(msgGroup);
    });

    const inputArea = document.getElementById('chat-input-area');
    if (inputArea) {
        inputArea.style.display = 'flex';
    }

    container.scrollTop = container.scrollHeight;
}

function initProfileToggle() {
    const toggleBtn = document.getElementById('toggle-profile');
    const profileSidebar = document.getElementById('profile-sidebar');
    if (!toggleBtn || !profileSidebar) return;
    toggleBtn.addEventListener('click', () => {
        profileSidebar.classList.toggle('active');
    });
}

function initProfileModal() {
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('profile-close');
    const menuProfileBtn = document.getElementById('menu-open-profile');

    menuProfileBtn?.addEventListener('click', () => {
        openProfile();
        document.getElementById('main-menu').classList.remove('active');
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            openProfile();
        }
    });

    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    modal?.addEventListener('mousedown', (e) => {
        isDragging = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
    });
    
    modal?.addEventListener('mousemove', (e) => {
        const dx = Math.abs(e.clientX - dragStartX);
        const dy = Math.abs(e.clientY - dragStartY);
        if (dx > 5 || dy > 5) {
            isDragging = true;
        }
    });
    
    closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfile();
    });
    
    modal?.addEventListener('click', (e) => {
        if (isDragging) {
            isDragging = false;
            return;
        }
        
        const profileCard = document.getElementById('profile-card');
        if (profileCard?.contains(e.target)) {
            return;
        }
        
        if (e.target === modal || e.target.classList.contains('profile-fullscreen-bg')) {
            closeProfile();
        }
    });
}

function openProfile() {
    const modal = document.getElementById('profile-modal');
    if (modal) {
        modal.classList.add('active');
        if (typeof updateProfileDisplay === 'function') {
            updateProfileDisplay();
        }
        initIcons();
    }
}

function closeProfile() {
    const modal = document.getElementById('profile-modal');
    const editor = document.getElementById('profile-editor');
    if (modal) modal.classList.remove('active');
    if (editor) editor.classList.remove('active');
}

