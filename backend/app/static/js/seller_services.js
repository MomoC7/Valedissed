document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('/login');
        return;
    }

    loadServices();

    // Modal logic
    const modal = document.getElementById('service-modal');
    const addBtn = document.getElementById('add-service-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const backdrop = document.getElementById('modal-backdrop');
    
    const openModal = () => {
        document.getElementById('service-form').reset();
        document.getElementById('service_id').value = '';
        document.getElementById('modal-title').textContent = 'Nuevo Servicio';
        document.getElementById('photos-section').classList.add('hidden'); // Ocultar fotos hasta crear el servicio
        modal.classList.remove('hidden');
    };
    
    const closeModal = () => modal.classList.add('hidden');
    
    addBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // Form logic
    const form = document.getElementById('service-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const serviceId = document.getElementById('service_id').value;
        const payload = {
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            price: parseFloat(document.getElementById('price').value),
            duration_minutes: parseInt(document.getElementById('duration_minutes').value),
            category: document.getElementById('category').value,
            modality: document.getElementById('modality').value,
            requirements: document.getElementById('requirements').value || null
        };

        const btn = document.getElementById('save-btn');
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const url = serviceId ? `/api/v1/services/${serviceId}` : '/api/v1/services/';
            const method = serviceId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                showMessage('Servicio guardado exitosamente', false);
                if (!serviceId) {
                    // Si es nuevo, abrimos el modo edición para subir fotos
                    openEditModal(data);
                } else {
                    closeModal();
                }
                loadServices();
            } else {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el servicio', true);
            }
        } catch (error) {
            showMessage('Error de conexión', true);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar Servicio';
        }
    });

    // Image upload logic
    const fileInput = document.getElementById('image-upload');
    const uploadBtn = document.getElementById('upload-btn');
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            uploadBtn.classList.remove('hidden');
        } else {
            uploadBtn.classList.add('hidden');
        }
    });

    uploadBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const serviceId = document.getElementById('service_id').value;
        if (!serviceId) return;

        const formData = new FormData();
        formData.append('file', file);
        // Si no hay imágenes, esta es la portada
        const isCover = document.getElementById('images-grid').children.length === 0;
        formData.append('is_cover', isCover);

        const status = document.getElementById('upload-status');
        status.textContent = 'Subiendo...';
        uploadBtn.disabled = true;

        try {
            const response = await fetch(`/api/v1/services/${serviceId}/images?is_cover=${isCover}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (response.ok) {
                status.textContent = '¡Subida exitosa!';
                fileInput.value = '';
                uploadBtn.classList.add('hidden');
                setTimeout(() => status.textContent = '', 2000);
                
                // Recargar servicio
                const srvResponse = await fetch(`/api/v1/services/${serviceId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (srvResponse.ok) {
                    const srv = await srvResponse.json();
                    renderImages(srv);
                    loadServices();
                }
            } else {
                const err = await response.json();
                status.textContent = err.detail || 'Error al subir la imagen';
            }
        } catch (error) {
            status.textContent = 'Error de conexión';
        } finally {
            uploadBtn.disabled = false;
        }
    });
});

