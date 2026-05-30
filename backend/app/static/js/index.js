/**
 * index.js
 * Lógica de protección del dashboard - verifica autenticación
 */

async function checkAuth() {
    const token = localStorage.getItem('access_token');
    console.log('Token from localStorage:', token);
    
    if (!token) {
        console.log('No token, redirecting to welcome');
        // No guardar en historial al redirigir
        window.location.href = '/';
        return;
    }

    try {
        const response = await fetch('/api/v1/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Auth check response:', response.status);

        if (response.ok) {
            // Usuario autenticado, mostrar contenido del dashboard
            document.getElementById('loading').style.display = 'none';
            document.getElementById('content').style.display = 'block';
        } else if (response.status === 401) {
            // Token inválido, redirigir a inicio
            console.log('Token invalid, redirecting to welcome');
            localStorage.removeItem('access_token');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Auth check error:', error);
        // No cerrar sesión por errores de red temporales
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', checkAuth);
