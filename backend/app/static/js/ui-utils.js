/**
 * ui-utils.js
 * Utilidades globales de UI corregidas.
 */

function createToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Aseguramos visibilidad absoluta con estilos inline y clases
        container.className = 'fixed bottom-5 right-5 z-[999999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }
    return container;
}

window.clearToasts = function() {
    const container = document.getElementById('toast-container');
    if (container) container.innerHTML = '';
};

window.showToast = function(message, type = 'info') {
    if (!message) {
        console.warn('showToast: Mensaje vacío.');
        return;
    }

    const container = createToastContainer();
    const toast = document.createElement('div');
    
    // Clases base: usamos pointer-events-auto para que el toast sea interactivo
    toast.className = `
        flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl 
        backdrop-blur-xl border border-white/20 dark:border-white/10
        transition-all duration-500 transform translate-y-0 opacity-100
        max-w-md w-full pointer-events-auto
    `;

    // Estilos según tipo
    let icon = '✨';
    let borderAccent = 'border-l-4 border-l-brand-gold';

    if (type === 'success') {
        icon = '✅';
        borderAccent = 'border-l-4 border-l-green-500';
    } else if (type === 'error') {
        icon = '❌';
        borderAccent = 'border-l-4 border-l-red-500';
    } else if (type === 'warning') {
        icon = '⚠️';
        borderAccent = 'border-l-4 border-l-yellow-500';
    }

    // Aplicamos estilos combinados
    toast.classList.add(...borderAccent.split(' '));
    toast.style.backgroundColor = type === 'error' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(255, 255, 255, 0.95)';
    if (type !== 'error') toast.style.color = '#1f2937';

    toast.innerHTML = `
        <span class="text-xl">${icon}</span>
        <div class="flex-1 text-sm font-bold leading-relaxed">${message}</div>
        <button onclick="this.parentElement.remove()" class="ml-4 opacity-50 hover:opacity-100 transition-opacity">
            ✕
        </button>
    `;

    container.appendChild(toast);

    // Auto-eliminar
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 500);
    }, 5000);

    return toast;
};  