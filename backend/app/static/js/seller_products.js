const DEFAULT_COMPANY_IMAGE = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="240"%3E%3Crect width="240" height="240" fill="%23f8fafc"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="%239ca3af"%3EFoto%20Empresa%3C/text%3E%3C/svg%3E';

// Variables de estado para las fotos nuevas
let newProductPhotos = [];
let newServicePhotos = [];
let currentProduct = null;
let currentService = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('/login');
        return;
    }

    const profileData = await loadCompanyInfo();
    await Promise.all([loadProducts(profileData), loadServices(profileData)]);
    initializeProductModal();
    initializeServiceModal();
});

function initializeProductModal() {
    const modal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const closeBtn = document.getElementById('close-product-modal-btn');
    const backdrop = document.getElementById('product-modal-backdrop');

    const openModal = () => {
        document.getElementById('product-form').reset();
        document.getElementById('product_id').value = '';
        document.getElementById('product-modal-title').textContent = 'Nuevo Producto';
        document.getElementById('photos-section').classList.add('hidden');
        newProductPhotos = []; // Resetear fotos nuevas
        currentProduct = null;
        modal.classList.remove('hidden');
    };

    const closeModal = () => modal.classList.add('hidden');

    addBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    const form = document.getElementById('product-form');
    form?.addEventListener('submit', handleProductFormSubmit);
    const fileInput = document.getElementById('image-upload');
    const uploadBtn = document.getElementById('upload-btn');
    const statusDiv = document.getElementById('upload-status');

    fileInput?.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            uploadBtn.classList.add('hidden');
            // Agregar archivos al estado y generar vista previa
            const files = Array.from(fileInput.files);
            newProductPhotos.push(...files);
            // Mostrar vista previa
            renderProductImagesWithPreview();
        }
    });
}

function initializeServiceModal() {
    const modal = document.getElementById('service-modal');
    const addBtn = document.getElementById('add-service-btn');
    const closeBtn = document.getElementById('close-service-modal-btn');
    const backdrop = document.getElementById('service-modal-backdrop');

    const openModal = () => {
        document.getElementById('service-form').reset();
        document.getElementById('service_id').value = '';
        document.getElementById('service-modal-title').textContent = 'Nuevo Servicio';
        document.getElementById('service-photos-section').classList.add('hidden');
        newServicePhotos = []; // Resetear fotos nuevas
        currentService = null;
        modal.classList.remove('hidden');
    };

    const closeModal = () => modal.classList.add('hidden');

    addBtn?.addEventListener('click', openModal);
    closeBtn?.addEventListener('click', closeModal);
    backdrop?.addEventListener('click', closeModal);

    const form = document.getElementById('service-form');
    form?.addEventListener('submit', handleServiceFormSubmit);
    const fileInput = document.getElementById('service-image-upload');
    const uploadBtn = document.getElementById('service-upload-btn');
    const statusDiv = document.getElementById('service-upload-status');

    fileInput?.addEventListener('change', async () => {
        if (fileInput.files.length > 0) {
            uploadBtn.classList.add('hidden');
            // Agregar archivos al estado y generar vista previa
            const files = Array.from(fileInput.files);
            newServicePhotos.push(...files);
            // Mostrar vista previa
            renderServiceImagesWithPreview();
        }
    });
}

async function handleProductFormSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('access_token');
    const productId = document.getElementById('product_id').value;
    const payload = {
        name: document.getElementById('name').value,
        description: document.getElementById('description').value,
        price: parseFloat(document.getElementById('price').value),
        sale_price: document.getElementById('sale_price').value ? parseFloat(document.getElementById('sale_price').value) : null,
        stock: parseInt(document.getElementById('stock').value),
        category: document.getElementById('category').value,
        size: document.getElementById('size').value || null,
        color: document.getElementById('color').value || null,
        condition: document.getElementById('condition').value
    };

    const btn = document.getElementById('save-btn');
    const statusDiv = document.getElementById('upload-status');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    statusDiv.textContent = '';

    try {
        let productData;
        if (!productId) {
            // Primero crear el producto si es nuevo
            const response = await fetch('/api/v1/products/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el producto', true);
                return;
            }

            productData = await response.json();
        } else {
            // Actualizar producto existente
            const response = await fetch(`/api/v1/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el producto', true);
                return;
            }

            productData = await response.json();
        }

        // Ahora subir las fotos nuevas (si hay)
        if (newProductPhotos.length > 0) {
            statusDiv.textContent = `Subiendo ${newProductPhotos.length} foto(s)...`;
            btn.textContent = 'Subiendo fotos...';
            for (let i = 0; i < newProductPhotos.length; i++) {
                const file = newProductPhotos[i];
                const formData = new FormData();
                formData.append('file', file);
                const isCover = (!productData.images_urls || productData.images_urls.length === 0) && i === 0;
                formData.append('is_cover', isCover);

                const uploadResponse = await fetch(`/api/v1/products/${productData.id}/images?is_cover=${isCover}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const err = await uploadResponse.json();
                    throw new Error(err.detail || `Error al subir la foto ${i + 1}`);
                }
            }
            // Resetear fotos nuevas
            newProductPhotos = [];
        }

        showMessage('Producto guardado exitosamente', false);
        if (!productId) {
            openEditModal(productData);
        } else {
            document.getElementById('product-modal').classList.add('hidden');
        }
        await loadProducts();
    } catch (error) {
        showMessage(error.message || 'Error de conexión', true);
        statusDiv.textContent = error.message || '';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Producto';
    }
}

