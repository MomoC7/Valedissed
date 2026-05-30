/**
 * auth.js
 * Lógica de autenticación completa (Login, Register, Confirm Email, Forgot, Reset)
 */

// ===== LOGIN =====
function initLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const resultDiv = document.getElementById('login-result');
    
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        
        const data = await response.json();
        console.log('Login response:', response.status, data);
        
        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            
            // CORRECCIÓN: Toast Premium con persistencia visual
            if (window.showToast) {
                window.showToast('¡Bienvenido! Iniciando sesión... ✅', 'success');
            }
            
            if (resultDiv) resultDiv.innerHTML = '';
            
            // CORRECCIÓN: Delay de 1500ms para asegurar renderizado
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1500);
        } else {
            if (window.showToast) {
                window.showToast(data.detail || 'Credenciales incorrectas', 'error');
            } else if (resultDiv) {
                resultDiv.innerHTML = `<span class="text-red-600">${data.detail || 'Error en login'}</span>`;
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        if (window.showToast) {
            window.showToast('Error de conexión', 'error');
        } else if (resultDiv) {
            resultDiv.innerHTML = '<span class="text-red-600">Error de conexión</span>';
        }
    }
}

// ===== REGISTER =====
function initRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (!registerForm) return;
    registerForm.addEventListener('submit', handleRegister);
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const full_name = document.getElementById('full_name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const gender = document.getElementById('gender').value;
    const resultDiv = document.getElementById('register-result');
    
    try {
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, full_name, email, password, gender }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            resultDiv.innerHTML = '<span class="text-green-600">Registro exitoso. Revisa tu email para confirmar.</span>';
        } else {
            resultDiv.innerHTML = `<span class="text-red-600">${data.detail || 'Error en registro'}</span>`;
        }
    } catch (error) {
        console.error('Register error:', error);
        resultDiv.innerHTML = '<span class="text-red-600">Error de conexión</span>';
    }
}

// ===== CONFIRM EMAIL =====
function initConfirmEmail() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    const type = urlParams.get('type');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    if (error) {
        statusElement.textContent = `Error: ${errorDescription || error}`;
        statusElement.className = 'mt-2 text-center text-sm text-red-600';
        return;
    }

    if (type === 'signup' && accessToken && refreshToken) {
        confirmEmailWithSupabase(accessToken, refreshToken, statusElement);
    } else {
        statusElement.textContent = 'Parámetros de confirmación inválidos.';
        statusElement.className = 'mt-2 text-center text-sm text-red-600';
    }
}

async function confirmEmailWithSupabase(accessToken, refreshToken, statusElement) {
    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });

        if (error) throw error;

        statusElement.textContent = 'Email confirmado exitosamente. Redirigiendo...';
        statusElement.className = 'mt-2 text-center text-sm text-green-600';
        
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
    } catch (err) {
        statusElement.textContent = `Error al confirmar: ${err.message}`;
        statusElement.className = 'mt-2 text-center text-sm text-red-600';
    }
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initLoginForm();
    initRegisterForm();
    initConfirmEmail();
    initForgotPasswordForm();
    initResetPasswordForm();
});

// ===== RECUPERACIÓN DE CONTRASEÑA =====
function initForgotPasswordForm() {
    const form = document.getElementById('forgot-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const resultDiv = document.getElementById('forgot-result');
        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        try {
            const response = await fetch('/api/v1/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            document.getElementById('form-section').classList.add('hidden');
            document.getElementById('success-section').classList.remove('hidden');
        } catch (error) {
            resultDiv.innerHTML = '<span class="text-red-600">Error de conexión. Intenta de nuevo.</span>';
            btn.disabled = false;
            btn.textContent = 'Enviar enlace de recuperación';
        }
    });
}

// ===== NUEVA CONTRASEÑA (desde enlace correo) =====
function initResetPasswordForm() {
    const form = document.getElementById('reset-form');
    if (!form) return;

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (!accessToken || !refreshToken || type !== 'recovery') {
        document.getElementById('error-section').classList.remove('hidden');
        return;
    }
    document.getElementById('form-section').classList.remove('hidden');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;
        const resultDiv = document.getElementById('reset-result');

        if (password.length < 8) {
            resultDiv.innerHTML = '<span class="text-red-600">La contraseña debe tener al menos 8 caracteres.</span>';
            return;
        }
        if (password !== confirm) {
            resultDiv.innerHTML = '<span class="text-red-600">Las contraseñas no coinciden.</span>';
            return;
        }

        const btn = form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const response = await fetch('/api/v1/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_token: accessToken,
                    refresh_token: refreshToken,
                    new_password: password
                })
            });
            const data = await response.json();
            if (response.ok) {
                document.getElementById('form-section').classList.add('hidden');
                document.getElementById('success-section').classList.remove('hidden');
            } else {
                resultDiv.innerHTML = `<span class="text-red-600">${data.detail || 'Error al actualizar.'}</span>`;
                btn.disabled = false;
                btn.textContent = 'Guardar nueva contraseña';
            }
        } catch (error) {
            resultDiv.innerHTML = '<span class="text-red-600">Error de conexión.</span>';
            btn.disabled = false;
            btn.textContent = 'Guardar nueva contraseña';
        }
    });
}