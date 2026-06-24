
const AUTH_STATE = { currentUser: null, isAuthenticated: false };
const API_BASE = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
    initAuthModal();
    setTimeout(checkAuth, 100);
});

function initAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (!modal) return console.error('No auth modal');

    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
    });

    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('register-form')?.addEventListener('submit', handleRegister);
    initPasswordToggles();
    
    document.getElementById('google-login-btn')?.addEventListener('click', () => handleGoogleAuth('login'));
    document.getElementById('google-register-btn')?.addEventListener('click', () => handleGoogleAuth('register'));
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
    clearAuthErrors();
}

function initPasswordToggles() {
    [['login-password-toggle', 'login-password'], ['register-password-toggle', 'register-password'], ['register-password-confirm-toggle', 'register-password-confirm']].forEach(([btnId, inputId]) => {
        document.getElementById(btnId)?.addEventListener('click', () => {
            const input = document.getElementById(inputId);
            input.type = input.type === 'password' ? 'text' : 'password';
            if (window.lucide) lucide.createIcons();
        });
    });
}

async function handleLogin(e) {
    e.preventDefault();
    clearAuthErrors();
    const btn = e.target.querySelector('.auth-submit-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Вход...';
    if (window.lucide) lucide.createIcons();

    try {
        // Browser mode - используем fetch к серверу
        const response = await fetch(API_BASE + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: document.getElementById('login-username').value.trim(),
                password: document.getElementById('login-password').value
            })
        });
        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error || 'Ошибка входа');
        }

        AUTH_STATE.currentUser = {
            id: data.user_id,
            username: data.username
        };
        AUTH_STATE.isAuthenticated = true;
        
        localStorage.setItem('xcord_auth', JSON.stringify({
            userId: data.user_id,
            username: data.username
        }));
        
        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('username-modal').style.display = 'none';
        
        // Инициализируем основное приложение
        if (typeof initXcord === 'function') {
            window.myUsername = data.username;
            localStorage.setItem('xcord_username', data.username);
            await initXcord();
        }
        
    } catch (err) {
        const errDiv = document.getElementById('login-error');
        errDiv.textContent = err.message;
        errDiv.classList.add('visible');
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    if (window.lucide) lucide.createIcons();
}

async function handleRegister(e) {
    e.preventDefault();
    clearAuthErrors();
    const btn = e.target.querySelector('.auth-submit-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Регистрация...';
    if (window.lucide) lucide.createIcons();

    try {
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;
        const pass2 = document.getElementById('register-password-confirm').value;
        const displayName = document.getElementById('register-email').value || username;
        
        if (username.length < 3) throw new Error('Имя от 3 символов');
        if (password.length < 6) throw new Error('Пароль от 6 символов');
        if (password !== pass2) throw new Error('Пароли не совпадают');
        if (!document.getElementById('register-terms').checked) throw new Error('Примите условия');

        // Browser mode - используем fetch к серверу
        const response = await fetch(API_BASE + '/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                display_name: displayName
            })
        });
        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error || 'Ошибка регистрации');
        }

        AUTH_STATE.currentUser = {
            id: data.user_id,
            username: data.username
        };
        AUTH_STATE.isAuthenticated = true;
        
        localStorage.setItem('xcord_auth', JSON.stringify({
            userId: data.user_id,
            username: data.username
        }));

        document.getElementById('auth-modal').classList.remove('active');
        document.getElementById('username-modal').style.display = 'none';
        
        // Инициализируем основное приложение
        if (typeof initXcord === 'function') {
            window.myUsername = data.username;
            localStorage.setItem('xcord_username', data.username);
            await initXcord();
        }
        
    } catch (err) {
        const errDiv = document.getElementById('register-error');
        errDiv.textContent = err.message;
        errDiv.classList.add('visible');
    }
    
    btn.disabled = false;
    btn.innerHTML = originalText;
    if (window.lucide) lucide.createIcons();
}

function checkAuth() {
    const data = localStorage.getItem('xcord_auth');
    if (data) {
        try {
            const { userId, username } = JSON.parse(data);
            AUTH_STATE.currentUser = { id: userId, username: username };
            AUTH_STATE.isAuthenticated = true;
            
            // Browser mode - проверяем с сервером
            fetch(API_BASE + '/auth/verify/' + userId)
                .then(r => r.json())
                .then(result => {
                    if (result.ok) {
                        document.getElementById('auth-modal').classList.remove('active');
                        document.getElementById('username-modal').style.display = 'none';
                        window.myUsername = username;
                        if (typeof initXcord === 'function') {
                            initXcord();
                        }
                    } else {
                        // Сессия невалидна, показываем auth
                        document.getElementById('auth-modal')?.classList.add('active');
                    }
                })
                .catch(() => {
                    // Сервер недоступен, разрешаем локальную сессию
                    document.getElementById('auth-modal')?.classList.remove('active');
                    document.getElementById('username-modal').style.display = 'none';
                    window.myUsername = username;
                    if (typeof initXcord === 'function') {
                        initXcord();
                    }
                });
            
            return;
        } catch (e) { 
            localStorage.removeItem('xcord_auth'); 
        }
    }
    
    // Не показываем auth modal сразу - даём initXcord показать username modal
    setTimeout(() => {
        if (!AUTH_STATE.isAuthenticated) {
            document.getElementById('auth-modal')?.classList.add('active');
        }
    }, 500);
}

function loadMainApp() {
    if (AUTH_STATE.currentUser) {
        const h = document.getElementById('chat-header-name');
        if (h) h.textContent = AUTH_STATE.currentUser.username;
    }
}

function clearAuthErrors() {
    document.querySelectorAll('.auth-error').forEach(el => { el.classList.remove('visible'); el.textContent = ''; });
}

async function hashPassword(pwd) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(pwd + 'salt_v1'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function handleGoogleAuth(type) {
    alert('Google OAuth будет настроен после запуска на сервере');
}

function logout() {
    AUTH_STATE.currentUser = null;
    AUTH_STATE.isAuthenticated = false;
    localStorage.removeItem('xcord_auth');
    localStorage.removeItem('xcord_username');
    document.getElementById('auth-modal')?.classList.add('active');
    document.getElementById('username-modal').style.display = 'flex';
    
    // Перезагружаем приложение
    location.reload();
}

window.logout = logout;
