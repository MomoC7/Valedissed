/**
 * cart-manager.js
 * Gestor global del carrito de compras
 * Proporciona funciones para agregar, eliminar y gestionar items del carrito
 */

class CartManager {
    constructor() {
        this.API_BASE = '/api/v1/cart';
        this.token = localStorage.getItem('access_token');
    }

    /**
     * Obtiene todos los items del carrito del usuario
     */
    async getCart() {
        try {
            if (!this.token) return [];

            const response = await fetch(this.API_BASE, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('[CartManager] Error getting cart:', error);
            return [];
        }
    }

    /**
     * Agrega un producto al carrito
     */
    async addToCart(productId, quantity = 1) {
        try {
            if (!this.token) {
                showToast('Debes iniciar sesión', 'warning');
                return false;
            }

            const response = await fetch(this.API_BASE, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            if (response.ok) {
                showToast('Producto agregado al carrito', 'success');
                return true;
            } else if (response.status === 409) {
                // Producto ya existe
                const data = await response.json();
                showToast(data.detail || 'Producto ya está en el carrito', 'info');
                return true;
            } else {
                showToast('Error al agregar producto', 'error');
                return false;
            }
        } catch (error) {
            console.error('[CartManager] Error adding to cart:', error);
            showToast('Error al agregar producto', 'error');
            return false;
        }
    }

    /**
     * Actualiza la cantidad de un producto en el carrito
     */
    async updateQuantity(productId, quantity) {
        try {
            if (!this.token) return false;

            if (quantity < 1) {
                return await this.removeFromCart(productId);
            }

            const response = await fetch(`${this.API_BASE}/${productId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: quantity })
            });

            if (response.ok) {
                showToast('Cantidad actualizada', 'success');
                return true;
            } else {
                showToast('Error al actualizar cantidad', 'error');
                return false;
            }
        } catch (error) {
            console.error('[CartManager] Error updating quantity:', error);
            showToast('Error al actualizar cantidad', 'error');
            return false;
        }
    }

    /**
     * Elimina un producto del carrito
     */
    async removeFromCart(productId) {
        try {
            if (!this.token) return false;

            const response = await fetch(`${this.API_BASE}/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showToast('Producto eliminado del carrito', 'success');
                return true;
            } else {
                showToast('Error al eliminar producto', 'error');
                return false;
            }
        } catch (error) {
            console.error('[CartManager] Error removing from cart:', error);
            showToast('Error al eliminar producto', 'error');
            return false;
        }
    }

    /**
     * Limpia todo el carrito
     */
    async clearCart() {
        try {
            if (!this.token) return false;

            const response = await fetch(this.API_BASE, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                showToast('Carrito vaciado', 'success');
                return true;
            } else {
                showToast('Error al vaciar carrito', 'error');
                return false;
            }
        } catch (error) {
            console.error('[CartManager] Error clearing cart:', error);
            showToast('Error al vaciar carrito', 'error');
            return false;
        }
    }

    /**
     * Obtiene el total de items en el carrito
     */
    async getCartCount() {
        const cart = await this.getCart();
        return cart.reduce((total, item) => total + (item.quantity || 1), 0);
    }

    /**
     * Obtiene el total del carrito en dinero
     */
    async getCartTotal() {
        const cart = await this.getCart();
        return cart.reduce((total, item) => {
            const price = parseFloat(item.product?.price || 0);
            const quantity = item.quantity || 1;
            return total + (price * quantity);
        }, 0);
    }
}

// Instancia global del cart manager
const cartManager = new CartManager();

/**
 * Funciones auxiliares para agregar el carrito a elementos HTML
 */

/**
 * Agrega botón "Agregar al carrito" a un producto
 * Uso: <button onclick="addProductToCart('product-uuid')">Agregar al carrito</button>
 */
async function addProductToCart(productId) {
    const success = await cartManager.addToCart(productId, 1);
    if (success) {
        updateCartBadge();
    }
}

/**
 * Actualiza el badge del carrito en la navbar
 */
async function updateCartBadge() {
    const cartCount = await cartManager.getCartCount();
    const badge = document.getElementById('cart-badge');
    
    if (badge) {
        if (cartCount > 0) {
            badge.textContent = cartCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

// Actualizar badge al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCartBadge();
});

// Actualizar badge cuando vuelves a la pestaña (por si cambiaste el carrito en otra ventana)
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        updateCartBadge();
    }
});
