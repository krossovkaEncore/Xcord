// сиситема настроек вообще то
const SETTINGS_DATA = {
    // цвета типо
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6',
    messageColor: '#6366f1',
    
    // обои для чата
    chatWallpaper: '',
    wallpaperBlur: 0,
    
    // эффект стеклышка
    glassOpacity: 70,
    glassBlur: 30,
    
    // интерфейс
    interfaceScale: 100,
    enableAnimations: true,
    enableHoverEffects: true,
    enableGlowEffects: true,
    
    // тема светлая или темная
    themeMode: 'dark'
};

function loadSettings() {
    const saved = localStorage.getItem('xcord_settings');
    if (saved) {
        Object.assign(SETTINGS_DATA, JSON.parse(saved));
        applySettings();
    }
}

function saveSettings() {
    localStorage.setItem('xcord_settings', JSON.stringify(SETTINGS_DATA));
}

function applySettings() {
    // цвета
    document.documentElement.style.setProperty('--accent-primary', SETTINGS_DATA.primaryColor);
    document.documentElement.style.setProperty('--accent-secondary', SETTINGS_DATA.secondaryColor);
    document.documentElement.style.setProperty('--message-color', SETTINGS_DATA.messageColor);
    
    // тема
    applyThemeMode(SETTINGS_DATA.themeMode);
    
    // обои
    applyWallpaper();
    
    // стекло 
    applyGlassEffects();
    
    // масштаб интерфейса
    document.body.style.transform = `scale(${SETTINGS_DATA.interfaceScale / 100})`;
    document.body.style.transformOrigin = 'top left';
    
    // анимки включаем
    document.body.style.setProperty('--enable-animations', SETTINGS_DATA.enableAnimations ? '1' : '0');
    document.body.style.setProperty('--enable-hover', SETTINGS_DATA.enableHoverEffects ? '1' : '0');
    document.body.style.setProperty('--enable-glow', SETTINGS_DATA.enableGlowEffects ? '1' : '0');
}

function applyThemeMode(mode) {
    const body = document.body;
    if (mode === 'light') {
        // светлая тема включаем
        body.classList.add('theme-light');
        body.classList.remove('theme-dark');
    } else {
        // темная тема
        body.classList.add('theme-dark');
        body.classList.remove('theme-light');
    }
}

