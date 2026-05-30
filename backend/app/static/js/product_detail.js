// product_detail.js

function getProductIdFromPath() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1];
}

function renderRatingStars(rating) {
    const stars = Math.min(Math.max(Math.round(rating), 0), 5);
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
}

function formatPrice(price) {
    const num = Number(price) || 0;
    return num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'rounded-[2rem] overflow-hidden border border-pink-100/60 dark:border-valedissed-dark-border bg-white dark:bg-valedissed-dark-surface shadow-sm';

    const image = product.cover_image_url || '';
    const coverHtml = image ? `<img src="${image}" alt="${product.name}" class="object-cover w-full h-52">` : `<div class="h-52 bg-gray-100 dark:bg-valedissed-dark-elevated flex items-center justify-center text-gray-400">Sin imagen</div>`;

    card.innerHTML = `
        <a href="/product/${product.id}" class="block group">
            <div class="overflow-hidden">${coverHtml}</div>
            <div class="p-5">
                <p class="text-xs uppercase tracking-[0.2em] text-pink-500 mb-2">${product.category || 'Categoría'}</p>
                <h3 class="text-lg font-semibold text-brand-dark dark:text-gray-100 mb-2">${product.name || 'Producto'}</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">${product.description || 'Descripción breve.'}</p>
                <div class="flex items-center justify-between gap-3">
                    <span class="text-lg font-bold text-brand-primary">$ ${formatPrice(product.price)}</span>
                    <span class="text-yellow-500 text-sm">${renderRatingStars(product.rating || 5)}</span>
                </div>
            </div>
        </a>
    `;
    return card;
}

async function loadProductDetail() {
    const productId = getProductIdFromPath();
    const response = await fetch(`/api/v1/products/${productId}`);

    if (!response.ok) {
        document.getElementById('product-title').textContent = 'Producto no encontrado';
        document.getElementById('product-description').textContent = 'Este producto ya no está disponible o no existe.';
        return;
    }

    const product = await response.json();
    const images = [];
    if (product.cover_image_url) images.push(product.cover_image_url);
    if (Array.isArray(product.images_urls)) images.push(...product.images_urls.filter(Boolean));

    const sellerId = product.seller_id;
    const sellerName = product.profiles?.business_name || product.profiles?.username || 'Vendedor destacado';

    document.getElementById('product-category').textContent = product.category || 'Sin categoría';
    document.getElementById('seller-badge').textContent = sellerName;
    document.getElementById('product-title').textContent = product.name || 'Producto sin nombre';
    document.getElementById('product-description').textContent = product.description || 'Descripción no disponible.';
    document.getElementById('product-price').textContent = `$ ${formatPrice(product.price)}`;
    document.getElementById('product-stock').textContent = product.stock !== undefined ? `${product.stock} en stock` : 'Disponible';
    const rating = product.rating || 5;
    const reviewCount = product.review_count || 0;
    document.getElementById('product-rating').textContent = renderRatingStars(rating);
    document.getElementById('product-review-count').textContent = `(${reviewCount} reseñas)`;
    document.getElementById('seller-name').textContent = sellerName;
    document.getElementById('seller-profile-button').href = `/seller/${sellerId}`;
    document.getElementById('seller-profile-link').href = `/seller/${sellerId}`;

    const mainImage = document.getElementById('main-image');
    const gallery = document.getElementById('gallery-thumbnails');
    mainImage.innerHTML = '';

    if (images.length === 0) {
        mainImage.innerHTML = '<div class="h-full w-full flex items-center justify-center text-gray-400">Sin imagen disponible</div>';
    } else {
        const mainImg = document.createElement('img');
        mainImg.src = images[0];
        mainImg.alt = product.name || 'Producto';
        mainImg.className = 'object-cover w-full h-full';
        mainImage.appendChild(mainImg);

        gallery.innerHTML = '';
        images.forEach((src, index) => {
            const thumb = document.createElement('button');
            thumb.type = 'button';
            thumb.className = 'overflow-hidden rounded-3xl border border-pink-100/60 dark:border-valedissed-dark-border focus:outline-none focus:ring-2 focus:ring-brand-primary/30';
            thumb.innerHTML = `<img src="${src}" alt="Imagen ${index + 1}" class="object-cover w-full h-24">`;
            thumb.addEventListener('click', () => {
                mainImg.src = src;
            });
            gallery.appendChild(thumb);
        });
    }

    const attributesEl = document.getElementById('product-attributes');
    const attrs = [
        { label: 'Categoría', value: product.category || 'No definida' },
        { label: 'Vendedor', value: sellerName },
        { label: 'Marca', value: product.brand || 'Elegance' },
        { label: 'Precio', value: `$ ${formatPrice(product.price)}` },
        { label: 'Stock', value: product.stock !== undefined ? product.stock : 'Disponible' }
    ];
    attributesEl.innerHTML = attrs.map(item => `<li class="flex justify-between border-b border-gray-100 dark:border-valedissed-dark-border pb-3 text-sm"><span class="text-gray-500">${item.label}</span><span class="font-semibold text-gray-900 dark:text-gray-100">${item.value}</span></li>`).join('');

    document.getElementById('buy-now-button').addEventListener('click', () => {
        alert('Compra próximamente. ¡Gracias por tu interés!');
    });

    await loadSellerProducts(sellerId, product.id);
    await loadRelatedProducts(product.category, product.id, sellerId);
}

async function loadSellerProducts(sellerId, currentProductId) {
    const response = await fetch(`/api/v1/products/seller/${sellerId}`);
    if (!response.ok) return;
    const products = await response.json();
    const filtered = products.filter(item => item.id !== currentProductId).slice(0, 4);
    const grid = document.getElementById('seller-products-grid');
    const empty = document.getElementById('no-seller-products');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    filtered.forEach(product => grid.appendChild(createProductCard(product)));
}

async function loadRelatedProducts(category, currentProductId, sellerId) {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    const response = await fetch(`/api/v1/products?${params.toString()}`);
    if (!response.ok) return;
    const products = await response.json();
    const filtered = products.filter(item => item.id !== currentProductId && item.seller_id !== sellerId).slice(0, 4);
    const grid = document.getElementById('related-products-grid');
    const empty = document.getElementById('no-related-products');
    grid.innerHTML = '';

    if (filtered.length === 0) {
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');
    filtered.forEach(product => grid.appendChild(createProductCard(product)));
}

window.addEventListener('DOMContentLoaded', loadProductDetail);
