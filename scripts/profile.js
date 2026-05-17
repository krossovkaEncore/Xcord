// ============================================
// Профиль система даных - iOS 26 Glass стиль
// ============================================

const PROFILE_DATA = {
    username: 'Ilya Krossov',
    realName: 'Илья',
    showRealName: true,
    location: 'Россия, Москва',
    showLocation: true,
    bio: 'Привет! Я создатель Xcord — децентрализованного мессенджера. Увлекаюсь программированием, AI и созданием интересных проектов. 🎮💻',
    avatar: 'assets/avatars/default_set.png',
    backgroundGif: '',
    media: '',
    additionalText: '',
    showComments: true,
    
    // iOS 26 Glass настройки
    glassOpacity: 70,
    glassColor: '#1a1a2e',
    glassMode: 'frosted', // 'frosted' или 'tinted'
    
    status: 'online' // online, offline, ingame
};

// Пример комментов данные
const PROFILE_COMMENTS = [
    { id: 1, author: 'Alex', avatar: '', text: 'Крутой проект! Удачи с разработкой 🚀', time: '2 часа назад' },
    { id: 2, author: 'Maria', avatar: '', text: 'Очень красивый интерфейс', time: 'Вчера' },
    { id: 3, author: 'Nikita', avatar: '', text: 'Жду с нетерпением!', time: '3 дня назад' }
];

// ============================================
// Функции сохранения
// ============================================

function saveProfileData() {
    localStorage.setItem('xcord_profile', JSON.stringify(PROFILE_DATA));
}

function loadProfileData() {
    const saved = localStorage.getItem('xcord_profile');
    if (saved) {
        Object.assign(PROFILE_DATA, JSON.parse(saved));
    }
}

// ============================================
// Обновить профиль отображение - iOS 26 Glass
// ============================================

function updateProfileDisplay() {
    // Имя юзера
    const nameEl = document.getElementById('profile-name');
    if (nameEl) nameEl.textContent = PROFILE_DATA.username;

    // Аватарка
    const avatarEl = document.getElementById('profile-avatar');
    if (avatarEl && PROFILE_DATA.avatar) {
        avatarEl.src = PROFILE_DATA.avatar;
    }

    // Реальное имя
    const realNameEl = document.getElementById('profile-realname');
    if (realNameEl) {
        realNameEl.textContent = PROFILE_DATA.realName;
        realNameEl.style.display = PROFILE_DATA.showRealName ? 'block' : 'none';
    }

    // Локация
    const locationEl = document.getElementById('profile-location');
    if (locationEl) {
        const locationSpan = locationEl.querySelector('span');
        if (locationSpan) locationSpan.textContent = PROFILE_DATA.location;
        locationEl.style.display = PROFILE_DATA.showLocation ? 'flex' : 'none';
    }

    // Био с сворачиванием
    const bioEl = document.getElementById('profile-bio');
    const bioExpandBtn = document.getElementById('profile-bio-expand');
    if (bioEl) {
        bioEl.textContent = PROFILE_DATA.bio || 'Нажми редактировать, чтобы добавить описание...';
        
        // проверяем если био длинное надо свернуть (>7 строк примерно ~280 символов)
        if (PROFILE_DATA.bio && PROFILE_DATA.bio.length > 280) {
            bioEl.classList.add('collapsed');
            if (bioExpandBtn) bioExpandBtn.style.display = 'block';
        } else {
            bioEl.classList.remove('collapsed');
            if (bioExpandBtn) bioExpandBtn.style.display = 'none';
        }
    }

    // Секция медиа
    const mediaSection = document.getElementById('profile-media-section');
    const mediaContent = document.getElementById('profile-media-content');
    const mediaVideo = document.getElementById('profile-media-video');
    
    if (mediaSection && PROFILE_DATA.media) {
        mediaSection.style.display = 'block';
        if (PROFILE_DATA.media.endsWith('.mp4') || PROFILE_DATA.media.endsWith('.webm')) {
            if (mediaContent) mediaContent.style.display = 'none';
            if (mediaVideo) {
                mediaVideo.src = PROFILE_DATA.media;
                mediaVideo.style.display = 'block';
            }
        } else {
            if (mediaVideo) mediaVideo.style.display = 'none';
            if (mediaContent) {
                mediaContent.src = PROFILE_DATA.media;
                mediaContent.style.display = 'block';
            }
        }
    } else if (mediaSection) {
        mediaSection.style.display = 'none';
    }

    // Доп текст
    const additionalSection = document.getElementById('profile-additional-section');
    const additionalText = document.getElementById('profile-additional-text');
    if (additionalSection && PROFILE_DATA.additionalText) {
        additionalSection.style.display = 'block';
        if (additionalText) additionalText.textContent = PROFILE_DATA.additionalText;
    } else if (additionalSection) {
        additionalSection.style.display = 'none';
    }

    // Индикатор статуса
    const statusDot = document.getElementById('profile-status-dot');
    if (statusDot) {
        statusDot.className = 'profile-status-indicator ' + PROFILE_DATA.status;
    }

    // Фоновое GIF
    const bgGif = document.getElementById('profile-bg-gif');
    if (bgGif && PROFILE_DATA.backgroundGif) {
        bgGif.src = PROFILE_DATA.backgroundGif;
        bgGif.style.display = 'block';
    } else if (bgGif) {
        bgGif.style.display = 'none';
    }

    // Применяем iOS 26 Glass настройки
    applyGlassSettings();
    
    // Обновляем комменты
    updateCommentsDisplay();
}

