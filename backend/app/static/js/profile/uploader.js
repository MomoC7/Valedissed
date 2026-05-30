/**
 * uploader.js
 * Lógica para la carga de archivos con soporte para Drag & Drop y selección nativa.
 */

/**
 * Configura una zona de carga de archivos.
 * @param {Object} config - Configuración de los elementos del DOM y endpoints.
 */
export function setupFileUpload({
    zoneId,
    inputId,
    promptId,
    successId,
    nameId,
    removeBtnId,
    hiddenInputId,
    endpoint = '/api/v1/partner/upload',
    token = localStorage.getItem('access_token')
}) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const prompt = document.getElementById(promptId);
    const success = document.getElementById(successId);
    const nameText = document.getElementById(nameId);
    const removeBtn = document.getElementById(removeBtnId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (!zone || !input) return;

    // Abrir selector al hacer click en la zona (Funciona en Mobile)
    zone.addEventListener('click', (e) => {
        if (removeBtn && e.target !== removeBtn) {
            input.click();
        } else if (!removeBtn) {
            input.click();
        }
    });

    // Eventos Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
        zone.addEventListener(evt, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    zone.addEventListener('dragover', () => zone.classList.add('border-brand-primary', 'bg-brand-primary/5'));
    zone.addEventListener('dragleave', () => zone.classList.remove('border-brand-primary', 'bg-brand-primary/5'));
    
    zone.addEventListener('drop', (e) => {
        zone.classList.remove('border-brand-primary', 'bg-brand-primary/5');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    const handleFile = async (file) => {
        if (!file) return;
        
        if (prompt) prompt.classList.add('hidden');
        if (success) success.classList.remove('hidden');
        if (nameText) nameText.textContent = file.name;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('file_type', zoneId.includes('cert') ? 'certificate' : 'face');

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (response.ok) {
                const data = await response.json();
                if (hiddenInput) hiddenInput.value = data.file_path;
            } else {
                const errData = await response.json();
                const errMsg = errData.detail?.details || errData.detail || 'Error desconocido';
                alert(`Error al subir archivo: ${errMsg}`);
                removeFile();
            }
        } catch (err) {
            console.error("Error uploading file:", err);
            alert('Error de conexión al subir el archivo.');
            removeFile();
        }
    };

    const removeFile = () => {
        if (input) input.value = '';
        if (hiddenInput) hiddenInput.value = '';
        if (prompt) prompt.classList.remove('hidden');
        if (success) success.classList.add('hidden');
    };

    if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeFile();
        });
    }
}
