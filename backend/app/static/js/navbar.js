/**
 * navbar.js
 * Lógica para mostrar/ocultar elementos de navegación según estado de autenticación
 * y cargar la foto de perfil/silueta de acuerdo al género.
 */

async function initNavbar() {
    const token = localStorage.getItem('access_token');
    
    // Elementos del DOM
    const navMenuGuest = document.getElementById('nav-menu-guest');
    const navMenuAuth = document.getElementById('nav-menu-auth');
    const navUserName = document.getElementById('nav-user-name');
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const navHomeLink = document.getElementById('nav-home-link');
    const navLogoutBtn = document.getElementById('nav-logout-btn');

    if (token) {
        // Redirigir el Home al dashboard si está logueado
        if (navHomeLink) navHomeLink.href = '/dashboard';

        // Ocultar links de invitado, mostrar links autenticados
        if (navMenuGuest) navMenuGuest.style.display = 'none';
        if (navMenuAuth) navMenuAuth.style.display = 'block';
        
        if (navLogoutBtn) {
                        navLogoutBtn.addEventListener('click', () => {
                            localStorage.removeItem('access_token');
                            if (window.showToast) window.showToast('Sesión cerrada con éxito', 'success');
                            setTimeout(() => { window.location.href = '/login'; }, 1000);
                        });
                    }

        // Cargar perfil
        try {
            const response = await fetch('/api/v1/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const profile = await response.json();
                
                // Actualizar Nombre
                if (navUserName) {
                    navUserName.textContent = profile.username || profile.full_name || 'Usuario';
                }

                // Manejar opciones de Admin
                const navMenuAdminLink = document.getElementById('nav-menu-admin-link');
                if (navMenuAdminLink) {
                    if (profile.role === 'admin') {
                        navMenuAdminLink.classList.remove('hidden');
                        navMenuAdminLink.classList.add('flex');
                    } else {
                        navMenuAdminLink.classList.add('hidden');
                        navMenuAdminLink.classList.remove('flex');
                    }
                }

                // Manejar opciones de Socio
                const navMenuPartnerLinks = document.getElementById('nav-menu-partner-links');
                const navMenuBecomePartner = document.getElementById('nav-menu-become-partner');
                
                if (['partner', 'business', 'admin'].includes(profile.role)) {
                    if (navMenuPartnerLinks) {
                        navMenuPartnerLinks.classList.remove('hidden');
                        navMenuPartnerLinks.classList.add('flex');
                    }
                    if (navMenuBecomePartner) {
                        navMenuBecomePartner.classList.add('hidden');
                        navMenuBecomePartner.classList.remove('block');
                    }
                } else if (profile.role === 'cliente') {
                    if (navMenuPartnerLinks) {
                        navMenuPartnerLinks.classList.add('hidden');
                        navMenuPartnerLinks.classList.remove('flex');
                    }
                    if (navMenuBecomePartner) {
                        navMenuBecomePartner.classList.remove('hidden');
                        navMenuBecomePartner.classList.add('block');
                    }
                }

                // Generar Avatar (Priorizar foto real, luego silueta)
                if (navUserAvatar) {
                    let finalAvatarHtml = "";
                    let finalLargeAvatarHtml = "";
                    
                    if (profile.avatar_url) {
                        finalAvatarHtml = `<img src="${profile.avatar_url}" alt="Avatar" class="h-full w-full object-cover">`;
                        finalLargeAvatarHtml = finalAvatarHtml;
                    } else {
                        // Usar divs con mask-image para heredar las animaciones CSS metálicas idénticas
                        const bodyPath = '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';
                        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${bodyPath}</svg>`;
                        const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")`;
                        const maskStyle = `-webkit-mask-image: ${maskUrl}; mask-image: ${maskUrl}; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center;`;
                        
                        const femaleSvg = `<div class="h-full w-full drop-shadow-md metal-bg-female" style='${maskStyle}'></div>`;
                        const maleSvg = `<div class="h-full w-full drop-shadow-md metal-bg-male" style='${maskStyle}'></div>`;
                        const otherSvg = `<div class="h-full w-full drop-shadow-md metal-bg-other" style='${maskStyle}'></div>`;
                        
                        let avatarSvg = otherSvg;
                        if (profile.gender === 'female') avatarSvg = femaleSvg;
                        else if (profile.gender === 'male') avatarSvg = maleSvg;
                        
                        finalAvatarHtml = avatarSvg;
                        finalLargeAvatarHtml = avatarSvg;
                    }
                    
                    navUserAvatar.innerHTML = finalAvatarHtml;
                    const navMenuLargeAvatar = document.getElementById('nav-menu-large-avatar');
                    if (navMenuLargeAvatar) {
                        navMenuLargeAvatar.innerHTML = finalLargeAvatarHtml;
                    }
                }
                
                // Actualizar saludos dinámicos en las vistas
                updateGreetings(profile.gender, profile.username || profile.full_name);
                
            } else if (response.status === 401) {
                // SOLO cerrar sesión si el token es explícitamente inválido o expirado
                handleLogout();
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            // No cerrar sesión por errores de red temporales
        }

    } else {
        // No logueado
        if (navHomeLink) navHomeLink.href = '/';
        if (navMenuGuest) navMenuGuest.style.display = 'block';
        if (navMenuAuth) navMenuAuth.style.display = 'none';
        if (navUserName) navUserName.textContent = 'Invitado';
        
        // Mantener avatar unisex para invitado con la nueva máscara animada
        if (navUserAvatar) {
            const bodyPath = '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>';
            const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${bodyPath}</svg>`;
            const maskUrl = `url("data:image/svg+xml;utf8,${encodeURIComponent(svgString)}")`;
            const maskStyle = `-webkit-mask-image: ${maskUrl}; mask-image: ${maskUrl}; -webkit-mask-size: contain; mask-size: contain; -webkit-mask-repeat: no-repeat; mask-repeat: no-repeat; -webkit-mask-position: center; mask-position: center;`;
            
            navUserAvatar.innerHTML = `<div class="h-6 w-6 drop-shadow-md metal-bg-gray" style='${maskStyle}'></div>`;
        }
        
        // Saludo predeterminado para invitados
        updateGreetings(null, null);
    }
}

function updateGreetings(gender, name) {
    const welcomeContainer = document.getElementById('welcome-container');
    const dashboardContainer = document.getElementById('dashboard-container');
    const navUserName = document.getElementById('nav-user-name');
    
    // Configurar clase metálica basada en género
    let nameClass = 'metal-text-gray'; // Gris invitado / otro
    if (gender === 'female') nameClass = 'metal-text-female'; // Fucsia metálico
    else if (gender === 'male') nameClass = 'metal-text-male'; // Azul metálico
    
    const displayName = name ? name : 'Invitado';

    // Actualizar nombre en Navbar
    if (navUserName && name) {
        navUserName.textContent = displayName;
        navUserName.className = `text-sm font-bold ${nameClass}`; // Ya no sobreescribe el hidden sm:flex del padre
    }
    
    // Actualizar nombre en Menú Desplegable (Grande)
    const navMenuLargeName = document.getElementById('nav-menu-large-name');
    if (navMenuLargeName && name) {
        navMenuLargeName.textContent = displayName;
        navMenuLargeName.className = `text-lg font-bold tracking-wide ${nameClass}`;
    }
    
    // Actualizar vista Welcome
    if (welcomeContainer) {
        if (!gender || gender === 'other') {
            welcomeContainer.innerHTML = `Bienvenid@ a <span class="metal-text-valedissed font-extrabold">Valedissed</span>.`;
        } else if (gender === 'female') {
            welcomeContainer.innerHTML = `Bienvenida a <span class="secondary-color-animated font-extrabold">Valedissed</span>, <span class="${nameClass} font-bold transition-all duration-500">${displayName}</span>.`;
        } else if (gender === 'male') {
            welcomeContainer.innerHTML = `Bienvenido a <span class="secondary-color-animated font-extrabold">Valedissed</span>, <span class="${nameClass} font-bold transition-all duration-500">${displayName}</span>.`;
        }
    }
    
    // Actualizar vista Dashboard
    if (dashboardContainer) {
        if (!name) {
            dashboardContainer.innerHTML = `Hola, <span class="metal-text-gray font-bold transition-all duration-500">Invitado</span>.`;
        } else {
            dashboardContainer.innerHTML = `Hola, <span class="${nameClass} font-bold transition-all duration-500">${displayName}</span>.`;
        }
    }
}

function handleLogout() {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initNavbar);

// Re-inicializar si el usuario navega con el botón "Atrás" (BFCache)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        initNavbar();
    }
});
