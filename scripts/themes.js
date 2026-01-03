// Theme System for Xcord
// Allows users to create up to 5 custom themes + 2 built-in themes

const DEFAULT_THEMES = {
    darkRed: {
        name: 'Dark Red',
        colors: {
            bgPrimary: '#1a0a0a',
            bgSecondary: '#0f0505',
            bgTertiary: '#2b0a0a',
            bgModifierHover: 'rgba(175, 29, 29, 0.1)',
            bgModifierActive: 'rgba(175, 29, 29, 0.2)',
            textNormal: '#dcddde',
            textMuted: '#96989d',
            headerPrimary: '#ffffff',
            accentPrimary: '#af1d1d',
            accentSecondary: '#8b1515',
            accentHover: '#c92020'
        },
        wallpaper: '',
        wallpaperBlur: 0
    },
    light: {
        name: 'Light',
        colors: {
            bgPrimary: '#a8a8a8',
            bgSecondary: '#959595',
            bgTertiary: '#7a7a7a',
            bgModifierHover: 'rgba(0, 0, 0, 0.1)',
            bgModifierActive: 'rgba(0, 0, 0, 0.15)',
            textNormal: '#2e3338',
            textMuted: '#4f5660',
            headerPrimary: '#060607',
            accentPrimary: '#af1d1d',
            accentSecondary: '#8b1515',
            accentHover: '#c92020'
        },
        wallpaper: '',
        wallpaperBlur: 0
    }
};

let THEME_SLOTS = {
    builtin: DEFAULT_THEMES,
    custom: [null, null, null, null, null], // 5 custom slots
    activeTheme: 'builtin.darkRed'
};

// Load themes from localStorage
function loadThemes() {
    const saved = localStorage.getItem('xcord_themes');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            THEME_SLOTS = { ...THEME_SLOTS, ...parsed };
        } catch (e) {
            console.error('Failed to load themes:', e);
        }
    }
    // Apply the active theme
    applyTheme(THEME_SLOTS.activeTheme);
}

// Save themes to localStorage
function saveThemes() {
    localStorage.setItem('xcord_themes', JSON.stringify(THEME_SLOTS));
}

// Get theme by ID (e.g., 'builtin.darkRed' or 'custom.0')
function getTheme(themeId) {
    const [type, index] = themeId.split('.');
    if (type === 'builtin') {
        return THEME_SLOTS.builtin[index];
    } else if (type === 'custom') {
        return THEME_SLOTS.custom[parseInt(index)];
    }
    return null;
}

// Apply theme to entire interface
function applyTheme(themeId) {
    const theme = getTheme(themeId);
    if (!theme) {
        console.error('Theme not found:', themeId);
        return;
    }

    THEME_SLOTS.activeTheme = themeId;
    saveThemes();

    // Apply all CSS variables
    const root = document.documentElement;
    Object.keys(theme.colors).forEach(key => {
        // Convert camelCase to kebab-case
        const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
        root.style.setProperty(cssVar, theme.colors[key]);
    });

    // Apply wallpaper
    requestAnimationFrame(() => {
        const chatMain = document.querySelector('.chat-main');
        if (!chatMain) return;

        if (theme.wallpaper) {
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
                    z-index: 0;
                    pointer-events: none;
                `;
                chatMain.style.position = 'relative';
                chatMain.insertBefore(wallpaper, chatMain.firstChild);
            }

            wallpaper.style.backgroundImage = `url(${theme.wallpaper})`;
            wallpaper.style.backgroundSize = 'cover';
            wallpaper.style.backgroundPosition = 'center';
            wallpaper.style.filter = `blur(${theme.wallpaperBlur}px)`;

            const messagesContainer = chatMain.querySelector('.messages-container');
            if (messagesContainer) {
                messagesContainer.style.position = 'relative';
                messagesContainer.style.zIndex = '1';
            }
        } else {
            const wallpaper = document.getElementById('chat-wallpaper');
            if (wallpaper) wallpaper.remove();
        }
    });

    // Update UI to reflect active theme
    updateThemeSelectorUI();
}

// Create new custom theme
function createCustomTheme(name = 'Custom Theme') {
    const emptySlot = THEME_SLOTS.custom.findIndex(slot => slot === null);
    if (emptySlot === -1) {
        alert('Максимум 5 кастомных тем!');
        return null;
    }

    const newTheme = {
        name: `${name} ${emptySlot + 1}`,
        colors: { ...DEFAULT_THEMES.darkRed.colors },
        wallpaper: '',
        wallpaperBlur: 0
    };

    THEME_SLOTS.custom[emptySlot] = newTheme;
    saveThemes();
    return `custom.${emptySlot}`;
}

// Update custom theme
function updateCustomTheme(slotIndex, updates) {
    if (slotIndex < 0 || slotIndex >= 5) return;
    if (!THEME_SLOTS.custom[slotIndex]) return;

    THEME_SLOTS.custom[slotIndex] = {
        ...THEME_SLOTS.custom[slotIndex],
        ...updates
    };
    saveThemes();

    // If this is the active theme, reapply
    if (THEME_SLOTS.activeTheme === `custom.${slotIndex}`) {
        applyTheme(THEME_SLOTS.activeTheme);
    }
}

// Delete custom theme
function deleteCustomTheme(slotIndex) {
    if (slotIndex < 0 || slotIndex >= 5) return;

    // If deleting active theme, switch to default
    if (THEME_SLOTS.activeTheme === `custom.${slotIndex}`) {
        applyTheme('builtin.darkRed');
    }

    THEME_SLOTS.custom[slotIndex] = null;
    saveThemes();
    updateThemeSelectorUI();
}

// Update theme selector UI
function updateThemeSelectorUI() {
    // Update radio buttons
    document.querySelectorAll('input[name="theme-select"]').forEach(radio => {
        radio.checked = (radio.value === THEME_SLOTS.activeTheme);
    });

    // Show/hide theme editor
    const isCustom = THEME_SLOTS.activeTheme.startsWith('custom.');
    const editor = document.getElementById('theme-editor');
    if (editor) {
        editor.style.display = isCustom ? 'block' : 'none';
    }

    // Update editor fields if custom theme is active
    if (isCustom) {
        const slotIndex = parseInt(THEME_SLOTS.activeTheme.split('.')[1]);
        const theme = THEME_SLOTS.custom[slotIndex];
        if (theme) {
            loadThemeToEditor(theme, slotIndex);
        }
    }
}

// Load theme into editor
function loadThemeToEditor(theme, slotIndex) {
    document.getElementById('theme-name')?.setAttribute('value', theme.name);
    document.getElementById('theme-slot-index')?.setAttribute('value', slotIndex);

    // Load colors
    Object.keys(theme.colors).forEach(key => {
        const input = document.getElementById(`theme-${key}`);
        if (input) input.value = theme.colors[key];
    });

    document.getElementById('theme-wallpaper-blur')?.setAttribute('value', theme.wallpaperBlur);
    document.getElementById('theme-wallpaper-blur-value')?.textContent = `${theme.wallpaperBlur}px`;
}
