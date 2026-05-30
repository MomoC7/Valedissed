/**
 * utils.js
 * Funciones de apoyo para la interfaz de perfil y notificaciones.
 */

/**
 * Muestra un mensaje en el contenedor de mensajes del perfil.
 * @param {string} msg - Mensaje a mostrar.
 * @param {boolean} isError - Si es un mensaje de error.
 */
export function showMessage(msg, isError = false) {
    const messageDiv = document.getElementById('profile-message');
    if (!messageDiv) return;

    messageDiv.textContent = msg;
    messageDiv.classList.remove('hidden', 'bg-red-50', 'text-red-600', 'bg-green-50', 'text-green-600');
    if (isError) {
        messageDiv.classList.add('bg-red-50', 'text-red-600');
    } else {
        messageDiv.classList.add('bg-green-50', 'text-green-600');
    }
}

/**
 * Muestra un mensaje en el contenedor de mensajes del formulario de socio.
 * @param {string} msg - Mensaje a mostrar.
 * @param {boolean} isError - Si es un mensaje de error.
 */
export function showPartnerMessage(msg, isError = false) {
    const msgDiv = document.getElementById('partner-form-message');
    if (!msgDiv) return;

    msgDiv.textContent = msg;
    msgDiv.classList.remove('hidden', 'bg-red-500/10', 'text-red-500', 'bg-green-500/10', 'text-green-500');
    msgDiv.classList.add(isError ? 'bg-red-500/10' : 'bg-green-500/10', isError ? 'text-red-500' : 'text-green-500');
}

/**
 * Verifica si el usuario debe recibir un recordatorio para subir certificados.
 * @param {Object} profile - Datos del perfil del usuario.
 */
export function checkGlobalCertificateReminder(profile) {
    if (!profile) return;

    // Validación estricta de propiedades para evitar errores de referencia
    const role = profile.role || 'cliente';
    const status = profile.status || 'active';
    const hasCert = profile.certification_url && profile.certification_url.trim() !== "";

    // Si ya envió solicitud (pending) o ya es socio (partner), pero no tiene certificados
    const needsCert = (status === 'pending' || role === 'partner') && !hasCert;

    if (needsCert) {
        // Evitar inyecciones duplicadas
        if (document.getElementById('vld-global-cert-reminder')) return;

        const reminder = document.createElement('div');
        reminder.id = 'vld-global-cert-reminder';
        
        // Diseño Corporativo con Glassmorphism y Animación
        reminder.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg animate-fadeIn';
        reminder.innerHTML = `
            <div class="bg-valedissed-dark-surface/95 backdrop-blur-2xl border border-valedissed-dark-gold/30 p-5 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-5 relative overflow-hidden">
                <!-- Acento decorativo -->
                <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-valedissed-dark-gold to-transparent"></div>
                
                <div class="flex-shrink-0 h-12 w-12 bg-valedissed-dark-gold/10 rounded-full flex items-center justify-center border border-valedissed-dark-gold/20">
                    <span class="text-2xl">💡</span>
                </div>
                
                <div class="flex-1">
                    <h4 class="text-[11px] font-bold text-valedissed-dark-gold uppercase tracking-[0.2em] mb-1">Sugerencia Profesional</h4>
                    <p class="text-xs text-gray-200 leading-relaxed font-medium">
                        Adjunta tus certificados para mejorar tu visibilidad y construir confianza con los clientes.
                    </p>
                </div>
                
                <div class="flex flex-col gap-2">
                    <a href="/profile" class="px-4 py-2 bg-valedissed-dark-gold text-valedissed-dark-bg text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-white transition-colors text-center">
                        Subir ahora
                    </a>
                    <button id="close-cert-reminder" class="text-[9px] font-bold text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
                        Ignorar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(reminder);

        // Lógica de cierre funcional
        const closeBtn = document.getElementById('close-cert-reminder');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                reminder.classList.add('opacity-0', 'translate-y-4');
                reminder.style.transition = 'all 0.5s ease';
                setTimeout(() => reminder.remove(), 500);
            });
        }
    }
}