function applyWallpaper() {
    const messagesContainer = document.querySelector('.messages-container');
    if (!messagesContainer) return;
    
    if (SETTINGS_DATA.chatWallpaper) {
        // если обои есть то создаем элемент
        let wallpaper = document.getElementById('chat-wallpaper');
        if (!wallpaper) {
            wallpaper = document.createElement('div');
            wallpaper.id = 'chat-wallpaper';
            wallpaper.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: -1;
                pointer-events: none;
            `;
            messagesContainer.style.position = 'relative';
            messagesContainer.insertBefore(wallpaper, messagesContainer.firstChild);
        }
        
        wallpaper.style.backgroundImage = `url(${SETTINGS_DATA.chatWallpaper})`;
        wallpaper.style.backgroundSize = 'cover';
        wallpaper.style.backgroundPosition = 'center';
        wallpaper.style.filter = `blur(${SETTINGS_DATA.wallpaperBlur}px)`;
    } else {
        // если нет обоев удаляем
        const wallpaper = document.getElementById('chat-wallpaper');
        if (wallpaper) wallpaper.remove();
    }
}

function applyGlassEffects() {
    // эффект стекла применяем
    document.documentElement.style.setProperty('--glass-opacity', `${SETTINGS_DATA.glassOpacity}%`);
    document.documentElement.style.setProperty('--glass-blur', `${SETTINGS_DATA.glassBlur}px`);
    // тоже применяем к body для быстрого эффекта
    document.body.style.setProperty('--glass-blur', `${SETTINGS_DATA.glassBlur}px`);
}

function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings');
    const closeBtn = document.getElementById('settings-close');
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');
    
    // открыть настройки
    openBtn?.addEventListener('click', () => {
        modal?.classList.add('active');
        loadSettingsToUI();
        document.getElementById('main-menu').classList.remove('active');
        initIcons();
    });
    
    // закрыть настройки
    closeBtn?.addEventListener('click', () => {
        modal?.classList.remove('active');
    });
    
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });
    
    // навигация по вкладкам
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`)?.classList.add('active');
        });
    });
    
    // === ПРЕСЕТЫ ЦВЕТОВ ===
    const colorPresets = document.querySelectorAll('.color-preset');
    colorPresets.forEach(preset => {
        preset.addEventListener('click', () => {
            const primary = preset.dataset.primary;
            const secondary = preset.dataset.secondary;
            
            SETTINGS_DATA.primaryColor = primary;
            SETTINGS_DATA.secondaryColor = secondary;
            SETTINGS_DATA.messageColor = primary;
            
            document.getElementById('primary-color').value = primary;
            document.getElementById('secondary-color').value = secondary;
            
            applySettings();
            saveSettings();
            
            colorPresets.forEach(p => p.classList.remove('active'));
            preset.classList.add('active');
        });
    });
    
    // === КАСТОМНЫЕ ВЫБОР ЦВЕТОВ ===
    const primaryColorPicker = document.getElementById('primary-color');
    const secondaryColorPicker = document.getElementById('secondary-color');
    
    primaryColorPicker?.addEventListener('input', (e) => {
        SETTINGS_DATA.primaryColor = e.target.value;
        SETTINGS_DATA.messageColor = e.target.value;
        applySettings();
        saveSettings();
        
        colorPresets.forEach(p => p.classList.remove('active'));
    });
    
    secondaryColorPicker?.addEventListener('input', (e) => {
        SETTINGS_DATA.secondaryColor = e.target.value;
        applySettings();
        saveSettings();
        
        colorPresets.forEach(p => p.classList.remove('active'));
    });
    
    // === ОБОИ ===
    const wallpaperUpload = document.getElementById('chat-wallpaper-upload');
    const wallpaperClear = document.getElementById('chat-wallpaper-clear');
    const wallpaperBlur = document.getElementById('wallpaper-blur');
    const wallpaperBlurValue = document.getElementById('wallpaper-blur-value');
    
    wallpaperUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                SETTINGS_DATA.chatWallpaper = event.target.result;
                applySettings();
                saveSettings();
            };
            reader.readAsDataURL(file);
        }
    });
    
    wallpaperClear?.addEventListener('click', () => {
        SETTINGS_DATA.chatWallpaper = '';
        applySettings();
        saveSettings();
        wallpaperUpload.value = '';
    });
    
    wallpaperBlur?.addEventListener('input', (e) => {
        SETTINGS_DATA.wallpaperBlur = parseInt(e.target.value);
        wallpaperBlurValue.textContent = e.target.value;
        applySettings();
        saveSettings();
    });
    
    // === ЭФФЕКТ СТЕКЛА ===
    const glassOpacity = document.getElementById('glass-opacity');
    const glassOpacityValue = document.getElementById('glass-opacity-value');
    const glassBlur = document.getElementById('glass-blur');
    const glassBlurValue = document.getElementById('glass-blur-value');
    
    glassOpacity?.addEventListener('input', (e) => {
        SETTINGS_DATA.glassOpacity = parseInt(e.target.value);
        glassOpacityValue.textContent = e.target.value;
        applyGlassEffects();
        saveSettings();
    });
    
    glassBlur?.addEventListener('input', (e) => {
        SETTINGS_DATA.glassBlur = parseInt(e.target.value);
        glassBlurValue.textContent = e.target.value;
        applyGlassEffects();
        saveSettings();
    });
    
    // === АНИМАЦИИ ===
    const enableAnimations = document.getElementById('enable-animations');
    const enableHoverEffects = document.getElementById('enable-hover-effects');
    const enableGlowEffects = document.getElementById('enable-glow-effects');
    
    enableAnimations?.addEventListener('change', (e) => {
        SETTINGS_DATA.enableAnimations = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    enableHoverEffects?.addEventListener('change', (e) => {
        SETTINGS_DATA.enableHoverEffects = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    enableGlowEffects?.addEventListener('change', (e) => {
        SETTINGS_DATA.enableGlowEffects = e.target.checked;
        applySettings();
        saveSettings();
    });
    
    // === МАСШТАБ ИНТЕРФЕЙСА ===
    const interfaceScale = document.getElementById('interface-scale');
    const interfaceScaleValue = document.getElementById('interface-scale-value');
    
    interfaceScale?.addEventListener('input', (e) => {
        SETTINGS_DATA.interfaceScale = parseInt(e.target.value);
        interfaceScaleValue.textContent = e.target.value;
        applySettings();
        saveSettings();
    });
    
    // === ТЕМЫ ===
    const themeOptions = document.querySelectorAll('.theme-option input');
    themeOptions.forEach(option => {
        option.addEventListener('change', (e) => {
            if (e.target.value === 'builtin.light') {
                SETTINGS_DATA.themeMode = 'light';
                SETTINGS_DATA.primaryColor = '#3b82f6';
                SETTINGS_DATA.secondaryColor = '#06b6d4';
            } else {
                SETTINGS_DATA.themeMode = 'dark';
                SETTINGS_DATA.primaryColor = '#6366f1';
                SETTINGS_DATA.secondaryColor = '#8b5cf6';
            }
            document.getElementById('primary-color').value = SETTINGS_DATA.primaryColor;
            document.getElementById('secondary-color').value = SETTINGS_DATA.secondaryColor;
            applySettings();
            loadSettingsToUI();
            saveSettings();
        });
    });
}

function loadSettingsToUI() {
    // Цвета
    document.getElementById('primary-color').value = SETTINGS_DATA.primaryColor;
    document.getElementById('secondary-color').value = SETTINGS_DATA.secondaryColor;
    
    // Обои
    document.getElementById('wallpaper-blur').value = SETTINGS_DATA.wallpaperBlur;
    document.getElementById('wallpaper-blur-value').textContent = `${SETTINGS_DATA.wallpaperBlur}px`;
    
    // Эффект стекла
    document.getElementById('glass-opacity').value = SETTINGS_DATA.glassOpacity;
    document.getElementById('glass-opacity-value').textContent = SETTINGS_DATA.glassOpacity;
    document.getElementById('glass-blur').value = SETTINGS_DATA.glassBlur;
    document.getElementById('glass-blur-value').textContent = SETTINGS_DATA.glassBlur;
    
    // Анимации
    document.getElementById('enable-animations').checked = SETTINGS_DATA.enableAnimations;
    document.getElementById('enable-hover-effects').checked = SETTINGS_DATA.enableHoverEffects;
    document.getElementById('enable-glow-effects').checked = SETTINGS_DATA.enableGlowEffects;
    
    // Масштаб
    document.getElementById('interface-scale').value = SETTINGS_DATA.interfaceScale;
    document.getElementById('interface-scale-value').textContent = SETTINGS_DATA.interfaceScale;
}