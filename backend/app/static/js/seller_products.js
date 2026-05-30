document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticación
    const token = localStorage.getItem('access_token');
    if (!token) {
        window.location.replace('/login');
        return;
    }

    loadProducts();

    // Modal logic
    const modal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const closeBtn = document.getElementById('close-modal-btn');
    const backdrop = document.getElementById('modal-backdrop');
    
    const openModal = () => {
        document.getElementById('product-form').reset();
        document.getElementById('product_id').value = '';
        document.getElementById('modal-title').textContent = 'Nuevo Producto';
        document.getElementById('photos-section').classList.add('hidden'); // Ocultar fotos hasta crear el producto
        modal.classList.remove('hidden');
    };
    
    const closeModal = () => modal.classList.add('hidden');
    
    addBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);

    // Form logic
    const form = document.getElementById('product-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
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
        btn.disabled = true;
        btn.textContent = 'Guardando...';

        try {
            const url = productId ? `/api/v1/products/${productId}` : '/api/v1/products/';
            const method = productId ? 'PUT' : 'POST';

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
                showMessage('Producto guardado exitosamente', false);
                if (!productId) {
                    // Si es nuevo, abrimos el modo edición para que pueda subir fotos
                    openEditModal(data);
                } else {
                    closeModal();
                }
                loadProducts();
            } else {
                const err = await response.json();
                showMessage(err.detail || 'Error al guardar el producto', true);
            }
        } catch (error) {
            showMessage('Error de conexión', true);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Guardar Producto';
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

        const productId = document.getElementById('product_id').value;
        if (!productId) return;

        const formData = new FormData();
        formData.append('file', file);
        // Si no hay imágenes en el grid, esta es la portada
        const isCover = document.getElementById('images-grid').children.length === 0;
        formData.append('is_cover', isCover);

        const status = document.getElementById('upload-status');
        status.textContent = 'Subiendo...';
        uploadBtn.disabled = true;

        try {
            const response = await fetch(`/api/v1/products/${productId}/images?is_cover=${isCover}`, {
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
                
                // Recargar producto para actualizar grid
                const prodResponse = await fetch(`/api/v1/products/${productId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (prodResponse.ok) {
                    const prod = await prodResponse.json();
                    renderImages(prod);
                    loadProducts(); // Refrescar grid principal
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

async function loadProducts() {
    const token = localStorage.getItem('access_token');
    const grid = document.getElementById('products-grid');
    const emptyState = document.getElementById('empty-state');
    const loader = document.getElementById('loader');

    grid.classList.add('hidden');
    emptyState.classList.add('hidden');
    loader.classList.remove('hidden');

    try {
        const response = await fetch('/api/v1/products/my', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const products = await response.json();
            loader.classList.add('hidden');

            if (products.length === 0) {
                emptyState.classList.remove('hidden');
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
        }
    } catch (error) {
        loader.classList.add('hidden');
        showMessage('Error al cargar los productos', true);
    }
}

window.openEditModal = function(product) {
    document.getElementById('modal-title').textContent = 'Editar Producto';
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
    renderImages(product);
    
    document.getElementById('product-modal').classList.remove('hidden');
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
            // Recargar producto para actualizar grid
            const prodResponse = await fetch(`/api/v1/products/${productId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (prodResponse.ok) {
                const prod = await prodResponse.json();
                renderImages(prod);
                loadProducts(); // Refrescar grid principal
            }
        }
    } catch (error) {
        alert('Error al eliminar la imagen');
    }
};

window.deleteProduct = async function(id) {
    if (!confirm('¿Seguro que deseas desactivar este producto? Ya no será visible en el marketplace.')) return;

    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showMessage('Producto desactivado', false);
            loadProducts();
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
