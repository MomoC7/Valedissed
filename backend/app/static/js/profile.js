/**
 * profile.js
 * Orquestador principal de la vista de perfil.
 */

import { showMessage, checkGlobalCertificateReminder } from './profile/utils.js';
import { initPartnerSection } from './profile/partner_manager.js';

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('access_token');
    
    // Si no está logueado, redirigir al login
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const profileForm = document.getElementById('profile-form');
    const messageDiv = document.getElementById('profile-message');

    // 1. Cargar perfil inicial
    try {
        const response = await fetch('/api/v1/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            
            // Programación defensiva para llenar campos
            const fields = {
                'username': data.username,
                'full_name': data.full_name,
                'bio': data.bio
            };

            for (const [id, value] of Object.entries(fields)) {
                const el = document.getElementById(id);
                if (el) el.value = value || '';
            }
            
            // Rebranding visual
            if (data.role === 'partner') {
                const badgeContainer = document.getElementById('role-badge-container');
                if (badgeContainer) {
                    badgeContainer.innerHTML = `
                        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-valedissed-dark-gold/20 to-valedissed-dark-gold/10 border border-valedissed-dark-gold/30">
                            <span class="text-sm font-bold text-valedissed-dark-gold uppercase tracking-widest">Aliado Oficial Premium</span>
                            <span class="text-xs">✨</span>
                        </div>
                    `;
                }
            }

            // Gestión de género
            const genderSelect = document.getElementById('gender');
            const genderStatus = document.getElementById('gender-status');
            if (genderSelect && genderStatus) {
                if (data.gender) {
                    genderSelect.value = data.gender;
                    genderSelect.disabled = true;
                    genderSelect.classList.add('cursor-not-allowed', 'opacity-80');
                    genderStatus.textContent = 'No editable (Ya registrado)';
                } else {
                    genderSelect.disabled = false;
                    genderSelect.classList.remove('cursor-not-allowed', 'opacity-80', 'bg-gray-50');
                    genderSelect.classList.add('bg-white/50');
                    genderStatus.textContent = 'Editable (Solo una vez)';
                }
            }
            
            // Cargar avatar visualmente
            const avatarContainer = document.getElementById('profile-avatar-container');
            if (avatarContainer) {
                if (data.avatar_url) {
                    avatarContainer.innerHTML = `<img src="${data.avatar_url}" class="h-full w-full object-cover">`;
                } else {
                    const bodyPath = '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';
                    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${bodyPath}</svg>`;
                    const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")`;
                    const maskStyle = `-webkit-mask-image: ${maskUrl}; mask-image: ${maskUrl}; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center;`;

                    const femaleSvg = `<div class="h-full w-full drop-shadow-md metal-bg-female" style='${maskStyle}'></div>`;
                    const maleSvg  = `<div class="h-full w-full drop-shadow-md metal-bg-male"   style='${maskStyle}'></div>`;
                    const otherSvg = `<div class="h-full w-full drop-shadow-md metal-bg-other"  style='${maskStyle}'></div>`;

                    let avatarSvg = otherSvg;
                    if (data.gender === 'female') avatarSvg = femaleSvg;
                    else if (data.gender === 'male') avatarSvg = maleSvg;

                    avatarContainer.innerHTML = avatarSvg;
                }
            }

            // Botón de borrar foto
            const deleteBtn = document.getElementById('delete-avatar-btn');
            if (data.avatar_url && deleteBtn) {
                deleteBtn.classList.remove('hidden');
            }

            // Inicializar sección de membresía
            initPartnerSection(data.role);

            // Mostrar recordatorio de certificados
            checkGlobalCertificateReminder(data);

        } else {
            showMessage('No se pudo cargar la información del perfil.', true);
        }
    } catch (error) {
        console.error("Error loading profile:", error);
        showMessage('Error de conexión.', true);
    }

    // 2. Guardar perfil
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (messageDiv) messageDiv.classList.add('hidden');

            const genderSelect = document.getElementById('gender');
            const updateData = {
                username: document.getElementById('username')?.value,
                full_name: document.getElementById('full_name')?.value,
                bio: document.getElementById('bio')?.value
            };

            if (genderSelect && !genderSelect.disabled && genderSelect.value) {
                updateData.gender = genderSelect.value;
            }

            try {
                const response = await fetch('/api/v1/auth/me', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(updateData)
                });

                if (response.ok) {
                    if (window.showToast) window.showToast('¡Perfil actualizado con éxito!', 'success');
                    if (typeof initNavbar === 'function') initNavbar();
                } else {
                    const errorData = await response.json();
                    if (window.showToast) window.showToast(errorData.detail || 'Ocurrió un error al actualizar.', 'error');
                }
            } catch (error) {
                console.error("Error updating profile:", error);
                if (window.showToast) window.showToast('Error de conexión.', 'error');
            }
        });
    }

    // 3. Subir Avatar Automáticamente
    const avatarInput = document.getElementById('avatar-input');
    const avatarMessage = document.getElementById('avatar-upload-message');

    if (avatarInput) {
        avatarInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            if (avatarMessage) {
                avatarMessage.textContent = 'Actualizando foto de perfil...';
                avatarMessage.classList.remove('hidden', 'text-red-500', 'text-green-500');
                avatarMessage.classList.add('text-blue-500');
            }

            try {
                const response = await fetch('/api/v1/auth/me/avatar', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formData
                });

                const data = await response.json();

                if (response.ok) {
                    if (avatarMessage) {
                        avatarMessage.textContent = '¡Foto actualizada con éxito!';
                        avatarMessage.classList.remove('text-blue-500');
                        avatarMessage.classList.add('text-green-500');
                    }
                    
                    const avatarContainer = document.getElementById('profile-avatar-container');
                    if (avatarContainer) {
                        avatarContainer.innerHTML = `<img src="${data.avatar_url}" class="h-full w-full object-cover">`;
                    }
                    
                    const deleteBtn = document.getElementById('delete-avatar-btn');
                    if (deleteBtn) deleteBtn.classList.remove('hidden');

                    window.dispatchEvent(new Event('profileUpdated'));
                } else {
                    if (avatarMessage) {
                        avatarMessage.textContent = data.detail || 'Error al actualizar foto';
                        avatarMessage.classList.remove('text-blue-500', 'text-green-500');
                        avatarMessage.classList.add('text-red-500');
                    }
                }
            } catch (error) {
                console.error("Error uploading avatar:", error);
                if (avatarMessage) {
                    avatarMessage.textContent = 'Error de conexión';
                    avatarMessage.classList.remove('text-blue-500', 'text-green-500');
                    avatarMessage.classList.add('text-red-500');
                }
            }
            avatarInput.value = '';
        });
    }

    // 4. Anclaje permanente
    window.addEventListener('focus-membership', () => {
        const section = document.getElementById('become-partner-section');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'center' });
            section.classList.add('vld-focus-glow');
            setTimeout(() => section.classList.remove('vld-focus-glow'), 4000);
        }
    });

    if (window.location.hash === '#solicitar-membresia' || window.location.hash === '#become-partner-section') {
        setTimeout(() => window.dispatchEvent(new CustomEvent('focus-membership')), 500);
    }
});
