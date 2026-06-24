
document.addEventListener('DOMContentLoaded', () => {
    initThemeSettings();
});

function initThemeSettings() {
    const themeRadios = document.querySelectorAll('input[name=\"theme-select\"]');
    const createBtn = document.getElementById('create-theme-btn');
    const saveBtn = document.getElementById('save-theme');
    const deleteBtn = document.getElementById('delete-theme');
    const themeWallpaperInput = document.getElementById('theme-wallpaper-upload');
    const themeBlurSlider = document.getElementById('theme-wallpaper-blur');
    const themeBlurValue = document.getElementById('theme-wallpaper-blur-value');

    themeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            applyTheme(radio.value);
        });
    });

    createBtn?.addEventListener('click', () => {
        const themeId = createCustomTheme('Custom Theme');
        if (themeId) {
            applyTheme(themeId);
            updateCustomSlotLabels();
            initIcons();
        }
    });

    saveBtn?.addEventListener('click', () => {
        const slotIndex = parseInt(document.getElementById('theme-slot-index')?.value);
        if (slotIndex < 0 || slotIndex >= 5) return;

        const updates = {
            name: document.getElementById('theme-name')?.value || 'Custom Theme',
            colors: {
                bgPrimary: document.getElementById('theme-bgPrimary')?.value,
                bgSecondary: document.getElementById('theme-bgSecondary')?.value,
                accentPrimary: document.getElementById('theme-accentPrimary')?.value
            },
            wallpaperBlur: parseInt(document.getElementById('theme-wallpaper-blur')?.value || 0)
        };

        updateCustomTheme(slotIndex, updates);
        updateCustomSlotLabels();

        saveBtn.innerHTML = '<i data-lucide=\"check\"></i> Сохранено!';
        initIcons();
        setTimeout(() => {
            saveBtn.innerHTML = '<i data-lucide=\"check\"></i> Сохранить тему';
            initIcons();
        }, 2000);
    });

    deleteBtn?.addEventListener('click', () => {
        const slotIndex = parseInt(document.getElementById('theme-slot-index')?.value);
        if (confirm('Удалить эту тему?')) {
            deleteCustomTheme(slotIndex);
            updateCustomSlotLabels();
        }
    });

    themeWallpaperInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const slotIndex = parseInt(document.getElementById('theme-slot-index')?.value);
                updateCustomTheme(slotIndex, { wallpaper: event.target.result });
            };
            reader.readAsDataURL(file);
        }
    });

    themeBlurSlider?.addEventListener('input', () => {
        themeBlurValue.textContent = `${themeBlurSlider.value}px`;
    });

    updateCustomSlotLabels();
}

function updateCustomSlotLabels() {
    THEME_SLOTS.custom.forEach((theme, index) => {
        const label = document.querySelector(`#custom-slot-${index} .theme-name`);
        if (label) {
            label.textContent = theme ? theme.name : `[Пустой слот ${index + 1}]`;
        }

        const radio = document.querySelector(`#custom-slot-${index} input`);
        if (radio) {
            radio.disabled = !theme;
        }
    });
}
