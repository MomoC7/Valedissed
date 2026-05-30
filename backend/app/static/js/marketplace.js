/**
 * marketplace.js
 * Lógica del marketplace: tabs, búsqueda, protección de acciones autenticadas
 */

// ===== TAB SWITCHING =====
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            // Remover clase active de todos los botones
            tabButtons.forEach(btn => {
                btn.classList.remove('active', 'border-b-2', 'border-brand-primary', 'text-brand-primary');
                btn.classList.add('text-gray-600', 'hover:text-gray-900');
            });
            
            // Agregar clase active al botón clickeado
            this.classList.add('active', 'border-b-2', 'border-brand-primary', 'text-brand-primary');
            this.classList.remove('text-gray-600', 'hover:text-gray-900');
            
            // Ocultar todos los tabs
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // Mostrar el tab seleccionado
            document.getElementById(`${tabName}-content`).classList.remove('hidden');
        });
    });
}

// ===== AUTENTICACIÓN REQUERIDA =====
function initActionButtons() {
    const authModal = document.getElementById('auth-modal');
    const closeModalBtn = document.getElementById('close-modal');

    document.addEventListener('click', function(e) {
        const button = e.target.closest('.action-btn');
        if (!button) {
            return;
        }

        e.preventDefault();
        const token = localStorage.getItem('access_token');
        const action = button.dataset.action;
        const type = button.dataset.type;

        if (!token) {
            authModal.classList.remove('hidden');
        } else {
            handleAction(action, type);
        }
    });

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', function() {
            authModal.classList.add('hidden');
        });
    }

    if (authModal) {
        authModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.add('hidden');
            }
        });
    }
}

// ===== MANEJAR ACCIONES AUTENTICADAS =====
function handleAction(action, type) {
    console.log(`Acción: ${action} en ${type}`);
    
    // Aquí se conectaría con el backend para:
    // - buy: procesar compra de producto
    // - book: agendar servicio
    
    if (action === 'buy') {
        alert('Procesando compra... (próximamente)');
    } else if (action === 'book') {
        alert('Agendando servicio... (próximamente)');
    }
}

// ===== BÚSQUEDA Y FILTRADO =====
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const categoryFilter = document.getElementById('category-filter');

    if (searchInput) {
        searchInput.addEventListener('input', loadProducts);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadProducts);
    }
}

async function loadProducts() {
    const searchTerm = document.getElementById('search-input')?.value || '';
    const category = document.getElementById('category-filter')?.value || '';

    const params = new URLSearchParams();
    if (searchTerm) params.append('search', searchTerm);
    if (category) params.append('category', category);

    const endpoint = `/api/v1/products${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(endpoint);
    const products = response.ok ? await response.json() : [];

    renderProducts(products);
}

function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    const emptyMessage = document.getElementById('no-products');

    grid.innerHTML = '';

    if (!products || products.length === 0) {
        emptyMessage.classList.remove('hidden');
        return;
    }

    emptyMessage.classList.add('hidden');

    products.forEach(product => {
        const productCard = document.createElement('div');
        productCard.className = 'card-vld bg-white dark:bg-valedissed-dark-surface rounded-3xl shadow-sm overflow-hidden border border-pink-100/20 dark:border-valedissed-dark-border';

        const coverImage = product.cover_image_url || '';
        const imageMarkup = coverImage
            ? `<img src="${coverImage}" alt="${product.name}" class="object-cover w-full h-64" />`
            : `
                <div class="bg-gray-50 dark:bg-valedissed-dark-elevated h-64 flex items-center justify-center relative overflow-hidden group">
                    <span class="text-6xl group-hover:scale-110 transition-transform duration-700">💄</span>
                    <div class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>`;

        const businessName = product.profiles?.business_name || product.profiles?.username || 'Vendedor';
        const category = product.category || 'Sin categoría';
        const rating = product.rating || 5;
        const reviewCount = product.review_count || 0;

        productCard.innerHTML = `
            <div class="relative overflow-hidden">
                ${imageMarkup}
            </div>
            <div class="p-7">
                <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">${product.name || 'Sin nombre'}</h3>
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <span class="inline-flex items-center rounded-full bg-pink-50 text-pink-700 dark:bg-pink-900/20 dark:text-pink-200 text-[11px] uppercase tracking-[0.2em] px-3 py-1">${category}</span>
                    <span class="text-sm text-brand-primary font-semibold">${businessName}</span>
                </div>
                <p class="text-gray-500 dark:text-gray-400 text-sm mb-5 line-clamp-3">${product.description || 'Sin descripción disponible.'}</p>
                <div class="flex justify-between items-center mb-6">
                    <span class="text-2xl font-bold text-brand-primary">$ ${formatPrice(product.price)}</span>
                    <div class="flex items-center gap-2 text-xs">
                        <span class="text-yellow-500">${renderRating(rating)}</span>
                        <span class="text-gray-600 dark:text-gray-400">(${reviewCount})</span>
                    </div>
                </div>
                <div class="flex flex-col gap-3">
                    <button class="btn-vld-primary w-full action-btn" data-action="buy" data-type="product">
                        Comprar
                    </button>
                    <button class="btn-vld-secondary w-full" onclick="window.location.href='/product/${product.id}'">
                        Ver Detalles
                    </button>
                </div>
            </div>
        `;

        grid.appendChild(productCard);
    });
}

function renderRating(rating) {
    const stars = Math.min(Math.max(Math.round(rating || 4), 0), 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function formatPrice(price) {
    const numPrice = parseFloat(price) || 0;
    return numPrice.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// ===== INICIALIZACIÓN =====
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initActionButtons();
    initSearch();
    loadProducts();
    console.log('Marketplace inicializado');
});
