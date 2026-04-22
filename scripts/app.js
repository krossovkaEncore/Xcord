// Xcord Logic

// State
let currentFilter = 'all';
let activeChatId = CHATS[0].id; // Default
let isLightTheme = false; // Theme State

document.addEventListener('DOMContentLoaded', () => {
    initIcons();
    initBurgerMenu();
    initTabs(); // Keep horizontal tabs synced with menu folders
    initProfileToggle();
    initThemeToggle();
    initFolderMenu();

    // Profile System (iOS 26 Glass - initialized in profile.js)
    initProfileModal();
    initImageCropEditor();
    initFileUploads();

    // Settings System
    loadSettings();
    initSettingsModal();

    // Initial Render
    renderChatList();
    renderChat(CHATS.find(c => c.id === activeChatId));
});

// 1. Icons
function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 2. Burger Menu
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

// 3. Tabs (Horizontal) Logic
function initTabs() {
    const tabs = document.querySelectorAll('.filter-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update UI
            updateFilterUI(tab.innerText.toLowerCase());
        });
    });
}

// 4. Folder Menu (Dropdown) Logic
function initFolderMenu() {
    const folders = document.querySelectorAll('.folder-select');
    const mainMenu = document.getElementById('main-menu');

    folders.forEach(folder => {
        folder.addEventListener('click', () => {
            const filter = folder.dataset.filter;
            updateFilterUI(filter);

            // Close menu
            mainMenu.classList.remove('active');
        });
    });
}

// Unified Filter Updater (Syncs tabs and logical state)
function updateFilterUI(filterName) {
    // 1. Update State
    currentFilter = filterName.toLowerCase();

    // 2. Update Horizontal Tabs (if matches)
    document.querySelectorAll('.filter-tab').forEach(t => {
        if (t.innerText.toLowerCase() === currentFilter) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    // 3. Re-render Chat List
    renderChatList();
}


// 5. Theme Toggle
function initThemeToggle() {
    const toggleItem = document.getElementById('theme-toggle');
    const themeIndicator = document.getElementById('theme-indicator');

    // Load saved theme
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

        // Save theme preference
        localStorage.setItem('xcord_theme', isLightTheme ? 'light' : 'dark');
    });
}


// 6. Rendering Chat List (Same as before)
function renderChatList() {
    const chatListContainer = document.querySelector('.chat-list-content');
    if (!chatListContainer) return;

    let filteredChats = CHATS;
    if (currentFilter !== 'all') {
        filteredChats = CHATS.filter(chat => chat.folder === currentFilter || chat.type === currentFilter);
    }

    const pinnedChats = filteredChats.filter(c => c.pinned);
    const regularChats = filteredChats.filter(c => !c.pinned);

    chatListContainer.innerHTML = '';

    if (pinnedChats.length > 0) {
        const pinnedHeader = document.createElement('div');
        pinnedHeader.className = 'list-section-header';
        pinnedHeader.innerHTML = `<i data-lucide="pin" width="12" height="12"></i> <span>Pinned</span>`;
        chatListContainer.appendChild(pinnedHeader);
        pinnedChats.forEach(chat => chatListContainer.appendChild(createChatItem(chat)));

        const divider = document.createElement('div');
        divider.className = 'list-divider';
        chatListContainer.appendChild(divider);
    }

    regularChats.forEach(chat => chatListContainer.appendChild(createChatItem(chat)));
    initIcons();
}

function createChatItem(chat) {
    const item = document.createElement('div');
    item.className = `chat-item ${chat.id === activeChatId ? 'active' : ''}`;
    item.onclick = () => {
        activeChatId = chat.id;
        renderChatList();
        renderChat(chat);
    };

    let avatarImg = `<img src="${chat.avatar}" alt="Avatar" class="avatar" style="object-fit:cover; object-position:${chat.avatarPos || 'center'}">`;

    item.innerHTML = `
        <div class="avatar-wrapper">
            ${avatarImg}
            <div class="status-indicator ${chat.unread > 0 ? 'online' : 'dnd'}"></div>
        </div>
        <div class="chat-info">
            <div class="chat-name-row">
                <span class="chat-name">${chat.name}</span>
                <span class="chat-time">${chat.time}</span>
            </div>
            <div class="chat-preview">
                <span class="preview-text">${chat.messages[chat.messages.length - 1]?.text || 'No messages'}</span>
                ${chat.unread > 0 ? `<div class="unread-badge">${chat.unread}</div>` : ''}
            </div>
        </div>
    `;
    return item;
}

// 7. Rendering Main Chat
function renderChat(chat) {
    if (!chat) return;

    document.querySelector('.header-text h3').innerText = chat.name;
    document.querySelector('.header-status').innerText = chat.type === 'channel' ? '1.2M subscribers' : 'last seen recently';

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
}

function initProfileToggle() {
    const toggleBtn = document.getElementById('toggle-profile');
    const profileSidebar = document.getElementById('profile-sidebar');
    if (!toggleBtn || !profileSidebar) return;
    toggleBtn.addEventListener('click', () => {
        profileSidebar.classList.toggle('active');
    });
}

// Profile Modal Functions - iOS 26 Glass
function initProfileModal() {
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('profile-close');
    const menuProfileBtn = document.getElementById('menu-open-profile');

    // Open from menu button
    menuProfileBtn?.addEventListener('click', () => {
        openProfile();
        document.getElementById('main-menu').classList.remove('active'); // Close menu
    });

    // Open profile with Ctrl+P
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            openProfile();
        }
    });

    // Track if user is dragging
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Detect drag start
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
    
    // Close handlers
    closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfile();
    });
    
    // Close only when clicking on overlay, NOT during drag
    modal?.addEventListener('click', (e) => {
        // Don't close if user was dragging
        if (isDragging) {
            isDragging = false;
            return;
        }
        
        // Don't close if clicking on profile card or its children
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
        // Update display and re-init icons
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

