/**
 * partner_manager.js
 * Gestión del modal de socios, validación de pasos y selección de categorías.
 */

import { setupFileUpload } from './uploader.js';
import { showPartnerMessage } from './utils.js';

export async function initPartnerSection(currentRole) {
    const token = localStorage.getItem('access_token');
    const section = document.getElementById('become-partner-section');
    if (!section) return;

    console.log('[Partner Manager] Initializing for role:', currentRole);

    // Contenedor para banners informativos (siempre visible)
    let bannerHtml = '';

    // --- Verificar solicitud existente y mostrar banner de estado ---
    try {
        const reqRes = await fetch('/api/v1/partner/my-request', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (reqRes.ok) {
            const { request } = await reqRes.json();
            console.log('[Partner Manager] User request status:', request?.status, request);
            
            // Caso 1: Ya es socio/admin/business (Rol final alcanzado)
            if (['partner', 'business', 'admin'].includes(currentRole)) {
                console.log('[Partner Manager] User is already a partner');
                section.innerHTML = `
                    <div class="bg-gradient-to-br from-valedissed-dark-surface to-valedissed-dark-elevated border border-valedissed-dark-gold/20 rounded-3xl p-10 text-center space-y-6 shadow-2xl">
                        <div class="h-20 w-20 bg-valedissed-dark-gold/10 rounded-full flex items-center justify-center mx-auto border border-valedissed-dark-gold/30">
                            <span class="text-4xl">🏅</span>
                        </div>
                        <h2 class="text-3xl font-serif font-bold text-valedissed-dark-gold">¡Membresía Oficial Activa!</h2>
                        <p class="text-gray-400 max-w-lg mx-auto leading-relaxed">
                            Tu perfil ha sido elevado a la categoría de <span class="text-white font-bold">Aliado Oficial</span>. Gestiona tu catálogo comercial desde tu panel.
                        </p>
                    </div>
                `;
                section.classList.remove('hidden');
                return;
            }

            // Caso 2: Tiene una solicitud en base de datos
            if (request) {
                console.log('[Partner Manager] User has existing request', request);
                
                if (request.status === 'pending') {
                    bannerHtml = `
                        <div class="bg-white/5 dark:bg-valedissed-dark-surface border border-brand-primary/20 rounded-3xl p-10 text-center space-y-5 mb-8">
                            <div class="h-16 w-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto">
                                <span class="text-3xl">⏳</span>
                            </div>
                            <h3 class="text-2xl font-serif font-bold dark:text-gray-100">Solicitud en Proceso de Revisión</h3>
                            <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                                Hemos recibido tu postulación correctamente. Nuestro equipo de calidad está evaluando tu perfil para garantizar la excelencia en la plataforma.
                            </p>
                            <div class="text-xs text-brand-primary/60 font-bold uppercase tracking-widest pt-2">
                                Recibirás una notificación pronto
                            </div>
                        </div>
                    `;

                    if (currentRole === 'cliente') {
                        section.innerHTML = bannerHtml;
                        section.classList.remove('hidden');
                        return;
                    }
                } else if (request.status === 'rejected') {
                    bannerHtml = `
                        <div class="flex items-start gap-4 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 mb-8">
                            <span class="text-2xl">❌</span>
                            <div>
                                <p class="font-bold text-red-500">Postulación no aprobada</p>
                                <p class="text-sm text-red-400/80 mt-1">
                                    ${request.admin_comments ? 'Motivo del rechazo: ' + request.admin_comments : 'Tu solicitud no pudo ser aprobada en este momento.'} 
                                    Por favor, revisa y corrige los datos para intentarlo de nuevo.
                                </p>
                            </div>
                        </div>
                    `;
                }
            }
        }
    } catch(e) {
        console.error('[Partner Manager] Error checking request status:', e);
        // No ocultamos la sección si falla la petición, permitimos que el cliente intente postularse
    }

    // Si es cliente, mostrar la card original (siempre visible, con o sin solicitud)
    if (currentRole === 'cliente') {
        console.log('[Partner Manager] Showing partner form for cliente role');
        section.classList.remove('hidden');
        
        // Si hay banner informativo, inyectarlo ANTES del contenido original
        if (bannerHtml) {
            const originalContent = section.innerHTML;
            section.innerHTML = bannerHtml + originalContent;
        }
    }

    const modal = document.getElementById('partner-modal');
    const openBtn = document.getElementById('open-partner-modal-btn');
    const closeBtn = document.getElementById('close-partner-modal-btn');
    const backdrop = document.getElementById('partner-modal-backdrop');
    const form = document.getElementById('partner-form');
    const bioTextarea = document.getElementById('partner_bio');
    const bioCounter = document.getElementById('bio-counter');

    // Categorías predefinidas
    const productCategories = [
        "Maquillaje", "Cuidado Facial", "Cuidado Corporal", "Perfumería", 
        "Uñas", "Cabello", "Herramientas", "Accesorios", "Moda", "Skincare Premium"
    ];
    const serviceCategories = [
        "Maquillaje Social", "Corte de Cabello", "Colorimetría", "Manicura / Pedicura", 
        "Pestañas", "Cejas", "Limpieza Facial", "Masajes Relajantes", "Depilación", "Peinado"
    ];

    if (!openBtn || !modal) return;

    // Abrir modal
    openBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    });

    // Resetear modal al cerrar
    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
        if (stepsWrapper) stepsWrapper.classList.remove('hidden');
        if (verificationStep) verificationStep.classList.add('hidden');
        if (progressThread) progressThread.style.width = '20%';
        if (stepText) stepText.textContent = 'Paso 1 de 5';
    };
    
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    // Lógica de cambio de tipo de partner
    const typeRadios = form ? form.querySelectorAll('input[name="partner_type"]') : [];
    const prodSection = document.getElementById('partner-product-section');
    const servSection = document.getElementById('partner-service-section');

    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => updateSections(e.target.value));
    });

    function updateSections(val) {
        if (!val) return;
        if (prodSection) prodSection.classList.toggle('hidden', val === 'especialista');
        if (servSection) servSection.classList.toggle('hidden', val === 'vendedor');
        
        if (val !== 'especialista') {
            renderChips('product-category-chips', productCategories, 'partner_product_categories');
        }
        if (val !== 'vendedor') {
            renderChips('service-category-chips', serviceCategories, 'partner_service_categories');
        }
    }

    function renderChips(containerId, categories, inputId) {
        const container = document.getElementById(containerId);
        const hiddenInput = document.getElementById(inputId);
        if (!container || !hiddenInput) return;
        
        if (container.children.length > 0) return; // Evitar duplicados

        let selected = [];
        categories.forEach(cat => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.textContent = cat;
            chip.className = "px-4 py-2 rounded-full border border-gray-200 dark:border-valedissed-dark-border text-sm font-medium transition-all hover:border-brand-primary dark:hover:border-valedissed-dark-gold dark:text-gray-300";
            
            chip.onclick = () => {
                if (selected.includes(cat)) {
                    selected = selected.filter(c => c !== cat);
                    chip.classList.remove('bg-brand-primary', 'text-white', 'border-brand-primary', 'dark:bg-valedissed-dark-gold', 'dark:text-valedissed-dark-bg');
                } else {
                    selected.push(cat);
                    chip.classList.add('bg-brand-primary', 'text-white', 'border-brand-primary', 'dark:bg-valedissed-dark-gold', 'dark:text-valedissed-dark-bg');
                }
                hiddenInput.value = JSON.stringify(selected);
            };
            container.appendChild(chip);
        });
    }

    // Contador de bio
    if (bioTextarea && bioCounter) {
        bioTextarea.addEventListener('input', () => {
            const len = bioTextarea.value.length;
            bioCounter.textContent = `(${len}/50 mín)`;
            bioCounter.className = len < 50 ? "text-red-500" : "text-green-500";
        });
    }

    // Elementos de Pasos
    const stepsWrapper = document.getElementById('partner-form-steps-wrapper');
    const verificationStep = document.getElementById('partner-verification-step');
    const toStep5Btn = document.getElementById('partner-to-step5-btn');
    const backBtn = document.getElementById('partner-back-btn');
    const submitBtn = document.getElementById('partner-submit-request-btn');
    const progressThread = document.getElementById('vld-partner-progress');
    const stepText = document.getElementById('vld-partner-step-text');

    // Función para mostrar errores visuales
    function setFieldError(id, msg) {
        const field = document.getElementById(id);
        const errorSpan = document.getElementById(`error-${id}`);
        if (field) {
            field.classList.toggle('border-red-500', !!msg);
            field.classList.toggle('dark:border-red-500', !!msg);
        }
        if (errorSpan) {
            errorSpan.textContent = msg || '';
            errorSpan.classList.toggle('hidden', !msg);
        }
        return !msg;
    }

    // Validación en Tiempo Real
    const validateField = (id) => {
        const field = document.getElementById(id);
        if (!field) return true;
        
        const val = field.value.trim();
        let error = null;

        if (id === 'business_name' && val.length < 4) error = 'Mínimo 4 caracteres.';
        if (id === 'partner_phone') {
            if (!/^\+?[0-9]{7,15}$/.test(val)) {
                error = 'Número de contacto inválido. Por favor, verifique el formato.';
            }
        }
        if (id === 'operation_zone' && val.length < 3) error = 'Ingresa una ciudad válida.';
        if (id === 'partner_bio' && val.length < 50) error = 'Mínimo 50 caracteres.';

        setFieldError(id, error);
        return !error;
    };

    ['business_name', 'partner_phone', 'operation_zone', 'partner_bio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => validateField(id));
    });

    // Configurar zonas de carga
    setupFileUpload({
        zoneId: 'drop-zone-cert',
        inputId: 'cert_file',
        promptId: 'cert-upload-prompt',
        successId: 'cert-upload-success',
        nameId: 'cert-file-name',
        removeBtnId: 'cert-remove-btn',
        hiddenInputId: 'verified_certification_url'
    });

    setupFileUpload({
        zoneId: 'drop-zone-kyc',
        inputId: 'kyc_file',
        promptId: 'kyc-upload-prompt',
        successId: 'kyc-upload-success',
        nameId: 'kyc-file-name',
        removeBtnId: 'kyc-remove-btn',
        hiddenInputId: 'verified_id_face_url'
    });

    // Validación Pasos 1-4
    function validateBaseSteps() {
        let isValid = true;
        ['business_name', 'partner_phone', 'operation_zone', 'partner_bio'].forEach(id => {
            if (!validateField(id)) isValid = false;
        });

        const type = form ? form.querySelector('input[name="partner_type"]:checked') : null;
        if (!type) {
            showPartnerMessage('Por favor selecciona un modelo de negocio.', true);
            return false;
        }

        const typeVal = type.value;
        const prodCats = document.getElementById('partner_product_categories').value;
        const servCats = document.getElementById('partner_service_categories').value;

        if (typeVal !== 'especialista' && (!prodCats || JSON.parse(prodCats).length === 0)) {
            showPartnerMessage('Selecciona al menos una categoría de productos.', true);
            return false;
        }
        if (typeVal !== 'vendedor' && (!servCats || JSON.parse(servCats).length === 0)) {
            showPartnerMessage('Selecciona al menos una categoría de servicios.', true);
            return false;
        }

        return isValid;
    }

    // Navegación
    if (toStep5Btn) {
        toStep5Btn.addEventListener('click', () => {
            const msgDiv = document.getElementById('partner-form-message');
            if (msgDiv) msgDiv.classList.add('hidden');
            if (validateBaseSteps()) {
                if (stepsWrapper) stepsWrapper.classList.add('hidden');
                if (verificationStep) verificationStep.classList.remove('hidden');
                if (progressThread) progressThread.style.width = '100%';
                if (stepText) stepText.textContent = 'Paso 5 de 5';
                const scrollContainer = modal.querySelector('.overflow-y-auto');
                if (scrollContainer) scrollContainer.scrollTop = 0;
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (verificationStep) verificationStep.classList.add('hidden');
            if (stepsWrapper) stepsWrapper.classList.remove('hidden');
            if (progressThread) progressThread.style.width = '20%';
            if (stepText) stepText.textContent = 'Paso 1 de 5';
        });
    }

    // Envío Final
    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const type = form.querySelector('input[name="partner_type"]:checked').value;
            const payload = {
                partner_type: type,
                business_name: document.getElementById('business_name').value,
                partner_product_categories: JSON.parse(document.getElementById('partner_product_categories').value || '[]'),
                partner_service_categories: JSON.parse(document.getElementById('partner_service_categories').value || '[]'),
                partner_phone: document.getElementById('partner_phone').value,
                operation_zone: document.getElementById('operation_zone').value,
                years_experience: parseInt(document.getElementById('years_experience').value),
                bio: bioTextarea.value,
                certification_url: document.getElementById('verified_certification_url').value,
                id_face_url: document.getElementById('verified_id_face_url').value
            };

            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Procesando...';

            try {
                const response = await fetch('/api/v1/partner/request', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    if (window.showToast) window.showToast('¡Solicitud enviada con éxito! Redirigiendo...', 'success');
                    setTimeout(() => { window.location.reload(); }, 2000);
                } else {
                    const err = await response.json().catch(() => null);
                    console.error('[Partner Manager] Error creando solicitud de socio:', response.status, err);
                    if (window.showToast) {
                        if (response.status === 409) {
                            window.showToast(err?.detail || 'Ya existe una solicitud pendiente.', 'warning');
                        } else {
                            window.showToast(err?.detail || 'Error en el registro.', 'error');
                        }
                    }
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Enviar Solicitud 🚀';
                }
            } catch (error) {
                if (window.showToast) window.showToast('Error de conexión.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Enviar Solicitud 🚀';
            }
        });
    }
}
