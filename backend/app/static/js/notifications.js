/**
 * notifications.js
 * Componente global independiente para la gestión de notificaciones.
 * Se ejecuta SIEMPRE sin condicionales de rol.
 */

function initNotifications() {
    console.log('[Notifications] Initializing notifications system...');
    
    const token = localStorage.getItem('access_token');
    const badge = document.getElementById('nav-notif-badge');
    const list = document.getElementById('nav-notif-list');
    const container = document.getElementById('nav-notif-container');
    const toggleBtn = document.getElementById('nav-notif-toggle');

    // Verificar que los elementos existen
    if (!badge || !list || !container) {
        console.warn('[Notifications] Missing DOM elements:', { badge: !!badge, list: !!list, container: !!container });
        return;
    }

    console.log('[Notifications] DOM elements found. Token available:', !!token);

    // Setup toggle button para mostrar/ocultar dropdown
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            container.classList.toggle('hidden');
            console.log('[Notifications] Toggle clicked, container now:', container.classList.contains('hidden') ? 'hidden' : 'visible');
        });
    }

    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (toggleBtn && !toggleBtn.contains(e.target) && !container.contains(e.target)) {
            container.classList.add('hidden');
        }
    });

    // Si no hay token, mostrar estado vacío
    if (!token) {
        console.log('[Notifications] No token found, showing empty state');
        renderNotifications([], badge, list);
        return;
    }

    // Traer notificaciones del servidor
    fetchNotifications(token, badge, list);

    // Refresco automático cada 30 segundos
    setInterval(() => {
        console.log('[Notifications] Auto-refresh...');
        fetchNotifications(token, badge, list);
    }, 30000);
}

// En notifications.js
async function fetchNotifications() {
    try {
        // Comenta la línea que hace el fetch real
        // const response = await fetch('/api/v1/notifications'); 
        
        // Pon esto mientras tanto para evitar el 404
        console.log("Notificaciones desactivadas temporalmente");
        renderNotifications([]); 
    } catch (e) {
        console.log("Error controlado");
    }
}

function renderNotifications(notifs, badge, list) {
    console.log('[Notifications] Rendering', notifs.length, 'notifications');
    console.log('[Notifications] Notification data for mapping:', notifs.map(n => ({ 
        id: n.id, 
        title: n.title, 
        message: n.message,
        read: n.read,
        fields: Object.keys(n)
    })));
    
    const count = notifs.filter(n => !n.read).length;
    
    // Mostrar/ocultar badge con contador
    if (count > 0) {
        badge.classList.remove('hidden');
        const badgeSpan = badge.querySelector('span:last-child');
        if (badgeSpan) {
            badgeSpan.textContent = count;
            console.log('[Notifications] Badge updated with count:', count);
        }
    } else {
        badge.classList.add('hidden');
        console.log('[Notifications] Badge hidden (no unread)');
    }

    // Renderizar lista
    if (notifs.length === 0) {
        console.log('[Notifications] No notifications, showing empty state');
        list.innerHTML = `
            <div class="p-8 text-center opacity-40">
                <span class="text-3xl block mb-2">🔔</span>
                <p class="text-[10px] font-bold uppercase tracking-widest">Sin notificaciones nuevas</p>
            </div>
        `;
        return;
    }

    console.log('[Notifications] Rendering notification list...');
    list.innerHTML = notifs.map((n, idx) => {
        console.log(`[Notifications] Mapping notification ${idx}:`, {
            title: n.title,
            message: n.message,
            icon: n.icon,
            time_ago: n.time_ago,
            read: n.read
        });
        
        return `
            <div class="p-4 border-b border-gray-50 dark:border-valedissed-dark-border hover:bg-brand-soft/30 dark:hover:bg-valedissed-dark-elevated transition-colors cursor-pointer ${n.read ? 'opacity-60' : ''}">
                <div class="flex gap-3">
                    <span class="text-xl">${n.icon || '✨'}</span>
                    <div>
                        <p class="text-xs font-bold text-brand-dark dark:text-gray-200">${n.title || 'Sin título'}</p>
                        <p class="text-[10px] text-gray-400 mt-1">${n.message || 'Sin contenido'}</p>
                        <p class="text-[9px] text-brand-primary/60 mt-2 font-bold uppercase">${n.time_ago || 'Reciente'}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    console.log('[Notifications] List rendered successfully');
}

// --- EJECUCIÓN GLOBAL ---
// Se ejecuta siempre, sin condicionales de rol
console.log('[Notifications] Script loaded');
document.addEventListener('DOMContentLoaded', initNotifications);

// También ejecutar inmediatamente por si DOMContentLoaded ya pasó
if (document.readyState === 'loading') {
    console.log('[Notifications] Document still loading, will wait for DOMContentLoaded');
} else {
    console.log('[Notifications] Document already loaded, initializing now');
    initNotifications();
}
