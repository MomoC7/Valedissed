/**
 * admin/dashboard.js
 * Lógica centralizada para el Panel de Administración
 */

const token = localStorage.getItem('access_token');
let adminPartnerRequests = [];
let activeRequestDetailsId = null;

async function switchAdminTab(tab) {
    // Actualizar UI de botones sin borrar el header
    document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`tab-${tab}-btn`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Solo limpiar el contenedor de contenido
    const contentContainer = document.getElementById('admin-tab-content');
    if (!contentContainer) return;

    contentContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center py-20 opacity-50">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-primary mb-4"></div>
            <p class="text-sm font-medium">Cargando sección...</p>
        </div>
    `;

    if (tab === 'users') {
        await loadUsersView();
    } else if (tab === 'requests') {
        await loadRequestsView();
    } else if (tab === 'settings') {
        await loadSettingsView();
    }
}

async function loadSettingsView() {
    const container = document.getElementById('admin-tab-content');
    container.innerHTML = `
        <div class="p-10 text-center bg-white/50 dark:bg-valedissed-dark-surface rounded-3xl border border-dashed border-gray-300 dark:border-valedissed-dark-border animate-fadeIn">
            <span class="text-4xl block mb-4">⚙️</span>
            <h3 class="text-xl font-bold dark:text-white">Configuración Global</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto">
                Aquí podrás gestionar parámetros del sistema como comisiones, límites de carga y mantenimiento de la plataforma.
            </p>
            <div class="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-2xl mx-auto">
                <div class="p-4 bg-white dark:bg-valedissed-dark-elevated rounded-2xl border border-gray-100 dark:border-valedissed-dark-border">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Estado del Sistema</p>
                    <p class="text-sm font-bold text-green-500">Operativo</p>
                </div>
                <div class="p-4 bg-white dark:bg-valedissed-dark-elevated rounded-2xl border border-gray-100 dark:border-valedissed-dark-border">
                    <p class="text-[10px] font-bold text-gray-400 uppercase mb-1">Membresías Activas</p>
                    <p class="text-sm font-bold dark:text-white">--</p>
                </div>
            </div>
        </div>
    `;
}

async function loadUsersView() {
    const container = document.getElementById('admin-tab-content');
    
    container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Barra de Herramientas y Filtros (Mini) -->
            <div class="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white dark:bg-valedissed-dark-surface p-4 rounded-2xl border border-gray-100 dark:border-valedissed-dark-border shadow-sm">
                <div class="relative w-full sm:w-64">
                    <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">🔍</span>
                    <input type="text" id="dashboard-user-search" placeholder="Buscar usuario..." class="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-valedissed-dark-elevated border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-primary">
                </div>
                <div class="flex gap-2">
                    <select id="dashboard-user-role" class="bg-gray-50 dark:bg-valedissed-dark-elevated border-none rounded-xl text-xs font-bold uppercase py-2 px-4 outline-none focus:ring-2 focus:ring-brand-primary">
                        <option value="all">Todos los Roles</option>
                        <option value="cliente">Clientes</option>
                        <option value="partner">Socios</option>
                        <option value="admin">Admins</option>
                    </select>
                </div>
            </div>

            <!-- Tabla de Usuarios -->
            <div id="dashboard-users-table-container" class="overflow-x-auto bg-white dark:bg-valedissed-dark-surface rounded-3xl shadow-sm border border-gray-100 dark:border-valedissed-dark-border">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-brand-soft/50 dark:bg-valedissed-dark-elevated/50 text-xs font-bold uppercase tracking-widest text-gray-500">
                            <th class="px-6 py-4">Usuario</th>
                            <th class="px-6 py-4">Rol</th>
                            <th class="px-6 py-4">Estado</th>
                            <th class="px-6 py-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="dashboard-users-tbody" class="divide-y divide-gray-50 dark:divide-valedissed-dark-border">
                        <tr><td colspan="4" class="px-6 py-12 text-center text-gray-400">Cargando base de datos...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    try {
        const response = await fetch('/api/v1/admin/users/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Error al obtener usuarios');
        const users = await response.json();
        
        const renderDashboardUsers = (filteredUsers) => {
            const tbody = document.getElementById('dashboard-users-tbody');
            if (!tbody) return;
            
            if (filteredUsers.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-gray-500">No se encontraron usuarios.</td></tr>`;
                return;
            }

            tbody.innerHTML = filteredUsers.map(user => `
                <tr class="hover:bg-brand-soft/30 dark:hover:bg-valedissed-dark-elevated/30 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="h-8 w-8 rounded-full bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary text-xs">
                                ${user.username ? user.username.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                                <div class="text-sm font-bold text-brand-dark dark:text-white">${user.username || 'Sin usuario'}</div>
                                <div class="text-[10px] text-gray-400 uppercase">${user.full_name || ''}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
                            ${user.role || 'cliente'}
                        </span>
                    </td>
                    <td class="px-6 py-4">
                        <span class="inline-flex h-2 w-2 rounded-full ${user.status === 'suspended' ? 'bg-red-500' : 'bg-green-500'} mr-2"></span>
                        <span class="text-xs font-medium text-gray-500">${user.status === 'suspended' ? 'Suspendido' : 'Activo'}</span>
                    </td>
                    <td class="px-6 py-4 text-right">
                        <a href="/admin/users" class="text-brand-primary hover:underline text-xs font-bold">Detalles</a>
                    </td>
                </tr>
            `).join('');
        };

        renderDashboardUsers(users);

        // Filtros rápidos en el Dashboard
        const searchInput = document.getElementById('dashboard-user-search');
        const roleSelect = document.getElementById('dashboard-user-role');

        const applyDashboardFilters = () => {
            const q = searchInput.value.toLowerCase();
            const r = roleSelect.value;
            const filtered = users.filter(u => {
                const matchSearch = !q || (u.username && u.username.toLowerCase().includes(q)) || (u.full_name && u.full_name.toLowerCase().includes(q));
                const matchRole = r === 'all' || (u.role || 'cliente') === r;
                return matchSearch && matchRole;
            });
            renderDashboardUsers(filtered);
        };

        searchInput.addEventListener('input', applyDashboardFilters);
        roleSelect.addEventListener('change', applyDashboardFilters);

    } catch (error) {
        console.error("Error loading users for dashboard:", error);
        document.getElementById('dashboard-users-tbody').innerHTML = `<tr><td colspan="4" class="px-6 py-12 text-center text-red-500">Error al cargar datos.</td></tr>`;
    }
}

