// Settings System
const SETTINGS_DATA = {
    messageColor: '#af1d1d',
    chatWallpaper: '',
    wallpaperBlur: 0,
    primaryColor: '#af1d1d',
    secondaryColor: '#8b1515'
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
    // Apply primary color
    document.documentElement.style.setProperty('--accent-primary', SETTINGS_DATA.primaryColor);

    // Apply secondary color
    document.documentElement.style.setProperty('--accent-secondary', SETTINGS_DATA.secondaryColor);

    // Apply message color (for future use)
    document.documentElement.style.setProperty('--message-color', SETTINGS_DATA.messageColor);

    // Apply chat wallpaper with separate background layer
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer && SETTINGS_DATA.chatWallpaper) {
        // Create or update wallpaper element
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
        // Remove wallpaper if no image
        const wallpaper = document.getElementById('chat-wallpaper');
        if (wallpaper) wallpaper.remove();
    }
}

function initSettingsModal() {
    const modal = document.getElementById('settings-modal');
    const openBtn = document.getElementById('open-settings');
    const closeBtn = document.getElementById('settings-close');
    const navItems = document.querySelectorAll('.settings-nav-item');
    const sections = document.querySelectorAll('.settings-section');

    // Open settings
    openBtn?.addEventListener('click', () => {
        modal?.classList.add('active');
        loadSettingsToUI();
        document.getElementById('main-menu').classList.remove('active');
        initIcons();
    });

    // Close settings
    closeBtn?.addEventListener('click', () => {
        modal?.classList.remove('active');
    });

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;

            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${section}`)?.classList.add('active');
        });
    });

    // Save appearance settings
    const saveAppearanceBtn = document.getElementById('save-appearance');
    saveAppearanceBtn?.addEventListener('click', () => {
        SETTINGS_DATA.messageColor = document.getElementById('message-color').value;
        SETTINGS_DATA.primaryColor = document.getElementById('primary-color').value;
        SETTINGS_DATA.secondaryColor = document.getElementById('secondary-color').value;
        SETTINGS_DATA.wallpaperBlur = parseInt(document.getElementById('wallpaper-blur').value);

        applySettings();
        saveSettings();

        saveAppearanceBtn.innerHTML = '<i data-lucide="check"></i> Сохранено!';
        initIcons();
        setTimeout(() => {
            saveAppearanceBtn.innerHTML = '<i data-lucide="check"></i> Сохранить изменения';
            initIcons();
        }, 2000);
    });

    // Wallpaper blur slider
    const blurSlider = document.getElementById('wallpaper-blur');
    const blurValue = document.getElementById('wallpaper-blur-value');
    blurSlider?.addEventListener('input', () => {
        blurValue.textContent = `${blurSlider.value}px`;
    });

    // Wallpaper upload
    const wallpaperInput = document.getElementById('chat-wallpaper-upload');
    wallpaperInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                SETTINGS_DATA.chatWallpaper = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn?.addEventListener('click', () => {
        if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
            localStorage.clear();
            window.location.reload();
        }
    });
}

function loadSettingsToUI() {
    document.getElementById('message-color').value = SETTINGS_DATA.messageColor;
    document.getElementById('primary-color').value = SETTINGS_DATA.primaryColor;
    document.getElementById('secondary-color').value = SETTINGS_DATA.secondaryColor;
    document.getElementById('wallpaper-blur').value = SETTINGS_DATA.wallpaperBlur;
    document.getElementById('wallpaper-blur-value').textContent = `${SETTINGS_DATA.wallpaperBlur}px`;
}