async function loadServices() {
    const token = localStorage.getItem('access_token');
    const grid = document.getElementById('services-grid');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loader');

    grid.classList.add('hidden');
    emptyState.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const response = await fetch('/api/v1/services/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const services = await response.json();
            loader.classList.add('hidden');

            if (services.length === 0) {
                emptyState.classList.remove('hidden');
            } else {
                grid.innerHTML = services.map(s => `
                    <div class="card p-0 overflow-hidden flex flex-col ${!s.is_active ? 'opacity-60' : ''}">
                        <div class="h-48 bg-gray-100 dark:bg-gray-800 relative">
                            ${s.cover_image_url 
                                ? `<img src="${s.cover_image_url}" class="w-full h-full object-cover">` 
                                : `<div class="flex items-center justify-center h-full text-gray-400">Sin foto</div>`
                            }
                            ${!s.is_active ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Inactivo</span>` : ''}
                            <span class="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                ⏱️ ${formatDuration(s.duration_minutes)}
                            </span>
                        </div>
                        <div class="p-4 flex-1 flex flex-col">
                            <h4 class="font-bold text-lg mb-1 truncate">${s.title}</h4>
                            <p class="text-brand-primary font-bold mb-2">$${s.price}</p>
                            <p class="text-xs text-gray-500 mb-4 capitalize">📍 ${s.modality}</p>
                            
                            <div class="mt-auto flex gap-2">
                                <button onclick='openEditModal(${JSON.stringify(s).replace(/'/g, "&apos;")})' class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-bold py-2 rounded-xl transition-colors">
                                    Editar
                                </button>
                                ${s.is_active ? `
                                <button onclick="deleteService('${s.id}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-sm font-bold py-2 rounded-xl transition-colors">
                                    Desactivar
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                `).join('');
                grid.classList.remove('hidden');
            }
        }
    } catch (error) {
        loader.classList.add('hidden');
        showMessage('Error al cargar los servicios', true);
    }
}

function formatDuration(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
}

window.openEditModal = function(service) {
    document.getElementById('modal-title').textContent = 'Editar Servicio';
    document.getElementById('service_id').value = service.id;
    document.getElementById('title').value = service.title;
    document.getElementById('description').value = service.description || '';
    document.getElementById('price').value = service.price;
    document.getElementById('duration_minutes').value = service.duration_minutes;
    document.getElementById('category').value = service.category || '';
    document.getElementById('modality').value = service.modality || 'estudio';
    document.getElementById('requirements').value = service.requirements || '';
    
    document.getElementById('photos-section').classList.remove('hidden');
    renderImages(service);
    
    document.getElementById('service-modal').classList.remove('hidden');
};

function renderImages(service) {
    const grid = document.getElementById('images-grid');
    const imagesUrls = service.portfolio_images || [];
    
    if (imagesUrls.length === 0) {
        grid.innerHTML = '<p class="text-sm text-gray-400">No hay fotos subidas en el portafolio.</p>';
        return;
    }

    grid.innerHTML = imagesUrls.map(url => `
        <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
            <img src="${url}" class="w-full h-full object-cover">
            ${url === service.cover_image_url ? '<span class="absolute bottom-0 left-0 right-0 bg-brand-primary/80 text-white text-[10px] text-center py-0.5">Portada</span>' : ''}
            <button type="button" onclick="deleteImage('${service.id}', '${url}')" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `).join('');
}

// Nota: El endpoint de eliminar imagen específica en servicios no lo creamos en el backend,
// Para simplicidad en esta versión, omitiremos esa función o se podría implementar de forma similar a productos
window.deleteImage = function(serviceId, imageUrl) {
    alert("Eliminación de foto individual de portafolio no habilitada en esta versión.");
};

window.deleteService = async function(id) {
    if (!confirm('¿Seguro que deseas desactivar este servicio?')) return;

    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Servicio desactivado', false);
            loadServices();
        } else {
            showMessage('Error al desactivar', true);
        }
    } catch (error) {
        showMessage('Error de conexión', true);
    }
};

function showMessage(msg, isError) {
    const el = document.getElementById('status-message');
    el.textContent = msg;
    el.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'bg-green-50', 'text-green-600',
        'dark:bg-red-900/20', 'dark:text-red-400', 'dark:bg-green-900/20', 'dark:text-green-400');
    if (isError) {
        el.classList.add('bg-red-50', 'text-red-600', 'dark:bg-red-900/20', 'dark:text-red-400');
    } else {
        el.classList.add('bg-green-50', 'text-green-600', 'dark:bg-green-900/20', 'dark:text-green-400');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => el.classList.add('hidden'), 5000);
}