function applyGlassSettings() {
    const card = document.getElementById('profile-card');
    if (!card) return;
    
    // Применяем прозрачность
    const opacity = PROFILE_DATA.glassOpacity / 100;
    const glassColor = PROFILE_DATA.glassColor;
    
    // Конвертируем hex в rgba
    const r = parseInt(glassColor.slice(1, 3), 16);
    const g = parseInt(glassColor.slice(3, 5), 16);
    const b = parseInt(glassColor.slice(5, 7), 16);
    
    if (PROFILE_DATA.glassMode === 'frosted') {
        card.classList.remove('glass-tinted');
        card.classList.add('glass-frosted');
        card.style.background = `rgba(${r}, ${g}, ${b}, ${opacity})`;
    } else {
        card.classList.remove('glass-frosted');
        card.classList.add('glass-tinted');
        card.style.background = `rgba(${r}, ${g}, ${b}, ${opacity + 0.15})`;
    }
}

function updateCommentsDisplay() {
    const commentsList = document.getElementById('profile-comments-list');
    const commentsCount = document.getElementById('profile-comments-count');
    const commentsSection = document.getElementById('profile-comments-section');
    
    if (!commentsSection) return;
    
    // если комменты скрыты то не показываем
    if (!PROFILE_DATA.showComments) {
        commentsSection.style.display = 'none';
        return;
    }

    commentsSection.style.display = 'block';
    
    if (commentsCount) {
        commentsCount.textContent = PROFILE_COMMENTS.length;
    }
    
    if (commentsList) {
        commentsList.innerHTML = PROFILE_COMMENTS.map(comment => `
            <div class="profile-comment">
                <div class="profile-comment-header">
                    <img src="${comment.avatar || 'assets/avatars/default_set.png'}" alt="" class="profile-comment-avatar">
                    <span class="profile-comment-author">${comment.author}</span>
                    <span class="profile-comment-time">${comment.time}</span>
                </div>
                <p class="profile-comment-text">${comment.text}</p>
            </div>
        `).join('');
    }
}

// ============================================
// Кнопка развернуть био функция
// ============================================

function initBioExpand() {
    const expandBtn = document.getElementById('profile-bio-expand');
    const bioEl = document.getElementById('profile-bio');
    
    if (expandBtn && bioEl) {
        expandBtn.addEventListener('click', () => {
            bioEl.classList.toggle('collapsed');
            expandBtn.textContent = bioEl.classList.contains('collapsed') ? 'Развернуть' : 'Свернуть';
        });
    }
}

// ============================================
// Функции редактора
// ============================================

