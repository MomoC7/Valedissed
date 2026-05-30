// seller_profile.js

function getSellerIdFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
}

function formatPrice(price) {
    const num = Number(price) || 0;
    return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function renderSellerProduct(product) {
    const card = document.createElement('article');
    card.className = 'rounded-[2rem] overflow-hidden border border-pink-100/60 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-surface shadow-sm';
    const img = product.cover_image_url ? `<img src="${product.cover_image_url}" alt="${product.name}" class="object-cover w-full h-52">` : `<div class="h-52 bg-gray-100 dark:bg-valedissed-dark-elevated flex items-center justify-center text-gray-400">Sin imagen</div>`;
    card.innerHTML = `
        <a href="/product/${product.id}" class="block group">
            <div class="overflow-hidden">${img}</div>
            <div class="p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-pink-500 mb-2">${product.category || 'Categoría'}</p>
                <h3 class="text-lg font-semibold text-brand-dark dark:text-gray-100 mb-2">${product.name || 'Producto'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">$ ${formatPrice(product.price)}</p>
            </div>
        </a>
    `;
    return card;
}

async function loadSellerProfile() {
    const sellerId = getSellerIdFromPath();
    if (!sellerId) return;

    const [userResponse, productsResponse] = await Promise.all([
        fetch(`/api/v1/users/${sellerId}`),
        fetch(`/api/v1/products/seller/${sellerId}`)
    ]);

    if (userResponse.ok) {
        const user = await userResponse.json();
        document.getElementById('seller-title').textContent = user.business_name || user.username || 'Vendedor';
        document.getElementById('seller-bio').textContent = user.partner_bio || user.bio || 'Tienda exclusiva con selección premium.';
        document.getElementById('seller-zone').textContent = user.operation_zone || 'Medellín y alrededores';
    }

    const productsGrid = document.getElementById('seller-products-list');
    const noProducts = document.getElementById('seller-no-products');
    if (productsResponse.ok) {
        const products = await productsResponse.json();
        productsGrid.innerHTML = '';
        if (products.length === 0) {
            noProducts.classList.remove('hidden');
        } else {
            noProducts.classList.add('hidden');
            products.forEach(product => productsGrid.appendChild(renderSellerProduct(product)));
            document.getElementById('seller-products-count').textContent = products.length;
        }
    } else {
        noProducts.classList.remove('hidden');
    }
}

window.addEventListener('DOMContentLoaded', loadSellerProfile);
