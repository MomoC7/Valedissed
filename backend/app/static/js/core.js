/**
 * core.js
 * Interceptor global de fetch para inyectar tokens y manejar expiración.
 */

(function() {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
        let [resource, config] = args;
        
        // Solo inyectar en peticiones a nuestra API
        if (typeof resource === 'string' && resource.startsWith('/api/v1/')) {
            config = config || {};
            config.headers = config.headers || {};
            
            const token = localStorage.getItem('access_token');
            if (token && !config.headers['Authorization']) {
                // Si config.headers es Headers object
                if (config.headers instanceof Headers) {
                    config.headers.set('Authorization', `Bearer ${token}`);
                } else {
                    config.headers['Authorization'] = `Bearer ${token}`;
                }
            }
        }

        try {
            const response = await originalFetch(resource, config);
            
            // Manejo global de expiración (401)
            if (response.status === 401 && typeof resource === 'string' && !resource.includes('/auth/login')) {
                console.warn('Sesión expirada o inválida (401).');
                // Evitar redirección cíclica si ya estamos en login
                if (!window.location.pathname.includes('/login')) {
                    localStorage.removeItem('access_token');
                    window.location.href = '/login?expired=true';
                }
            }
            
            return response;
        } catch (error) {
            console.error('Fetch Error:', error);
            throw error;
        }
    };
})();
