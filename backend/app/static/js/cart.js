// cart.js - Lógica del carrito de compras

document.addEventListener('DOMContentLoaded', () => {
    // Actualizar el contador del carrito al cargar la página si el usuario está logueado
    const token = localStorage.getItem('access_token');
    if (token) {
        updateCartBadgeCount();
    }
});

// Función para actualizar solo el badge numérico sin cargar todo el carrito
async function updateCartBadgeCount() {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    try {
        const response = await fetch('/api/v1/cart/count', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateBadgeUI(data.count);
        }
    } catch (error) {
        console.error('Error fetching cart count:', error);
    }
}

function updateBadgeUI(count) {
    const navCount = document.getElementById('nav-cart-count');
    const drawerCount = document.getElementById('cart-drawer-count');
    
    if (navCount) {
        navCount.textContent = count;
        if (count > 0) {
            navCount.classList.remove('hidden');
        } else {
            navCount.classList.add('hidden');
        }
    }
    
    if (drawerCount) {
        drawerCount.textContent = count;
    }
}

// Función principal para abrir el drawer y cargar los ítems
window.loadCart = async function() {
    const token = localStorage.getItem('access_token');
    
    // Si no está logueado, mostrar mensaje o redirigir
    if (!token) {
        alert('Debes iniciar sesión para usar el carrito.');
        window.location.href = '/login';
        return;
    }

    const loader = document.getElementById('cart-loader');
    const itemsList = document.getElementById('cart-items-list');
    const emptyState = document.getElementById('cart-empty-state');
    const footer = document.getElementById('cart-drawer-footer');
    
    loader.classList.remove('hidden');
    itemsList.classList.add('hidden');
    emptyState.classList.add('hidden');
    footer.classList.add('hidden');

    try {
        const response = await fetch('/api/v1/cart/', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const items = await response.json();
            loader.classList.add('hidden');

            if (items.length === 0) {
                emptyState.classList.remove('hidden');
                updateBadgeUI(0);
            } else {
                renderCartItems(items);
                itemsList.classList.remove('hidden');
                footer.classList.remove('hidden');
            }
        } else {
            loader.classList.add('hidden');
            itemsList.innerHTML = '<p class="text-red-500 text-center">Error al cargar el carrito.</p>';
            itemsList.classList.remove('hidden');
        }
    } catch (error) {
        loader.classList.add('hidden');
        itemsList.innerHTML = '<p class="text-red-500 text-center">Error de conexión.</p>';
        itemsList.classList.remove('hidden');
    }
};

function renderCartItems(items) {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total-price');
    let total = 0;
    let totalItems = 0;

    list.innerHTML = items.map(item => {
        const product = item.products;
        if (!product) return ''; // Por si hay datos huérfanos
        
        const price = product.sale_price || product.price;
        const subtotal = price * item.quantity;
        total += subtotal;
        totalItems += item.quantity;

        const imgUrl = product.cover_image_url || 'https://via.placeholder.com/150';

        return `
            <div class="flex gap-4 p-3 bg-white/50 dark:bg-valedissed-dark-elevated rounded-2xl border border-gray-100 dark:border-valedissed-dark-border relative group transition-all hover:shadow-md">
                <!-- Imagen -->
                <div class="w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img src="${imgUrl}" class="w-full h-full object-cover">
                </div>
                
                <!-- Info -->
                <div class="flex-1 flex flex-col justify-between py-0.5">
                    <div>
                        <h4 class="font-bold text-sm text-gray-900 dark:text-white leading-tight pr-6">${product.name}</h4>
                        <p class="text-[10px] text-gray-500 uppercase tracking-wider mt-1">${product.profiles?.business_name || 'Partner'}</p>
                    </div>
                    
                    <div class="flex items-center justify-between mt-2">
                        <span class="font-bold text-brand-primary">$${price.toFixed(2)}</span>
                        
                        <!-- Control de cantidad -->
                        <div class="flex items-center gap-2 bg-gray-100 dark:bg-valedissed-dark-surface rounded-full px-2 py-1">
                            <button onclick="updateCartQuantity('${item.id}', ${item.quantity - 1}, ${product.stock})" class="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-brand-primary shadow-sm disabled:opacity-50" ${item.quantity <= 1 ? 'disabled' : ''}>-</button>
                            <span class="text-xs font-bold w-4 text-center">${item.quantity}</span>
                            <button onclick="updateCartQuantity('${item.id}', ${item.quantity + 1}, ${product.stock})" class="w-5 h-5 flex items-center justify-center rounded-full bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-brand-primary shadow-sm disabled:opacity-50" ${item.quantity >= product.stock ? 'disabled' : ''}>+</button>
                        </div>
                    </div>
                </div>

                <!-- Botón eliminar -->
                <button onclick="removeFromCart('${item.id}')" class="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
                
                ${!product.is_active ? '<div class="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-10"><span class="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Producto no disponible</span></div>' : ''}
            </div>
        `;
    }).join('');

    totalEl.textContent = `$${total.toFixed(2)}`;
    updateBadgeUI(totalItems);
}

// Función global para actualizar cantidad
window.updateCartQuantity = async function(itemId, newQuantity, stock) {
    if (newQuantity <= 0) return;
    if (newQuantity > stock) {
        alert('No hay suficiente stock.');
        return;
    }

    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/cart/${itemId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity: newQuantity })
        });

        if (response.ok) {
            loadCart(); // Recargar el carrito para actualizar totales y UI
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
};

// Función global para eliminar ítem
window.removeFromCart = async function(itemId) {
    const token = localStorage.getItem('access_token');
    try {
        const response = await fetch(`/api/v1/cart/${itemId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            loadCart();
        }
    } catch (error) {
        console.error('Error removing item:', error);
    }
};

// Función global para que otros scripts (ej: marketplace) puedan agregar al carrito
window.addToCart = async function(productId, quantity = 1) {
    const token = localStorage.getItem('access_token');
    if (!token) {
        alert('Debes iniciar sesión para comprar.');
        window.location.href = '/login';
        return false;
    }

    try {
        const response = await fetch('/api/v1/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ product_id: productId, quantity: quantity })
        });

        if (response.ok) {
            // Abrir el drawer para dar feedback visual
            // (se asume que Alpine js expone cartOpen)
            if (typeof window.Alpine !== 'undefined') {
                const bodyEl = document.querySelector('body');
                if (bodyEl && bodyEl.__x) {
                    // Un pequeño hack para forzar el estado Alpine desde JS puro
                    document.body.dispatchEvent(new CustomEvent('cart-opened'));
                    // En su lugar, abrimos directamente y cargamos
                    const alpineData = window.Alpine.$data(document.body);
                    if (alpineData) alpineData.cartOpen = true;
                }
            }
            // Asegurarse de abrir y cargar
            loadCart();
            return true;
        } else {
            const err = await response.json();
            alert(err.detail || 'Error al agregar al carrito');
            return false;
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        return false;
    }
};
