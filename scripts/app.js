// Xcord логика работы

// Состояние
let currentFilter = 'all';
let activeChatId = CHATS[0].id; // по дефолту
let isLightTheme = false; // состояние темы

// Только если main.js еще не инициализировал
if (typeof APP_STATE === 'undefined' || !APP_STATE.initialized) {
    document.addEventListener('DOMContentLoaded', () => {
        initIcons();
        initBurgerMenu();
        initTabs();
        initProfileToggle();
        initThemeToggle();
        initFolderMenu();

        // Профиль система
        initProfileModal();
        initImageCropEditor();
        initFileUploads();

        // Настройки система
        if (typeof loadSettings === 'function') {
            loadSettings();
        }
        if (typeof initSettingsModal === 'function') {
            initSettingsModal();
        }

        // Первый рендер
        renderChatList();
        const activeChat = CHATS.find(c => c.id === activeChatId);
        if (activeChat) {
            renderChat(activeChat);
        }
    });
}

// 1. Иконки
function initIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// 2. Бургер меню
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

// 3. Табы (Горизонтальные) Логика - Glass iOS 26 Фильтр
function initTabs() {
    const tabs = document.querySelectorAll('.filter-tab');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const filterType = tab.dataset.filter;
            updateFilterUI(filterType);
        });
    });
}

// 4. Меню папок (выпадающее) Логика
function initFolderMenu() {
    const folders = document.querySelectorAll('.folder-select');
    const mainMenu = document.getElementById('main-menu');

    folders.forEach(folder => {
        folder.addEventListener('click', () => {
            const filter = folder.dataset.filter;
            updateFilterUI(filter);

            // Закрыть меню
            mainMenu.classList.remove('active');
        });
    });
}

// Объединенный обновлятор фильтра (синхронизирует табы и логическое состояние)
function updateFilterUI(filterType) {
    // 1. Обновляем состояние
    currentFilter = filterType;

    // 2. Обновляем горизонтальные табы
    document.querySelectorAll('.filter-tab').forEach(t => {
        if (t.dataset.filter === filterType) {
            t.classList.add('active');
        } else {
            t.classList.remove('active');
        }
    });

    // 3. Перерисовываем список чатов
    renderChatList();
}


// 5. Переключатель темы
function initThemeToggle() {
    const toggleItem = document.getElementById('theme-toggle');
    const themeIndicator = document.getElementById('theme-indicator');

    // Загрузить сохраненную тему
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

        // Сохранить выбор темы
        localStorage.setItem('xcord_theme', isLightTheme ? 'light' : 'dark');
    });
}


// 6. Рендеринг списка чатов с фильтрацией как в Telegram
function renderChatList() {
    const chatListContainer = document.querySelector('.chat-list-content');
    if (!chatListContainer) return;

    let filteredChats = [...CHATS];
    
    // Фильтруем по текущему фильтру (стиль Telegram)
    if (currentFilter === 'personal') {
        filteredChats = filteredChats.filter(chat => chat.type === 'personal');
    } else if (currentFilter === 'groups') {
        filteredChats = filteredChats.filter(chat => chat.type === 'group' || chat.type === 'groups');
    } else if (currentFilter === 'channels') {
        filteredChats = filteredChats.filter(chat => chat.type === 'channel' || chat.type === 'channels' || chat.type === 'group');
    }
    // 'all' показывает всё

    // Сортируем по последним (время последнего сообщения)
    filteredChats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

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

// 7. Рендеринг главного чата
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

// Профиль модальные функции - iOS 26 Glass
function initProfileModal() {
    const modal = document.getElementById('profile-modal');
    const closeBtn = document.getElementById('profile-close');
    const menuProfileBtn = document.getElementById('menu-open-profile');

    // Открыть из кнопки меню
    menuProfileBtn?.addEventListener('click', () => {
        openProfile();
        document.getElementById('main-menu').classList.remove('active'); // Закрыть меню
    });

    // Открыть профиль с Ctrl+P
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            openProfile();
        }
    });

    // Отслеживаем если пользователь тянет
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    // Определяем начало перетаскивания
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
    
    // Закрыть обработчики
    closeBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        closeProfile();
    });
    
    // Закрыть только при клике на оверлей, НЕ во время перетаскивания
    modal?.addEventListener('click', (e) => {
        // Не закрывать если пользователь перетаскивал
        if (isDragging) {
            isDragging = false;
            return;
        }
        
        // Не закрывать если кликнули на профиль карточку или её детей
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
        // Обновить отображение и перезагрузить иконки
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

