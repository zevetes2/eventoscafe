/* ============================================
   COMUNIDAD CAFE - LANDING PAGE v2
   JavaScript con Splash Screen + JSONP
   ============================================

   CONFIGURACIÓN:
   1. Despliega el Google Apps Script como aplicación web
   2. Copia la URL de implementación
   3. Reemplaza WEB_APP_URL abajo con tu URL
   ============================================ */

// ============================================
// CONFIGURACIÓN - REEMPLAZA ESTA URL
// ============================================
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwHgXtoHOwNjPdnE9C4Q_D1HJSvAw7kvF-mc8D3y4P_vPPh7YeuV1A6HZgF8wEFjDnJ4Q/exec';

// ============================================
// VARIABLES GLOBALES
// ============================================
let tallerSeleccionado = null; // 'adoracion' o 'ninos'
let attendeeCounter = 1;
let registroTemporal = null; // Guarda datos del registro para el comprobante

// Precios según cantidad de asistentes
function getPricePerPerson(count) {
    if (count >= 10) return 1000;
    if (count >= 5) return 1200;
    return 1500;
}
// ============================================
// SELECCIONAR TALLER (SPLASH SCREEN)
// ============================================
function selectTaller(taller) {
    tallerSeleccionado = taller;

    // Ocultar splash
    document.getElementById('splash-screen').classList.add('hidden');

    // Mostrar formulario
    const formSection = document.getElementById('formulario-section');
    formSection.classList.remove('hidden');

    // Actualizar info del taller en el header
    const info = TALLERES[taller];
    document.getElementById('taller-badge').textContent = info.label;
    document.getElementById('taller-titulo').textContent = info.titulo;
    document.getElementById('taller-instructor').textContent = info.instructor;

    // Mostrar/ocultar campo de instrumento según el taller
    actualizarInstrumentoFields();

    // Scroll al formulario
    formSection.scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// VOLVER AL SPLASH
// ============================================
function volverAlSplash() {
    tallerSeleccionado = null;

    // Ocultar formulario
    document.getElementById('formulario-section').classList.add('hidden');

    // Mostrar splash
    document.getElementById('splash-screen').classList.remove('hidden');

    // Resetear formularios
    document.getElementById('individualForm').reset();
    document.getElementById('grupalForm').reset();

    // Resetear asistentes
    const list = document.getElementById('attendees-list');
    while (list.children.length > 1) {
        list.removeChild(list.lastChild);
    }
    attendeeCounter = 1;
    updatePrice();

    // Ocultar instrumentos
    document.getElementById('instrumento-individual').classList.add('hidden');
    document.getElementById('attendee-instrumento-1').classList.add('hidden');

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================
// INFO DE TALLERES
// ============================================
const TALLERES = {
    adoracion: {
        label: 'Taller de Adoración',
        titulo: 'Taller de Adoración',
        instructor: 'Andrés Buffa - Ministerio Toma Tu Lugar'
    },
    ninos: {
        label: 'Taller de Niños',
        titulo: 'Taller de Niños',
        instructor: 'Cintia Buffa - Ministerio Toma Tu Lugar (Líderes Infantiles)'
    }
};

// ============================================
// ACTUALIZAR CAMPOS DE INSTRUMENTO
// ============================================
function actualizarInstrumentoFields() {
    const instrumentoIndividual = document.getElementById('instrumento-individual');
    const instrumentoSelect = instrumentoIndividual.querySelector('select');

    // Mostrar/ocultar instrumento en formulario individual
    if (tallerSeleccionado === 'adoracion') {
        instrumentoIndividual.classList.remove('hidden');
        instrumentoSelect.setAttribute('required', 'required');
    } else {
        instrumentoIndividual.classList.add('hidden');
        instrumentoSelect.removeAttribute('required');
        instrumentoSelect.value = '';
    }

    // Mostrar/ocultar instrumento en asistentes grupales
    const rows = document.querySelectorAll('.attendee-row');
    rows.forEach((row, index) => {
        const i = index + 1;
        const instrumentoDiv = document.getElementById(`attendee-instrumento-${i}`);
        const selectInstrumento = instrumentoDiv.querySelector('select');

        if (tallerSeleccionado === 'adoracion') {
            instrumentoDiv.classList.remove('hidden');
            selectInstrumento.setAttribute('required', 'required');
        } else {
            instrumentoDiv.classList.add('hidden');
            selectInstrumento.removeAttribute('required');
            selectInstrumento.value = '';
        }
    });
}

// ============================================
// CAMBIO DE TIPO DE REGISTRO (Individual/Grupal)
// ============================================
function showFormTipo(type) {
    const individualForm = document.getElementById('form-individual');
    const grupalForm = document.getElementById('form-grupal');
    const btnIndividual = document.getElementById('btn-individual');
    const btnGrupal = document.getElementById('btn-grupal');

    if (type === 'individual') {
        individualForm.classList.remove('hidden');
        grupalForm.classList.add('hidden');
        btnIndividual.classList.add('active');
        btnGrupal.classList.remove('active');
    } else {
        individualForm.classList.add('hidden');
        grupalForm.classList.remove('hidden');
        btnGrupal.classList.add('active');
        btnIndividual.classList.remove('active');
    }
}

// ============================================
// AGREGAR ASISTENTE (REGISTRO GRUPAL)
// ============================================
function addAttendee() {
    attendeeCounter++;
    const list = document.getElementById('attendees-list');

    const newAttendee = document.createElement('div');
    newAttendee.className = 'attendee-row';
    newAttendee.setAttribute('data-index', attendeeCounter);

    // Determinar si mostrar instrumento según taller seleccionado
    const mostrarInstrumento = tallerSeleccionado === 'adoracion';
    const instrumentoClass = mostrarInstrumento ? '' : 'hidden';
    const instrumentoRequired = mostrarInstrumento ? 'required' : '';

    newAttendee.innerHTML = `
        <div class="attendee-header">
            <span class="attendee-number">Asistente #${attendeeCounter}</span>
            <button type="button" onclick="removeAttendee(this)" class="remove-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
                Eliminar
            </button>
        </div>
        <div class="attendee-grid">
            <div class="form-group">
                <label class="form-label-small">Nombre Completo</label>
                <input type="text" name="attendee_name_${attendeeCounter}" required class="form-input" placeholder="Nombre completo">
            </div>
            <div class="form-group">
                <label class="form-label-small">Cédula / DNI</label>
                <input type="text" name="attendee_cedula_${attendeeCounter}" required class="form-input" placeholder="Número de identidad">
            </div>
        </div>
        <div id="attendee-instrumento-${attendeeCounter}" class="attendee-instrumento ${instrumentoClass}">
            <div class="form-group">
                <label class="form-label-small">Tipo de instrumento</label>
                <select name="attendee_instrumento_${attendeeCounter}" class="form-select" ${instrumentoRequired}>
                    <option value="">Selecciona tu instrumento</option>
                    <option value="canto">Canto</option>
                    <option value="piano">Piano</option>
                    <option value="bateria">Batería</option>
                    <option value="guitarra">Guitarra</option>
                    <option value="bajo">Bajo</option>
                    <option value="saxofon">Saxofón</option>
                    <option value="trompeta">Trompeta</option>
                    <option value="violin">Violín</option>
                    <option value="teclado">Teclado</option>
                    <option value="otro">Otro</option>
                </select>
            </div>
        </div>
    `;

    list.appendChild(newAttendee);
    updatePrice();
}

// ============================================
// ELIMINAR ASISTENTE
// ============================================
function removeAttendee(btn) {
    const row = btn.closest('.attendee-row');
    row.remove();
    updatePrice();
    renumberAttendees();
}

// ============================================
// RENUMERAR ASISTENTES
// ============================================
function renumberAttendees() {
    const rows = document.querySelectorAll('.attendee-row');
    rows.forEach((row, index) => {
        const newIndex = index + 1;
        row.setAttribute('data-index', newIndex);
        row.querySelector('.attendee-number').textContent = `Asistente #${newIndex}`;

        row.querySelectorAll('[name^="attendee_name_"]').forEach(input => {
            input.name = `attendee_name_${newIndex}`;
        });
        row.querySelectorAll('[name^="attendee_cedula_"]').forEach(input => {
            input.name = `attendee_cedula_${newIndex}`;
        });
        row.querySelectorAll('[name^="attendee_instrumento_"]').forEach(select => {
            select.name = `attendee_instrumento_${newIndex}`;
        });

        const instrumentoDiv = row.querySelector('.attendee-instrumento');
        if (instrumentoDiv) {
            instrumentoDiv.id = `attendee-instrumento-${newIndex}`;
        }
    });

    attendeeCounter = rows.length;
}

// ============================================
// ACTUALIZAR PRECIO TOTAL
// ============================================
function updatePrice() {
    const count = document.querySelectorAll('.attendee-row').length;
    const pricePerPerson = getPricePerPerson(count);
    const total = count * pricePerPerson;
    
    document.getElementById('attendee-count').textContent = count;
    document.getElementById('price-per-person').textContent = `${pricePerPerson} RD$`;
    document.getElementById('total-price').textContent = `${total} RD$`;
}

// ============================================
// MOSTRAR/OCULTAR LOADING
// ============================================
function showLoading(show) {
    const btnIndividual = document.querySelector('#individualForm .submit-btn');
    const btnGrupal = document.querySelector('#grupalForm .submit-btn');

    if (show) {
        if (btnIndividual) {
            btnIndividual.dataset.originalText = btnIndividual.textContent;
            btnIndividual.textContent = 'Enviando...';
            btnIndividual.disabled = true;
        }
        if (btnGrupal) {
            btnGrupal.dataset.originalText = btnGrupal.textContent;
            btnGrupal.textContent = 'Enviando...';
            btnGrupal.disabled = true;
        }
    } else {
        if (btnIndividual) {
            btnIndividual.textContent = btnIndividual.dataset.originalText || 'Completar Registro';
            btnIndividual.disabled = false;
        }
        if (btnGrupal) {
            btnGrupal.textContent = btnGrupal.dataset.originalText || 'Completar Registro Grupal';
            btnGrupal.disabled = false;
        }
    }
}

// ============================================
// MOSTRAR ERROR
// ============================================
function showError(message) {
    let errorDiv = document.getElementById('error-message');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.id = 'error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-weight: 600;
            z-index: 100;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(errorDiv);
    }

    errorDiv.textContent = message;
    errorDiv.style.display = 'block';

    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// ============================================
// ENVIAR DATOS VIA JSONP (Evita CORS)
// ============================================
function sendDataJSONP(data, callback) {
    const callbackName = 'jsonpCallback_' + Date.now();
    
    const script = document.createElement('script');
    
    const params = new URLSearchParams();
    params.append('callback', callbackName);
    
    for (let key in data) {
        if (key === 'asistentes') {
            params.append(key, JSON.stringify(data[key]));
        } else {
            params.append(key, data[key]);
        }
    }
    
    // Agregar timestamp para evitar cache
    params.append('_', Date.now());
    
    script.src = WEB_APP_URL + '?' + params.toString();
    
    // Manejar respuesta exitosa
    window[callbackName] = function(response) {
        clearTimeout(timeoutId);
        cleanup();
        callback(response);
    };
    
    // Manejar error de carga
    script.onerror = function() {
        clearTimeout(timeoutId);
        cleanup();
        callback({ success: false, message: 'Error de conexión con el servidor' });
    };
    
    // Cleanup function
    function cleanup() {
        delete window[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
    }
    
    // Timeout de seguridad
    const timeoutId = setTimeout(function() {
        cleanup();
        callback({ success: false, message: 'Tiempo de espera agotado' });
    }, 15000);
    
    document.head.appendChild(script);
}

// ============================================
// GENERAR MENSAJE DE WHATSAPP
// ============================================
function generarMensajeWhatsApp(data, type) {
    let mensaje = '';
    
    if (type === 'individual') {
        const tallerTexto = data.taller === 'adoracion' ? 'Taller de Adoración' : 'Taller de Niños';
        const instrumentoTexto = data.instrumento ? `Instrumento: ${data.instrumento}` : '';
        
        mensaje = `*NUEVO REGISTRO - CAFE 2026*\n\n`;
        mensaje += `*Tipo:* Individual\n`;
        mensaje += `*Taller:* ${tallerTexto}\n`;
        if (instrumentoTexto) mensaje += `*${instrumentoTexto}*\n`;
        mensaje += `\n`;
        mensaje += `*Datos del registrante:*\n`;
        mensaje += `Nombre: ${data.nombre} ${data.apellido}\n`;
        mensaje += `Cédula: ${data.cedula}\n`;
        mensaje += `Iglesia: ${data.iglesia}\n`;
        mensaje += `Teléfono: ${data.telefono}\n`;
        mensaje += `Email: ${data.email}\n`;
        mensaje += `Ciudad: ${data.ciudad}, ${data.pais}\n`;
        mensaje += `\n`;
        mensaje += `*Inversión:* RD$1,500\n`;
        mensaje += `\n`;
        mensaje += `Adjunto mi comprobante de transferencia. Por favor validar mi inscripción. ¡Gracias!`;
        
    } else {
        const count = data.asistentes ? data.asistentes.length : 0;
        const pricePerPerson = getPricePerPerson(count);
        const total = count * pricePerPerson;
        
        let listaAsistentes = '';
        if (data.asistentes && Array.isArray(data.asistentes)) {
            data.asistentes.forEach((a, i) => {
                const instrumentoTexto = a.instrumento ? ` (${a.instrumento})` : '';
                listaAsistentes += `${i + 1}. ${a.nombre} - Cédula: ${a.cedula}${instrumentoTexto}\n`;
            });
        }
        
        mensaje = `*NUEVO REGISTRO GRUPAL - CAFE 2026*\n\n`;
        mensaje += `*Tipo:* Grupal\n`;
        mensaje += `*Cantidad de asistentes:* ${count}\n`;
        mensaje += `\n`;
        mensaje += `*Datos del Líder:*\n`;
        mensaje += `Nombre: ${data.lider_nombre}\n`;
        mensaje += `Cédula: ${data.lider_cedula}\n`;
        mensaje += `Cargo: ${data.lider_cargo}\n`;
        mensaje += `Teléfono: ${data.lider_telefono}\n`;
        mensaje += `Email: ${data.lider_email}\n`;
        mensaje += `\n`;
        mensaje += `*Datos del Grupo:*\n`;
        mensaje += `Ministerio: ${data.ministerio}\n`;
        mensaje += `Iglesia: ${data.iglesia}\n`;
        mensaje += `Ciudad: ${data.ciudad}, ${data.pais}\n`;
        mensaje += `\n`;
        mensaje += `*Lista de Asistentes:*\n`;
        mensaje += `${listaAsistentes}`;
        mensaje += `\n`;
        mensaje += `*Inversión:* ${pricePerPerson} RD$ p/p = ${total} RD$ total\n`;
        mensaje += `\n`;
        mensaje += `Adjunto mi comprobante de transferencia. Por favor validar mi inscripción. ¡Gracias!`;
    }
    
    return mensaje;
}




// ============================================
// MANEJAR ENVÍO DE FORMULARIO
// ============================================
function handleSubmit(event, type) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.tipo = type;
    data.taller = tallerSeleccionado;

    // Para registro grupal, recolectar asistentes
    if (type === 'grupal') {
        data.asistentes = [];
        const rows = document.querySelectorAll('.attendee-row');
        rows.forEach((row, index) => {
            const i = index + 1;
            data.asistentes.push({
                nombre: formData.get(`attendee_name_${i}`),
                cedula: formData.get(`attendee_cedula_${i}`),
                taller: tallerSeleccionado,
                instrumento: formData.get(`attendee_instrumento_${i}`) || null
            });
        });

        Object.keys(data).forEach(key => {
            if (key.startsWith('attendee_')) delete data[key];
        });
    }

    console.log('Enviando registro via JSONP:', data);

    showLoading(true);

    sendDataJSONP(data, function(response) {
        showLoading(false);

                if (response.success) {
            // Generar mensaje de WhatsApp con datos del registro
            const mensajeWhatsApp = generarMensajeWhatsApp(data, type);
            const urlWhatsApp = 'https://wa.me/18494722853?text=' + encodeURIComponent(mensajeWhatsApp);
            
            // Resetear formulario
            form.reset();
            
            if (type === 'grupal') {
                const list = document.getElementById('attendees-list');
                while (list.children.length > 1) {
                    list.removeChild(list.lastChild);
                }
                attendeeCounter = 1;
                updatePrice();
            }
            
            actualizarInstrumentoFields();
            
            // Redireccionar a WhatsApp (misma pestaña)
            window.location.href = urlWhatsApp;
            
            return;
        } else {
            showError('Error: ' + (response.message || 'No se pudo guardar el registro'));
        }
    });
}


// ============================================
// MANEJAR SUBIDA DE ARCHIVO (preview)
// ============================================
document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'comprobante-file') {
        const file = e.target.files[0];
        if (file) {
            mostrarPreviewArchivo(file);
        }
    }
});

function mostrarPreviewArchivo(file) {
    const uploadArea = document.getElementById('file-upload-area');
    const preview = document.getElementById('file-preview');
    const content = uploadArea.querySelector('.file-upload-content');
    const fileName = document.getElementById('file-name');
    const previewImg = document.getElementById('file-preview-img');
    
    uploadArea.classList.add('has-file');
    content.classList.add('hidden');
    preview.classList.remove('hidden');
    fileName.textContent = file.name;
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        previewImg.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%23f97316" stroke-width="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>';
    }
}