function initProfileEditor() {
    const editor = document.getElementById('profile-editor');
    const editToggle = document.getElementById('profile-edit-toggle');
    const saveBtn = document.getElementById('editor-save');
    
    // Переключить редактор
    editToggle?.addEventListener('click', () => {
        editor.classList.toggle('active');
        if (editor.classList.contains('active')) {
            loadEditorValues();
        }
    });
    
    // Кнопка сохранить
    saveBtn?.addEventListener('click', () => {
        saveEditorValues();
        editor.classList.remove('active');
    });
    
    // Живой предпросмотр для имени юзера
    const usernameInput = document.getElementById('editor-username');
    usernameInput?.addEventListener('input', (e) => {
        const nameEl = document.getElementById('profile-name');
        if (nameEl) nameEl.textContent = e.target.value || 'Username';
    });
    
    // Живой предпросмотр для реального имени
    const realNameInput = document.getElementById('editor-realname');
    realNameInput?.addEventListener('input', (e) => {
        const realNameEl = document.getElementById('profile-realname');
        if (realNameEl) realNameEl.textContent = e.target.value;
    });
    
    // Показать/скрыть реальное имя
    const showRealName = document.getElementById('editor-show-realname');
    showRealName?.addEventListener('change', (e) => {
        const realNameEl = document.getElementById('profile-realname');
        if (realNameEl) realNameEl.style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Показать/скрыть локацию
    const showLocation = document.getElementById('editor-show-location');
    showLocation?.addEventListener('change', (e) => {
        const locationEl = document.getElementById('profile-location');
        if (locationEl) locationEl.style.display = e.target.checked ? 'flex' : 'none';
    });
    
    // Живой предпросмотр для локации
    const locationInput = document.getElementById('editor-location');
    locationInput?.addEventListener('input', (e) => {
        const locationSpan = document.querySelector('#profile-location span');
        if (locationSpan) locationSpan.textContent = e.target.value;
    });
    
    // Живой предпросмотр для био
    const bioInput = document.getElementById('editor-bio');
    bioInput?.addEventListener('input', (e) => {
        const bioEl = document.getElementById('profile-bio');
        const bioExpandBtn = document.getElementById('profile-bio-expand');
        if (bioEl) {
            bioEl.textContent = e.target.value || 'Нажми редактировать, чтобы добавить описание...';
            
            if (e.target.value && e.target.value.length > 280) {
                bioEl.classList.add('collapsed');
                if (bioExpandBtn) bioExpandBtn.style.display = 'block';
            } else {
                bioEl.classList.remove('collapsed');
                if (bioExpandBtn) bioExpandBtn.style.display = 'none';
            }
        }
    });
    
    // Слайдер прозрачности стекла
    const opacitySlider = document.getElementById('editor-opacity');
    const opacityValue = document.getElementById('opacity-value');
    opacitySlider?.addEventListener('input', (e) => {
        if (opacityValue) opacityValue.textContent = e.target.value;
        PROFILE_DATA.glassOpacity = parseInt(e.target.value);
        applyGlassSettings();
    });
    
    // Выбор цвета стекла
    const glassColorPicker = document.getElementById('editor-glass-color');
    glassColorPicker?.addEventListener('input', (e) => {
        PROFILE_DATA.glassColor = e.target.value;
        applyGlassSettings();
    });
    
    // Переключатель режима стекла
    const glassModeBtns = document.querySelectorAll('.editor-toggle-btn');
    glassModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            glassModeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            PROFILE_DATA.glassMode = btn.dataset.glassMode;
            applyGlassSettings();
        });
    });
    
    // Загрузка фонового GIF
    const bgFileInput = document.getElementById('editor-bg-file');
    bgFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                PROFILE_DATA.backgroundGif = event.target.result;
                const bgGif = document.getElementById('profile-bg-gif');
                if (bgGif) {
                    bgGif.src = PROFILE_DATA.backgroundGif;
                    bgGif.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Очистить фон
    const bgClearBtn = document.getElementById('editor-bg-clear');
    bgClearBtn?.addEventListener('click', () => {
        PROFILE_DATA.backgroundGif = '';
        const bgGif = document.getElementById('profile-bg-gif');
        if (bgGif) bgGif.style.display = 'none';
    });
    
    // Загрузка аватарки
    const avatarFileInput = document.getElementById('editor-avatar-file');
    avatarFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                PROFILE_DATA.avatar = event.target.result;
                const avatarEl = document.getElementById('profile-avatar');
                if (avatarEl) avatarEl.src = PROFILE_DATA.avatar;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Загрузка медиа
    const mediaFileInput = document.getElementById('editor-media-file');
    mediaFileInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                PROFILE_DATA.media = event.target.result;
                updateProfileDisplay();
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Очистить медиа
    const mediaClearBtn = document.getElementById('editor-media-clear');
    mediaClearBtn?.addEventListener('click', () => {
        PROFILE_DATA.media = '';
        updateProfileDisplay();
    });
    
    // Доп текст
    const additionalInput = document.getElementById('editor-additional');
    additionalInput?.addEventListener('input', (e) => {
        PROFILE_DATA.additionalText = e.target.value;
        updateProfileDisplay();
    });
}

function loadEditorValues() {
    document.getElementById('editor-username').value = PROFILE_DATA.username;
    document.getElementById('editor-realname').value = PROFILE_DATA.realName;
    document.getElementById('editor-show-realname').checked = PROFILE_DATA.showRealName;
    document.getElementById('editor-location').value = PROFILE_DATA.location;
    document.getElementById('editor-show-location').checked = PROFILE_DATA.showLocation;
    document.getElementById('editor-bio').value = PROFILE_DATA.bio;
    document.getElementById('editor-additional').value = PROFILE_DATA.additionalText;
    document.getElementById('editor-opacity').value = PROFILE_DATA.glassOpacity;
    document.getElementById('opacity-value').textContent = PROFILE_DATA.glassOpacity;
    document.getElementById('editor-glass-color').value = PROFILE_DATA.glassColor;
    
    // Glass mode
    const glassModeBtns = document.querySelectorAll('.editor-toggle-btn');
    glassModeBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.glassMode === PROFILE_DATA.glassMode);
    });
}

function saveEditorValues() {
    PROFILE_DATA.username = document.getElementById('editor-username').value;
    PROFILE_DATA.realName = document.getElementById('editor-realname').value;
    PROFILE_DATA.showRealName = document.getElementById('editor-show-realname').checked;
    PROFILE_DATA.location = document.getElementById('editor-location').value;
    PROFILE_DATA.showLocation = document.getElementById('editor-show-location').checked;
    PROFILE_DATA.bio = document.getElementById('editor-bio').value;
    PROFILE_DATA.additionalText = document.getElementById('editor-additional').value;
    
    saveProfileData();
    updateProfileDisplay();
}

// ============================================
// Инициализация
// ============================================

function initProfile() {
    loadProfileData();
    updateProfileDisplay();
    initProfileEditor();
    initBioExpand();
    
    // Перезагрузить иконки после обновления DOM
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Авто инициализация когда DOM готов
document.addEventListener('DOMContentLoaded', initProfile);
