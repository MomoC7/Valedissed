document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    
    // Si no está logueado, redirigir al login
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const tableBody = document.getElementById('users-table-body');
    const messageDiv = document.getElementById('admin-message');
    
    // Variables de Filtro
    let allUsers = []; // Aquí guardaremos todos los usuarios para filtrar en memoria
    const filterSearch = document.getElementById('filter-search');
    const filterRole = document.getElementById('filter-role');
    const filterGender = document.getElementById('filter-gender');
    const filterStatus = document.getElementById('filter-status');

    function showMessage(msg, isError = false) {
        messageDiv.textContent = msg;
        messageDiv.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'bg-green-50', 'text-green-600');
        if (isError) {
            messageDiv.classList.add('bg-red-50', 'text-red-600');
        } else {
            messageDiv.classList.add('bg-green-50', 'text-green-600');
        }
        setTimeout(() => messageDiv.classList.add('hidden'), 5000);
    }

    // Cargar la lista de usuarios
    async function loadUsers() {
        try {
            const response = await fetch('/api/v1/admin/users/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('[Admin Users] Fetch response status:', response.status);

            if (response.status === 403) {
                console.error('[Admin Users] Acceso denegado (403)');
                tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 font-bold">Acceso Denegado: No tienes permisos de administrador.</td></tr>`;
                return;
            }

            if (!response.ok) {
                console.error('[Admin Users] Response not ok:', response.status, response.statusText);
                throw new Error(`HTTP Error: ${response.status}`);
            }

            allUsers = await response.json();
            console.log('[Admin Users] Raw users data received:', allUsers);
            console.log('[Admin Users] Total users:', allUsers.length);
            console.log('[Admin Users] User fields:', allUsers.length > 0 ? Object.keys(allUsers[0]) : 'Sin usuarios');
            
            applyFilters(); // Renderiza usando los filtros actuales
        } catch (error) {
            console.error("[Admin Users] Error loading users:", error);
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-red-500">Ocurrió un error al cargar los usuarios: ${error.message}</td></tr>`;
        }
    }

    // Lógica de Filtrado
    function applyFilters() {
        const searchTerm = filterSearch.value.toLowerCase().trim();
        const roleTerm = filterRole.value;
        const genderTerm = filterGender.value;
        const statusTerm = filterStatus.value;

        const filteredUsers = allUsers.filter(user => {
            // 1. Búsqueda por texto (Username, Full Name, ID)
            const matchSearch = searchTerm === '' || 
                (user.username && user.username.toLowerCase().includes(searchTerm)) ||
                (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
                (user.id && user.id.toLowerCase().includes(searchTerm));
            
            // 2. Filtro de Rol
            const matchRole = roleTerm === 'all' || (user.role || 'cliente') === roleTerm;
            
            // 3. Filtro de Sexo
            const userGender = user.gender || 'other'; // Si es null, lo contamos como other
            const matchGender = genderTerm === 'all' || userGender === genderTerm;
            
            // 4. Filtro de Estado
            const userStatus = user.status || 'active';
            const matchStatus = statusTerm === 'all' || userStatus === statusTerm;

            return matchSearch && matchRole && matchGender && matchStatus;
        });

        renderUsers(filteredUsers);
    }

    // Escuchar Eventos de los Filtros
    filterSearch.addEventListener('input', applyFilters); // Se dispara a medida que escribes
    filterRole.addEventListener('change', applyFilters);
    filterGender.addEventListener('change', applyFilters);
    filterStatus.addEventListener('change', applyFilters);

    function renderUsers(users) {
        console.log('[Admin Users] renderUsers called with:', users.length, 'users');
        
        if (users.length === 0) {
            console.log('[Admin Users] No users to render');
            tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-12 text-center text-gray-500">No hay usuarios registrados.</td></tr>`;
            return;
        }

        console.log('[Admin Users] First user data:', users[0]);
        console.log('[Admin Users] Mapping user fields to table...');
        
        tableBody.innerHTML = users.map(user => {
            console.log('[Admin Users] Rendering user:', {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                status: user.status,
                gender: user.gender
            });
            
            const statusColor = user.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
            const statusText = user.status === 'suspended' ? 'Suspendido' : 'Activo';
            const actionText = user.status === 'suspended' ? 'Habilitar' : 'Suspender';
            const actionClass = user.status === 'suspended' 
                ? 'text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100' 
                : 'text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100';

            const isAdmin = user.role === 'admin';

            return `
                <tr class="hover:bg-brand-soft/50 dark:hover:bg-valedissed-dark-elevated transition-colors">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-brand-primary/20 to-brand-secondary/20 dark:from-brand-primary/40 dark:to-brand-secondary/40 rounded-full flex items-center justify-center text-brand-secondary dark:text-gray-100 font-bold">
                                ${user.username ? user.username.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900 dark:text-gray-100">${user.username || 'Sin usuario'}</div>
                                <div class="text-sm text-gray-500 dark:text-gray-400">ID: ${user.id ? user.id.substring(0,8) : 'N/A'}...</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm text-gray-900 dark:text-gray-100">${user.full_name || 'Sin nombre'}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">${user.gender === 'female' ? 'Mujer' : (user.gender === 'male' ? 'Hombre' : 'Otro/No def')}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${isAdmin ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300'}">
                            ${user.role || 'cliente'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'suspended' ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300' : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'}">
                            ${statusText}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        ${!isAdmin ? `
                            <button onclick="toggleUserStatus('${user.id}')" class="px-3 py-1 rounded-md transition-colors ${user.status === 'suspended' ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40' : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'}">
                                ${actionText}
                            </button>
                        ` : '<span class="text-gray-400 dark:text-gray-500 italic text-xs">Protegido</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Función global para que pueda ser llamada desde el HTML inline onclick
    window.toggleUserStatus = async function(userId) {
        if (!confirm('¿Estás seguro de que deseas cambiar el estado de este usuario?')) return;

        try {
            const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                showMessage('Estado del usuario actualizado exitosamente.');
                loadUsers(); // Recargar la tabla
            } else {
                const error = await response.json();
                showMessage(error.detail || 'Error al cambiar estado.', true);
            }
        } catch (error) {
            showMessage('Error de conexión.', true);
        }
    };

    // Iniciar carga
    loadUsers();
});
