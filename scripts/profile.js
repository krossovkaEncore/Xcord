// Profile System Data
const PROFILE_DATA = {
    username: 'Ilya Krossov',
    level: 12,
    xp: 1250,
    messages: 1125,
    posts: 1,
    avatar: 'assets/avatars/default_set.png',
    background: '',
    backgroundBlur: 0,
    accentColor: '#667eea',
    status: 'Online'
};

// XP Levels (Steam-like progression)
const XP_PER_LEVEL = 100;
const XP_FOR_MESSAGE = 1;
const XP_FOR_POST = 125;

function calculateLevel(xp) {
    return Math.floor(xp / XP_PER_LEVEL) + 1;
}

function getXPProgress(xp) {
    const currentLevelXP = xp % XP_PER_LEVEL;
    return (currentLevelXP / XP_PER_LEVEL) * 100;
}

function addXP(amount) {
    PROFILE_DATA.xp += amount;
    PROFILE_DATA.level = calculateLevel(PROFILE_DATA.xp);
    updateProfileDisplay();

    // Save to localStorage
    saveProfileData();
}

function saveProfileData() {
    localStorage.setItem('xcord_profile', JSON.stringify(PROFILE_DATA));
}

function loadProfileData() {
    const saved = localStorage.getItem('xcord_profile');
    if (saved) {
        Object.assign(PROFILE_DATA, JSON.parse(saved));
    }
}

function updateProfileDisplay() {
    // Update level badge
    document.getElementById('profile-level').textContent = PROFILE_DATA.level;

    // Update XP bar
    const progress = getXPProgress(PROFILE_DATA.xp);
    document.getElementById('xp-bar').style.width = `${progress}%`;

    // Update stats
    document.getElementById('stat-xp').textContent = PROFILE_DATA.xp;
    document.getElementById('stat-messages').textContent = PROFILE_DATA.messages;
    document.getElementById('stat-posts').textContent = PROFILE_DATA.posts;

    // Update username
    document.getElementById('profile-name').textContent = PROFILE_DATA.username;

    // Update avatar
    if (PROFILE_DATA.avatar) {
        document.getElementById('profile-avatar').src = PROFILE_DATA.avatar;
    }

    // Calculate color variations
    const baseColor = PROFILE_DATA.accentColor;
    const lighterColor = adjustColorBrightness(baseColor, 30);
    const darkerColor = adjustColorBrightness(baseColor, -40);
    const veryDarkColor = adjustColorBrightness(baseColor, -60);

    // Update background
    const bgElement = document.getElementById('profile-bg');
    const banner = document.getElementById('profile-banner');
    if (PROFILE_DATA.background) {
        bgElement.src = PROFILE_DATA.background;
        bgElement.style.display = 'block';
        bgElement.style.filter = `blur(${PROFILE_DATA.backgroundBlur}px)`;
        // Apply color as overlay tint
        banner.style.background = `linear-gradient(135deg, ${baseColor}44, ${baseColor}88)`;
    } else {
        bgElement.style.display = 'none';
        // Full vibrant gradient when no image
        banner.style.background = `linear-gradient(135deg, ${baseColor} 0%, ${lighterColor} 50%, ${darkerColor} 100%)`;
    }

    // Apply to profile body background
    const profileBody = document.querySelector('.profile-body');
    if (profileBody) {
        profileBody.style.background = `linear-gradient(to bottom, ${darkerColor}dd 0%, ${veryDarkColor}bb 100%)`;
    }

    // Apply to stat cards
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.background = `linear-gradient(135deg, ${darkerColor}aa, ${veryDarkColor}dd)`;
        card.style.borderColor = `${baseColor}44`;
    });

    // Apply accent color to level badge
    const levelCircle = document.querySelector('.level-circle');
    if (levelCircle) {
        levelCircle.style.borderColor = lighterColor;
        levelCircle.style.background = `radial-gradient(circle, ${baseColor}33, ${darkerColor}aa)`;
    }

    // Apply accent color to XP bar with gradient
    const xpBar = document.getElementById('xp-bar');
    if (xpBar) {
        xpBar.style.background = `linear-gradient(90deg, ${baseColor}, ${lighterColor})`;
        xpBar.style.boxShadow = `0 0 20px ${baseColor}cc`;
    }

    // Apply to glassmorphism overlay
    const glassOverlay = document.querySelector('.profile-glass-overlay');
    if (glassOverlay) {
        glassOverlay.style.background = `linear-gradient(to top, ${baseColor}ee 0%, ${baseColor}66 50%, transparent 100%)`;
    }

    // Apply to profile container background
    const profileContainer = document.querySelector('.profile-container');
    if (profileContainer) {
        profileContainer.style.background = veryDarkColor;
    }
}

// Helper function to adjust color brightness
function adjustColorBrightness(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}