async function handleProductImageUpload() {
    const token = localStorage.getItem('access_token');
    const fileInput = document.getElementById('image-upload');
    const files = Array.from(fileInput.files);
    if (files.length === 0) return;

    const productId = document.getElementById('product_id').value;
    if (!productId) return;

    const status = document.getElementById('upload-status');
    const uploadBtn = document.getElementById('upload-btn');
    status.textContent = `Subiendo ${files.length} foto(s)...`;
    uploadBtn.disabled = true;

    try {
        // Subir cada archivo uno por uno
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            const isCover = document.getElementById('images-grid').children.length === 0 && i === 0;
            formData.append('is_cover', isCover);

            const response = await fetch(`/api/v1/products/${productId}/images?is_cover=${isCover}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || `Error al subir la imagen ${i + 1}`);
            }
        }

        status.textContent = '¡Todas las fotos subidas exitosamente!';
        fileInput.value = '';
        uploadBtn.classList.add('hidden');
        setTimeout(() => status.textContent = '', 3000);
        const prodResponse = await fetch(`/api/v1/products/${productId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (prodResponse.ok) {
            const prod = await prodResponse.json();
            renderImages(prod);
            await loadProducts();
        }
    } catch (error) {
        status.textContent = error.message || 'Error de conexión';
    } finally {
        uploadBtn.disabled = false;
    }
}

async function handleServiceFormSubmit(event) {
    event.preventDefault();
    const token = localStorage.getItem('access_token');
    const serviceId = document.getElementById('service_id').value;
    const payload = {
        title: document.getElementById('service-title').value,
        description: document.getElementById('service-description').value,
        price: parseFloat(document.getElementById('service-price').value),
        duration_minutes: parseInt(document.getElementById('service-duration_minutes').value),
        category: document.getElementById('service-category').value,
        modality: document.getElementById('service-modality').value,
        requirements: document.getElementById('service-requirements').value || null
    };

    const btn = document.getElementById('service-save-btn');
    const statusDiv = document.getElementById('service-upload-status');
    btn.disabled = true;
    btn.textContent = 'Guardando...';
    statusDiv.textContent = '';

    try {
        let serviceData;
        if (!serviceId) {
            // Primero crear el servicio si es nuevo
            const response = await fetch('/api/v1/services/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el servicio', true);
                return;
            }

            serviceData = await response.json();
        } else {
            // Actualizar servicio existente
            const response = await fetch(`/api/v1/services/${serviceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el servicio', true);
                return;
            }

            serviceData = await response.json();
        }

        // Ahora subir las fotos nuevas (si hay)
        if (newServicePhotos.length > 0) {
            statusDiv.textContent = `Subiendo ${newServicePhotos.length} foto(s)...`;
            btn.textContent = 'Subiendo fotos...';
            for (let i = 0; i < newServicePhotos.length; i++) {
                const file = newServicePhotos[i];
                const formData = new FormData();
                formData.append('file', file);
                const isCover = (!serviceData.portfolio_images || serviceData.portfolio_images.length === 0) && i === 0;
                formData.append('is_cover', isCover);

                const uploadResponse = await fetch(`/api/v1/services/${serviceData.id}/images?is_cover=${isCover}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                if (!uploadResponse.ok) {
                    const err = await uploadResponse.json();
                    throw new Error(err.detail || `Error al subir la foto ${i + 1}`);
                }
            }
            // Resetear fotos nuevas
            newServicePhotos = [];
        }

        showMessage('Servicio guardado exitosamente', false);
        if (!serviceId) {
            openServiceEditModal(serviceData);
        } else {
            document.getElementById('service-modal').classList.add('hidden');
        }
        await loadServices();
    } catch (error) {
        showMessage(error.message || 'Error de conexión', true);
        statusDiv.textContent = error.message || '';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Servicio';
    }
}

async function handleServiceImageUpload() {
    const token = localStorage.getItem('access_token');
    const fileInput = document.getElementById('service-image-upload');
    const files = Array.from(fileInput.files);
    if (files.length === 0) return;
    const serviceId = document.getElementById('service_id').value;
    if (!serviceId) return;

    const status = document.getElementById('service-upload-status');
    const uploadBtn = document.getElementById('service-upload-btn');
    status.textContent = `Subiendo ${files.length} foto(s)...`;
    uploadBtn.disabled = true;

    try {
        // Subir cada archivo uno por uno
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const formData = new FormData();
            formData.append('file', file);
            const isCover = document.getElementById('service-images-grid').children.length === 0 && i === 0;
            formData.append('is_cover', isCover);

            const response = await fetch(`/api/v1/services/${serviceId}/images?is_cover=${isCover}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || `Error al subir la imagen ${i + 1}`);
            }
        }

        status.textContent = '¡Todas las fotos subidas exitosamente!';
        fileInput.value = '';
        uploadBtn.classList.add('hidden');
        setTimeout(() => status.textContent = '', 3000);
        const srvResponse = await fetch(`/api/v1/services/${serviceId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (srvResponse.ok) {
            const srv = await srvResponse.json();
            renderServiceImages(srv);
            await loadServices();
        }
    } catch (error) {
        status.textContent = error.message || 'Error de conexión';
    } finally {
        uploadBtn.disabled = false;
    }
}

async function loadProducts(profile) {
    const token = localStorage.getItem('access_token');
    const grid = document.getElementById('products-grid');
    const emptyState = document.getElementById('products-empty');
    const loader = document.getElementById('loader');
    const panel = document.getElementById('products-panel');
    const count = document.getElementById('products-count');

    grid?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    loader?.classList.remove('hidden');

    try {
        const response = await fetch('/api/v1/products/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        loader?.classList.add('hidden');
        if (!response.ok) {
            showMessage('No se pudieron cargar los productos', true);
            return [];
        }

        const products = await response.json();
        count.textContent = `${products.length} producto${products.length === 1 ? '' : 's'}`;
        const showPanel = products.length > 0 || !profile || profile.partner_type !== 'especialista';
        panel.classList.toggle('hidden', !showPanel);

        if (!showPanel) return products;

        if (products.length === 0) {
            emptyState?.classList.remove('hidden');
        } else {
            grid.innerHTML = products.map(p => `
                <div class="card p-0 overflow-hidden flex flex-col ${!p.is_active ? 'opacity-60' : ''}">
                    <div class="h-48 bg-gray-100 dark:bg-gray-800 relative">
                        ${p.cover_image_url 
                            ? `<img src="${p.cover_image_url}" class="w-full h-full object-cover">`
                            : `<div class="flex items-center justify-center h-full text-gray-400">Sin foto</div>`
                        }
                        ${!p.is_active ? `<span class="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Inactivo</span>` : ''}
                    </div>
                    <div class="p-4 flex-1 flex flex-col">
                        <h4 class="font-bold text-lg mb-1 truncate">${p.name}</h4>
                        <p class="text-brand-primary font-bold mb-3">$${p.sale_price ? p.sale_price : p.price} ${p.sale_price ? `<span class="text-gray-400 line-through text-xs">$${p.price}</span>` : ''}</p>
                        <p class="text-xs text-gray-500 mb-4">Stock: ${p.stock}</p>
                        <div class="mt-auto flex gap-2">
                            <button onclick='openEditModal(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-bold py-2 rounded-xl transition-colors">
                                Editar
                            </button>
                            ${p.is_active ? `
                            <button onclick="deleteProduct('${p.id}')" class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-sm font-bold py-2 rounded-xl transition-colors">
                                Desactivar
                            </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `).join('');
            grid.classList.remove('hidden');
        }

        return products;
    } catch (error) {
        loader?.classList.add('hidden');
        showMessage('Error al cargar los productos', true);
        return [];
    }
}

window.openEditModal = function(product) {
    currentProduct = product; // Guardar producto actual
    newProductPhotos = []; // Resetear fotos nuevas
    document.getElementById('product-modal-title').textContent = 'Editar Producto';
    document.getElementById('product_id').value = product.id;
    document.getElementById('name').value = product.name;
    document.getElementById('description').value = product.description || '';
    document.getElementById('price').value = product.price;
    document.getElementById('sale_price').value = product.sale_price || '';
    document.getElementById('stock').value = product.stock;
    document.getElementById('category').value = product.category || '';
    document.getElementById('size').value = product.size || '';
    document.getElementById('color').value = product.color || '';
    document.getElementById('condition').value = product.condition || 'nuevo';
    document.getElementById('photos-section').classList.remove('hidden');
    renderProductImagesWithPreview();
    document.getElementById('product-modal').classList.remove('hidden');
};

function renderProductImagesWithPreview() {
    const grid = document.getElementById('images-grid');
    const existingImages = currentProduct?.images_urls || [];
    let html = '';

    // Imágenes existentes
    existingImages.forEach(url => {
        html += `
            <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                <img src="${url}" class="w-full h-full object-cover">
                ${url === currentProduct?.cover_image_url ? '<span class="absolute bottom-0 left-0 right-0 bg-brand-primary/80 text-white text-[10px] text-center py-0.5">Portada</span>' : ''}
                <button type="button" onclick="deleteExistingImage('${currentProduct?.id}', '${url}')" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    });

    // Previews de fotos nuevas
    newProductPhotos.forEach((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        html += `
            <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-pink-300">
                <img src="${previewUrl}" class="w-full h-full object-cover">
                <span class="absolute top-1 left-1 bg-pink-500 text-white text-[10px] px-1 py-0.5 rounded">Nueva</span>
                <button type="button" onclick="removeNewProductPhoto(${index})" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    });

    if (existingImages.length === 0 && newProductPhotos.length === 0) {
        html = '<p class="text-sm text-gray-400">No hay fotos subidas.</p>';
    }

    grid.innerHTML = html;
}

window.removeNewProductPhoto = function(index) {
    newProductPhotos.splice(index, 1);
    renderProductImagesWithPreview();
};

window.deleteExistingImage = async function (productId, imageUrl) {
    const confirmed = await showConfirmModal('Eliminar foto', '¿Seguro que quieres eliminar esta foto?');
    if (!confirmed) return;
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/products/${productId}/images?image_url=${encodeURIComponent(imageUrl)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const prodResponse = await fetch(`/api/v1/products/${productId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (prodResponse.ok) {
                currentProduct = await prodResponse.json();
                renderProductImagesWithPreview();
                await loadProducts();
            }
        }
    } catch (error) {
        showMessage('Error al eliminar la imagen', true);
    }
};

function renderImages(product) {
    const grid = document.getElementById('images-grid');
    const imagesUrls = product.images_urls || [];

    if (imagesUrls.length === 0) {
        grid.innerHTML = '<p class="text-sm text-gray-400">No hay fotos subidas.</p>';
        return;
    }

    grid.innerHTML = imagesUrls.map(url => `
        <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
            <img src="${url}" class="w-full h-full object-cover">
            ${url === product.cover_image_url ? '<span class="absolute bottom-0 left-0 right-0 bg-brand-primary/80 text-white text-[10px] text-center py-0.5">Portada</span>' : ''}
            <button type="button" onclick="deleteImage('${product.id}', '${url}')" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    `).join('');
}

window.deleteImage = async function(productId, imageUrl) {
    if (!confirm('¿Seguro que quieres eliminar esta foto?')) return;
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/products/${productId}/images?image_url=${encodeURIComponent(imageUrl)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const prodResponse = await fetch(`/api/v1/products/${productId}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (prodResponse.ok) {
                const prod = await prodResponse.json();
                renderImages(prod);
                await loadProducts();
            }
        }
    } catch (error) {
        alert('Error al eliminar la imagen');
    }
};

window.deleteProduct = async function (id) {
    const confirmed = await showConfirmModal('Desactivar producto', '¿Seguro que deseas desactivar este producto? Ya no será visible en el marketplace.');
    if (!confirmed) return;
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Producto desactivado', false);
            await loadProducts();
        } else {
            showMessage('Error al desactivar', true);
        }
    } catch (error) {
        showMessage('Error de conexión', true);
    }
};

async function loadCompanyInfo() {
    const token = localStorage.getItem('access_token');
    const section = document.getElementById('company-info');
    if (!section) return null;

    try {
        let company = null;
        let profile = null;
        const response = await fetch('/api/v1/companies/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            company = await response.json();
        } else {
            console.error('[Company Load] /companies/me failed', response.status, response.statusText);
            const errorBody = await response.text().catch(() => null);
            if (errorBody) console.error('[Company Load] Body:', errorBody);
        }

        // Always fetch profile data
        const profileResponse = await fetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!profileResponse.ok) {
            console.error('[Company Load] /auth/me failed', profileResponse.status, profileResponse.statusText);
            const profileBody = await profileResponse.text().catch(() => null);
            if (profileBody) console.error('[Company Load] Auth Me body:', profileBody);

            section.innerHTML = '<div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">No se pudo cargar la información de la empresa. Intenta recargar la página.</div>';
            return null;
        }

        profile = await profileResponse.json();

        const display = company || profile;
        const companyName = display.business_name || display.username || 'Mi Empresa';
        const companyBio = company ? display.description : display.partner_bio || display.bio || 'Describe brevemente qué ofrece tu empresa al cliente.';
        const operationZone = display.operation_zone || 'Zona no definida';
        const partnerType = display.partner_type || 'Socio';
        const phone = display.phone || 'No registrado';
        const productCategories = Array.isArray(display.product_categories ? display.product_categories : display.partner_product_categories) && (display.product_categories || display.partner_product_categories).length > 0 ? (display.product_categories || display.partner_product_categories).join(', ') : '';
        const serviceCategories = Array.isArray(display.service_categories ? display.service_categories : display.partner_service_categories) && (display.service_categories || display.partner_service_categories).length > 0 ? (display.service_categories || display.partner_service_categories).join(', ') : '';
        const avatarUrl = display.avatar_url || DEFAULT_COMPANY_IMAGE;

        section.innerHTML = `
            <div class="rounded-3xl border border-pink-100/60 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-surface p-8 shadow-sm">
                <div class="flex flex-col xl:flex-row gap-6 xl:items-center">
                    <div class="h-28 w-28 rounded-3xl overflow-hidden bg-gray-100 border border-gray-200 dark:border-valedissed-dark-border flex-shrink-0">
                        <img id="company-avatar-img" src="${avatarUrl}" alt="Foto de empresa" class="object-cover w-full h-full">
                    </div>
                    <div class="space-y-3 flex-1">
                        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <p class="text-xs uppercase tracking-[0.3em] text-gray-400">Perfil de Empresa</p>
                                <h2 class="text-3xl font-serif font-bold text-brand-secondary dark:text-gray-100">${companyName}</h2>
                            </div>
                            <button id="toggle-company-edit-btn" class="btn-vld-secondary py-3">Editar información</button>
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-300 leading-7">${companyBio}</p>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 text-sm text-gray-600 dark:text-gray-300">
                            <div><span class="block font-semibold text-gray-900 dark:text-white">Tipo</span>${partnerType}</div>
                            <div><span class="block font-semibold text-gray-900 dark:text-white">Zona</span>${operationZone}</div>
                            <div><span class="block font-semibold text-gray-900 dark:text-white">Teléfono</span>${phone}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="space-y-4">
                <div class="rounded-3xl border border-gray-100 dark:border-valedissed-dark-border bg-gray-50 dark:bg-valedissed-dark-elevated p-6 shadow-sm">
                    <h3 class="text-lg font-semibold text-brand-dark dark:text-gray-100 mb-3">Especialidades de la empresa</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                        <div><span class="font-semibold">Productos</span><br>${productCategories || 'No definidas'}</div>
                        <div><span class="font-semibold">Servicios</span><br>${serviceCategories || 'No definidas'}</div>
                    </div>
                </div>
                <div class="rounded-3xl border border-gray-100 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-surface p-6 shadow-sm">
                    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 class="text-lg font-semibold text-brand-dark dark:text-gray-100">Cambio de nombre de empresa</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Solicita la aprobación administrativa para cambiar tu nombre comercial.</p>
                        </div>
                        <button id="company-name-request-btn" class="btn-vld-primary py-3">Solicitar nombre</button>
                    </div>
                </div>
                <div id="company-edit-panel" class="hidden rounded-3xl border border-gray-100 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-surface p-6 shadow-sm">
                    <div class="space-y-6">
                        <div>
                            <h3 class="text-lg font-semibold text-brand-dark dark:text-gray-100">Editar información de la empresa</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Puedes actualizar los datos generales aquí. El nombre comercial se actualiza mediante solicitud.</p>
                        </div>
                        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div class="lg:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre comercial</label>
                                <input id="company-name-input" type="text" value="${companyName}" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary" disabled>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
                                <input id="company-phone-input" type="text" value="${phone}" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zona de operación</label>
                                <input id="company-zone-input" type="text" value="${operationZone}" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary">
                            </div>
                            <div class="lg:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Descripción de la empresa</label>
                                <textarea id="company-bio-input" rows="4" class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary">${companyBio}</textarea>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorías de productos</label>
                                <input id="company-product-categories" type="text" value="${productCategories}" placeholder="maquillaje, cabello..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categorías de servicios</label>
                                <input id="company-service-categories" type="text" value="${serviceCategories}" placeholder="spa, uñas..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-valedissed-dark-border bg-transparent dark:text-white focus:ring-2 focus:ring-brand-primary">
                            </div>
                            <div class="lg:col-span-2">
                                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Foto de la empresa</label>
                                <div class="flex items-center gap-3">
                                    <button type="button" id="company-avatar-button" class="btn-vld-secondary py-3">Seleccionar nueva foto</button>
                                    <span id="company-avatar-status" class="text-sm text-gray-500 dark:text-gray-400"></span>
                                </div>
                                <input type="file" id="company-avatar-input" accept="image/*" class="hidden">
                            </div>
                        </div>
                        <div class="flex justify-end">
                            <button id="company-save-info-btn" class="btn-vld-primary py-3">Guardar información</button>
                        </div>
                        <div id="company-request-message" class="hidden text-sm"></div>
                    </div>
                </div>
            </div>
        `;

        const toggleBtn = document.getElementById('toggle-company-edit-btn');
        const editPanel = document.getElementById('company-edit-panel');
        const companyPhoneInput = document.getElementById('company-phone-input');
        const companyZoneInput = document.getElementById('company-zone-input');
        const companyBioInput = document.getElementById('company-bio-input');
        const companyProductCategories = document.getElementById('company-product-categories');
        const companyServiceCategories = document.getElementById('company-service-categories');
        const companySaveBtn = document.getElementById('company-save-info-btn');
        const companyNameRequestBtn = document.getElementById('company-name-request-btn');
        const companyAvatarInput = document.getElementById('company-avatar-input');
        const companyAvatarButton = document.getElementById('company-avatar-button');
        const companyAvatarStatus = document.getElementById('company-avatar-status');
        const companyRequestMessage = document.getElementById('company-request-message');

        toggleBtn?.addEventListener('click', () => {
            editPanel.classList.toggle('hidden');
            toggleBtn.textContent = editPanel.classList.contains('hidden') ? 'Editar información' : 'Ocultar formulario';
        });

        companySaveBtn?.addEventListener('click', async () => {
            const payload = {
                phone: companyPhoneInput.value,
                operation_zone: companyZoneInput.value,
                description: companyBioInput.value,
                product_categories: companyProductCategories.value.split(',').map((item) => item.trim()).filter(Boolean),
                service_categories: companyServiceCategories.value.split(',').map((item) => item.trim()).filter(Boolean)
            };

            companySaveBtn.disabled = true;
            companySaveBtn.textContent = 'Guardando...';
            companyRequestMessage.classList.add('hidden');

            try {
                const updateResponse = await fetch('/api/v1/companies/me', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                const result = await updateResponse.json();

                if (updateResponse.ok) {
                    showMessage('Información de empresa actualizada', false);
                    await loadCompanyInfo();
                } else {
                    companyRequestMessage.textContent = result.detail || 'No se pudo actualizar la información.';
                    companyRequestMessage.className = 'mt-4 text-sm text-red-600 dark:text-red-400';
                    companyRequestMessage.classList.remove('hidden');
                }
            } catch (error) {
                companyRequestMessage.textContent = 'Error de conexión al guardar.';
                companyRequestMessage.className = 'mt-4 text-sm text-red-600 dark:text-red-400';
                companyRequestMessage.classList.remove('hidden');
            } finally {
                companySaveBtn.disabled = false;
                companySaveBtn.textContent = 'Guardar información';
            }
        });

        companyNameRequestBtn?.addEventListener('click', async () => {
            const newName = document.getElementById('company-name-input').value.trim();
            if (!newName) {
                companyRequestMessage.textContent = 'Ingresa un nombre válido.';
                companyRequestMessage.className = 'mt-4 text-sm text-red-600 dark:text-red-400';
                companyRequestMessage.classList.remove('hidden');
                return;
            }

            companyNameRequestBtn.disabled = true;
            companyNameRequestBtn.textContent = 'Enviando solicitud...';
            companyRequestMessage.classList.add('hidden');

            try {
                const payload = {
                    partner_type: profile.partner_type || 'vendedor',
                    business_name: newName,
                    partner_phone: profile.phone || '',
                    operation_zone: profile.operation_zone || 'No especificada',
                    years_experience: profile.years_experience || 0,
                    bio: profile.partner_bio || profile.bio || 'Solicitud de actualización de nombre de empresa.',
                    partner_product_categories: profile.partner_product_categories || [],
                    partner_service_categories: profile.partner_service_categories || [],
                    certification_url: profile.certification_url || null,
                    id_face_url: profile.id_face_url || null
                };

                const nameChangeRes = await fetch('/api/v1/partner/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });
                const result = await nameChangeRes.json();

                if (nameChangeRes.ok) {
                    companyRequestMessage.textContent = 'Solicitud enviada. El equipo administrativo la revisará pronto.';
                    companyRequestMessage.className = 'mt-4 text-sm text-green-600 dark:text-green-400';
                } else {
                    companyRequestMessage.textContent = result.detail || 'No se pudo enviar la solicitud.';
                    companyRequestMessage.className = 'mt-4 text-sm text-red-600 dark:text-red-400';
                }
                companyRequestMessage.classList.remove('hidden');
            } catch (error) {
                companyRequestMessage.textContent = 'Error de conexión al enviar solicitud.';
                companyRequestMessage.className = 'mt-4 text-sm text-red-600 dark:text-red-400';
                companyRequestMessage.classList.remove('hidden');
            } finally {
                companyNameRequestBtn.disabled = false;
                companyNameRequestBtn.textContent = 'Solicitar nombre';
            }
        });

        if (companyAvatarButton && companyAvatarInput && companyAvatarStatus) {
            companyAvatarButton.addEventListener('click', () => companyAvatarInput.click());
            companyAvatarInput.addEventListener('change', async () => {
                const file = companyAvatarInput.files[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);

                companyAvatarStatus.textContent = 'Subiendo...';
                companyAvatarButton.disabled = true;

                try {
                    const uploadResponse = await fetch('/api/v1/companies/me/avatar', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const uploadData = await uploadResponse.json();
                    if (uploadResponse.ok) {
                        const avatarImg = document.getElementById('company-avatar-img');
                        if (avatarImg) avatarImg.src = uploadData.avatar_url || DEFAULT_COMPANY_IMAGE;
                        companyAvatarStatus.textContent = 'Foto de empresa actualizada.';
                        companyAvatarStatus.className = 'text-sm text-green-600 dark:text-green-400';
                    } else {
                        companyAvatarStatus.textContent = uploadData.detail || 'Error al subir la foto.';
                        companyAvatarStatus.className = 'text-sm text-red-600 dark:text-red-400';
                    }
                } catch (error) {
                    companyAvatarStatus.textContent = 'Error de conexión al subir la foto.';
                    companyAvatarStatus.className = 'text-sm text-red-600 dark:text-red-400';
                } finally {
                    companyAvatarButton.disabled = false;
                    companyAvatarInput.value = '';
                }
            });
        }

        return profile;
    } catch (error) {
        console.error('[Company Load] Unexpected error', error);
        section.innerHTML = '<div class="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">Error al cargar la información de tu empresa.</div>';
        return null;
    }
}

function formatDuration(minutes) {
    if (typeof minutes !== 'number' || Number.isNaN(minutes)) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
}

async function loadServices() {
    const token = localStorage.getItem('access_token');
    const grid = document.getElementById('services-grid');
    const emptyState = document.getElementById('services-empty');
    const loader = document.getElementById('loader');
    const panel = document.getElementById('services-panel');
    const count = document.getElementById('services-count');

    grid?.classList.add('hidden');
    emptyState?.classList.add('hidden');
    loader?.classList.remove('hidden');

    try {
        const response = await fetch('/api/v1/services/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        loader?.classList.add('hidden');
        if (!response.ok) {
            showMessage('No se pudieron cargar los servicios', true);
            return [];
        }

        const services = await response.json();
        count.textContent = `${services.length} servicio${services.length === 1 ? '' : 's'}`;
        const profile = await fetch('/api/v1/auth/me', { headers: { 'Authorization': `Bearer ${token}` } })
            .then(r => r.ok ? r.json() : null)
            .catch(() => null);
        const showPanel = services.length > 0 || !profile || profile.partner_type !== 'vendedor';
        panel.classList.toggle('hidden', !showPanel);

        if (!showPanel) return services;

        if (services.length === 0) {
            emptyState?.classList.remove('hidden');
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
                            <button onclick='openServiceEditModal(${JSON.stringify(s).replace(/'/g, "&apos;")})' class="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-sm font-bold py-2 rounded-xl transition-colors">
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

        return services;
    } catch (error) {
        loader?.classList.add('hidden');
        showMessage('Error al cargar los servicios', true);
        return [];
    }
}

window.openServiceEditModal = function(service) {
    currentService = service; // Guardar servicio actual
    newServicePhotos = []; // Resetear fotos nuevas
    document.getElementById('service-modal-title').textContent = 'Editar Servicio';
    document.getElementById('service_id').value = service.id;
    document.getElementById('service-title').value = service.title;
    document.getElementById('service-description').value = service.description || '';
    document.getElementById('service-price').value = service.price;
    document.getElementById('service-duration_minutes').value = service.duration_minutes;
    document.getElementById('service-category').value = service.category || '';
    document.getElementById('service-modality').value = service.modality || 'estudio';
    document.getElementById('service-requirements').value = service.requirements || '';
    document.getElementById('service-photos-section').classList.remove('hidden');
    renderServiceImagesWithPreview();
    document.getElementById('service-modal').classList.remove('hidden');
};

function renderServiceImagesWithPreview() {
    const grid = document.getElementById('service-images-grid');
    const existingImages = currentService?.portfolio_images || [];
    let html = '';

    // Imágenes existentes
    existingImages.forEach(url => {
        html += `
            <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                <img src="${url}" class="w-full h-full object-cover">
                ${url === currentService?.cover_image_url ? '<span class="absolute bottom-0 left-0 right-0 bg-brand-primary/80 text-white text-[10px] text-center py-0.5">Portada</span>' : ''}
                <button type="button" onclick="deleteExistingServiceImage('${currentService?.id}', '${url}')" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    });

    // Previews de fotos nuevas
    newServicePhotos.forEach((file, index) => {
        const previewUrl = URL.createObjectURL(file);
        html += `
            <div class="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden border border-pink-300">
                <img src="${previewUrl}" class="w-full h-full object-cover">
                <span class="absolute top-1 left-1 bg-pink-500 text-white text-[10px] px-1 py-0.5 rounded">Nueva</span>
                <button type="button" onclick="removeNewServicePhoto(${index})" class="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-red-500 transition-colors">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
        `;
    });

    if (existingImages.length === 0 && newServicePhotos.length === 0) {
        html = '<p class="text-sm text-gray-400">No hay fotos subidas en el portafolio.</p>';
    }

    grid.innerHTML = html;
}

window.removeNewServicePhoto = function(index) {
    newServicePhotos.splice(index, 1);
    renderServiceImagesWithPreview();
};

window.deleteExistingServiceImage = async function (serviceId, imageUrl) {
    const confirmed = await showConfirmModal('Eliminar foto', '¿Seguro que quieres eliminar esta foto?');
    if (!confirmed) return;
    const token = localStorage.getItem('access_token');
    try {
        // Primero, necesitamos actualizar el portfolio_images array en el servicio
        const updatedPortfolio = currentService.portfolio_images.filter(url => url !== imageUrl);
        let updatedCover = currentService.cover_image_url;
        if (updatedCover === imageUrl) {
            updatedCover = updatedPortfolio.length > 0 ? updatedPortfolio[0] : null;
        }

        const response = await fetch(`/api/v1/services/${serviceId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                portfolio_images: updatedPortfolio,
                cover_image_url: updatedCover
            })
        });

        if (response.ok) {
            currentService = await response.json();
            renderServiceImagesWithPreview();
            await loadServices();
        }
    } catch (error) {
        showMessage('Error al eliminar la imagen', true);
    }
};

// Mantener la función antigua para compatibilidad
window.deleteServiceImage = function(serviceId, imageUrl) {
    deleteExistingServiceImage(serviceId, imageUrl);
};

window.deleteService = async function (id) {
    const confirmed = await showConfirmModal('Desactivar servicio', '¿Seguro que deseas desactivar este servicio?');
    if (!confirmed) return;
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/services/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Servicio desactivado', false);
            await loadServices();
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

let confirmModalResolve = null;
let confirmModalReject = null;

function showConfirmModal(title, message) {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-modal-title');
        const messageEl = document.getElementById('confirm-modal-message');
        const confirmBtn = document.getElementById('confirm-modal-confirm-btn');
        const cancelBtn = document.getElementById('confirm-modal-cancel-btn');
        const closeBtn = document.getElementById('close-confirm-modal-btn');
        const backdrop = document.getElementById('confirm-modal-backdrop');

        confirmModalResolve = resolve;
        confirmModalReject = reject;

        titleEl.textContent = title || 'Confirmar';
        messageEl.textContent = message || '¿Estás seguro?';

        const handleConfirm = () => {
            closeConfirmModal();
            resolve(true);
        };

        const handleCancel = () => {
            closeConfirmModal();
            resolve(false);
        };

        confirmBtn.onclick = handleConfirm;
        cancelBtn.onclick = handleCancel;
        closeBtn.onclick = handleCancel;
        backdrop.onclick = handleCancel;

        modal.classList.remove('hidden');
    });
}

function closeConfirmModal() {
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('hidden');
    confirmModalResolve = null;
    confirmModalReject = null;
}