async function loadRequestsView() {
    const container = document.getElementById('admin-tab-content');
    
    try {
        console.log('[Admin Dashboard] Token disponible:', !!token);
        
        const response = await fetch('/api/v1/admin/users/partner-requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log('[Admin Dashboard] Response status:', response.status);
        
        if (response.ok) {
            // Solo leemos el JSON una vez aquí
            const requests = await response.json();
            console.log('[Admin Dashboard] Raw partner requests data:', requests);
            
            adminPartnerRequests = Array.isArray(requests) ? requests : [];
            if (adminPartnerRequests.length > 0) {
                renderRequestsTable(adminPartnerRequests, container);
            } else {
                container.innerHTML = `<div class="p-10 text-center text-gray-500">No hay solicitudes pendientes.</div>`;
            }
        } else {
            adminPartnerRequests = [];
            console.error('[Admin Dashboard] Error en respuesta:', response.statusText);
            container.innerHTML = `<div class="p-10 text-center text-red-500">Error: ${response.status} - No se pudieron cargar las solicitudes.</div>`;
        }
    } catch (error) {
        adminPartnerRequests = [];
        console.error("Error loading requests:", error);
        container.innerHTML = `<div class="p-10 text-center text-red-500">Error de conexión con el servidor.</div>`;
    }
}

function renderRequestsTable(requests, container) {
    if (requests.length === 0) {
        container.innerHTML = `
            <div class="p-20 text-center bg-white/40 dark:bg-valedissed-dark-surface/40 rounded-3xl border-2 border-dashed border-gray-200 dark:border-valedissed-dark-border">
                <span class="text-5xl block mb-4">📩</span>
                <h3 class="text-xl font-bold dark:text-white">Sin solicitudes pendientes</h3>
                <p class="text-gray-500 dark:text-gray-400 mt-2">No hay nuevas postulaciones para revisar en este momento.</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="space-y-4">
    `;

    requests.forEach(req => {
        const dateTime = new Date(req.created_at).toLocaleString();
        const applicantName = req.profiles?.full_name || req.business_name || 'Sin nombre';
        const businessName = req.business_name || 'Sin empresa';
        const partnerType = req.partner_type || 'N/A';
        const location = req.operation_zone || 'No registrada';

        html += `
            <article class="admin-request-card">
                <div class="request-field">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Fecha/Hora</p>
                    <p class="font-semibold truncate">${dateTime}</p>
                </div>
                <div class="request-field">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Nombre solicitante</p>
                    <p class="font-semibold truncate">${applicantName}</p>
                </div>
                <div class="request-field">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Nombre empresa</p>
                    <p class="truncate">${businessName}</p>
                </div>
                <div class="request-field">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Tipo de socio</p>
                    <p class="truncate">${partnerType}</p>
                </div>
                <div class="request-field">
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Ubicación</p>
                    <p class="truncate">${location}</p>
                </div>
                <div class="flex items-center justify-end gap-2">
                    <button onclick="viewRequestDetails('${req.id}')" class="rounded-2xl bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white transition-all px-5 py-3 text-sm font-bold">
                        Revisar
                    </button>
                </div>
            </article>
        `;
    });

    html += `
        </div>
        <div id="request-detail-panel" class="mt-8"></div>
    `;
    container.innerHTML = html;
}

function renderRequestDetailPanel(request) {
    const detailPanel = document.getElementById('request-detail-panel');
    if (!detailPanel) return;

    const canReview = request.status === 'pending';
    detailPanel.innerHTML = `
        <div class="p-6 bg-white dark:bg-valedissed-dark-surface rounded-3xl shadow-sm border border-gray-100 dark:border-valedissed-dark-border animate-fadeIn">
            <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div>
                    <p class="text-xs uppercase tracking-widest text-gray-400">Solicitud seleccionada</p>
                    <h2 class="text-2xl font-bold text-brand-dark dark:text-white">${request.profiles?.full_name || 'Solicitante desconocido'}</h2>
                    <p class="text-sm text-gray-500 mt-1">${new Date(request.created_at).toLocaleString() || 'Fecha no disponible'}</p>
                </div>
                <span class="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase bg-brand-primary/10 text-brand-primary">
                    ${request.status || 'pendiente'}
                </span>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
                <div class="space-y-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Nombre</p>
                        <p class="font-semibold">${request.profiles?.full_name || 'Sin nombre'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Nombre Comercial</p>
                        <p class="font-semibold">${request.business_name || 'Sin empresa'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Teléfono</p>
                        <p>${request.partner_phone || 'Sin teléfono'}</p>
                    </div>
                </div>
                <div class="space-y-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Tipo de socio</p>
                        <p>${request.partner_type || 'N/A'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Zona de operación</p>
                        <p>${request.operation_zone || 'No registrada'}</p>
                    </div>
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Años de experiencia</p>
                        <p>${request.years_experience ?? '—'}</p>
                    </div>
                </div>
            </div>
            <div class="mt-6">
                <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Bio / Descripción</p>
                <p class="text-sm text-gray-600 dark:text-gray-300">${request.bio || 'No hay descripción disponible.'}</p>
            </div>
            ${canReview ? `
                <div class="admin-request-detail-actions">
                    <button onclick="handleReviewDecision('${request.id}', 'approved')" class="inline-flex items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all px-5 py-3 text-sm font-bold">
                        Aceptar
                    </button>
                    <button onclick="toggleRejectReason('${request.id}')" class="inline-flex items-center justify-center rounded-2xl bg-red-100 text-red-700 hover:bg-red-200 transition-all px-5 py-3 text-sm font-bold">
                        Denegar
                    </button>
                </div>
                <div id="reject-reason-container-${request.id}" class="admin-request-reject-reason hidden">
                    <label class="block text-sm font-bold text-gray-700 dark:text-gray-200">Motivo de rechazo</label>
                    <textarea id="review-reason-${request.id}" class="min-h-[120px] w-full rounded-3xl border border-gray-200 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-elevated px-4 py-3 text-sm text-gray-800 dark:text-gray-100 outline-none focus:ring-2 focus:ring-red-300" placeholder="Describe el motivo por el cual se deniega esta solicitud..."></textarea>
                    <button onclick="handleReviewDecision('${request.id}', 'rejected')" class="inline-flex items-center justify-center rounded-2xl bg-red-600 text-white hover:bg-red-700 transition-all px-5 py-3 text-sm font-bold">
                        Confirmar rechazo
                    </button>
                </div>
            ` : `
                <div class="mt-6 rounded-3xl border border-gray-200 dark:border-valedissed-dark-border bg-gray-50 dark:bg-valedissed-dark-elevated p-4">
                    <p class="text-sm font-semibold text-gray-700 dark:text-gray-200">Esta solicitud ya fue procesada.</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">El estado actual se refleja en la lista principal.</p>
                </div>
            `}
        </div>
    `;
}
function renderRequestOutcomePanel(request, action) {
    const detailPanel = document.getElementById('request-detail-panel');
    if (!detailPanel) return;

    const title = action === 'approved' ? 'Solicitud aceptada' : 'Solicitud denegada';
    const message = action === 'approved'
        ? 'El usuario ha sido actualizado a Socio. La solicitud se ha eliminado del listado pendiente.'
        : 'La solicitud ha sido rechazada. El usuario podrá enviar una nueva solicitud cuando lo desee.';

    detailPanel.innerHTML = `
        <div class="p-6 bg-white dark:bg-valedissed-dark-surface rounded-3xl shadow-sm border border-gray-100 dark:border-valedissed-dark-border animate-fadeIn">
            <div class="mb-6">
                <p class="text-xs uppercase tracking-widest text-gray-400">Resultado de revisión</p>
                <h2 class="text-2xl font-bold text-brand-dark dark:text-white">${title}</h2>
                <p class="text-sm text-gray-500 mt-2">${message}</p>
            </div>
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-200">
                <div>
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Solicitante</p>
                    <p class="font-semibold">${request.profiles?.full_name || request.business_name || 'Sin nombre'}</p>
                </div>
                <div>
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Estado final</p>
                    <p class="font-semibold uppercase">${action === 'approved' ? 'Socio' : 'Denegado'}</p>
                </div>
                <div>
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Nombre Comercial</p>
                    <p>${request.business_name || 'No disponible'}</p>
                </div>
                <div>
                    <p class="text-[10px] uppercase tracking-widest text-gray-400 mb-1">Teléfono</p>
                    <p>${request.partner_phone || 'No disponible'}</p>
                </div>
            </div>
        </div>
    `;
}
document.addEventListener('DOMContentLoaded', () => {
    // Si estamos en la raíz de admin, activar la primera pestaña o la que venga por URL
    if (window.location.pathname === '/admin') {
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab') || 'users';
        switchAdminTab(tab);
    }
});

window.toggleRejectReason = function(requestId) {
    const container = document.getElementById(`reject-reason-container-${requestId}`);
    if (!container) return;
    container.classList.toggle('hidden');
};

window.handleReviewDecision = async function(requestId, decision) {
    if (!requestId) {
        console.error('[Admin Dashboard] requestId inválido en handleReviewDecision:', requestId);
        if (window.showToast) window.showToast('ID de solicitud inválido.', 'error');
        return;
    }

    const request = adminPartnerRequests.find(req => req.id === requestId);
    if (!request) {
        console.error('[Admin Dashboard] Solicitud no encontrada en el estado local:', requestId);
        if (window.showToast) window.showToast('No se encontró la solicitud en la memoria local.', 'error');
        return;
    }

    if (window.clearToasts) window.clearToasts();
    const loadingToast = window.showToast('Procesando decisión de revisión...', 'info');

    let payload = { status: decision };
    if (decision === 'rejected') {
        const commentField = document.getElementById(`review-reason-${requestId}`);
        const adminComments = commentField ? commentField.value.trim() : '';
        if (!adminComments) {
            if (loadingToast && loadingToast.parentElement) loadingToast.remove();
            if (window.showToast) window.showToast('Debes indicar un motivo de rechazo.', 'warning');
            return;
        }
        payload.admin_comments = adminComments;
    }

    try {
        const response = await fetch(`/api/v1/admin/users/partner-requests/${requestId}/review`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        adminPartnerRequests = adminPartnerRequests.filter(req => req.id !== requestId);
        renderRequestsTable(adminPartnerRequests, document.getElementById('admin-tab-content'));
        renderRequestOutcomePanel({ ...request, status: decision }, decision);

        if (window.showToast) {
            if (decision === 'approved') {
                window.showToast('Solicitud aceptada. Usuario actualizado a Socio.', 'success');
            } else {
                window.showToast('Solicitud denegada. El usuario podrá enviar una nueva solicitud.', 'success');
            }
        }

        console.log('[Admin Dashboard] Revisión completada:', result);
    } catch (error) {
        console.error('[Admin Dashboard] Error en handleReviewDecision:', error);
        if (window.showToast) {
            window.showToast('Error al procesar la revisión. Revisa la consola.', 'error');
        }
    } finally {
        if (loadingToast && loadingToast.parentElement) {
            loadingToast.remove();
        }
    }
};

window.viewRequestDetails = async function(requestId) {
    if (!requestId) {
        console.error('[Admin Dashboard] requestId inválido en viewRequestDetails:', requestId);
        if (window.showToast) window.showToast('ID de solicitud inválido.', 'error');
        return;
    }

    if (window.clearToasts) window.clearToasts();
    let loadingToast;
    if (window.showToast) {
        loadingToast = window.showToast('Cargando detalles de la solicitud...', 'info');
    }

    try {
        const selectedRequest = adminPartnerRequests.find(req => req.id === requestId);
        if (!selectedRequest) {
            throw new Error(`Solicitud con id ${requestId} no encontrada en el estado local.`);
        }

        activeRequestDetailsId = requestId;
        renderRequestDetailPanel(selectedRequest);

        if (window.showToast) {
            window.showToast('Detalles cargados correctamente.', 'success');
        }
    } catch (error) {
        console.error('[Admin Dashboard] Error cargando detalles de la solicitud:', error);
        if (window.showToast) {
            window.showToast('No se pudieron cargar los detalles. Revisa la consola.', 'error');
        }
    } finally {
        if (loadingToast && loadingToast.parentElement) {
            loadingToast.remove();
        }
    }
};