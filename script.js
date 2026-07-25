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
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby_yEd54Yd2NXB4uH-A5JOifLOyWJ-V5utsr8Cs_vPk655fPvSYQhfIeeLMYRCfgrY0mQ/exec';

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
// CTA: SCROLL A LOS TALLERES
// ============================================
function scrollToTalleres() {
    const el = document.querySelector('.splash-workshops');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// CUENTA REGRESIVA AL EVENTO
// ============================================
const EVENTO_FECHA = new Date('2026-08-08T09:00:00-04:00'); // Sáb 8 Ago 2026, 9:00 AM (RD)

function pad2(n) { return String(n).padStart(2, '0'); }

function actualizarCountdown() {
    let diff = Math.floor((EVENTO_FECHA.getTime() - Date.now()) / 1000);
    if (diff < 0) diff = 0;

    const dias = Math.floor(diff / 86400);
    const horas = Math.floor((diff % 86400) / 3600);
    const min = Math.floor((diff % 3600) / 60);
    const seg = diff % 60;

    const set = function(id, val) {
        const e = document.getElementById(id);
        if (e) e.textContent = val;
    };
    set('cd-dias', dias);
    set('cd-horas', pad2(horas));
    set('cd-min', pad2(min));
    set('cd-seg', pad2(seg));
}

// ============================================
// BOTÓN STICKY (solo en el splash, al hacer scroll)
// ============================================
function actualizarStickyCta() {
    const sticky = document.getElementById('sticky-cta');
    const splash = document.getElementById('splash-screen');
    if (!sticky || !splash) return;
    const enSplash = !splash.classList.contains('hidden');
    const scrolled = window.scrollY > 320;
    sticky.classList.toggle('hidden', !(enSplash && scrolled));
}

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    actualizarCountdown();
    setInterval(actualizarCountdown, 1000);
    actualizarStickyCta();
    window.addEventListener('scroll', actualizarStickyCta, { passive: true });
});
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
    document.getElementById('taller-detalle').textContent = info.detalle;

    // Mostrar/ocultar campo de instrumento según el taller
    actualizarInstrumentoFields();

    // Scroll al formulario
    formSection.scrollIntoView({ behavior: 'smooth' });

    // Ocultar el botón sticky (ya no estamos en el splash)
    actualizarStickyCta();
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

    // Resetear vista previa del comprobante
    resetComprobantePreviews();

    // Scroll al top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Reevaluar el botón sticky (volvimos al splash)
    actualizarStickyCta();
}

// ============================================
// INFO DE TALLERES
// ============================================
const TALLERES = {
    adoracion: {
        label: 'Taller de Adoración y Alabanza',
        titulo: 'Mesa y Altar',
        instructor: 'Andrés Chapu Buffa · Músico y Productor Musical — Ministerio Toma Tu Lugar',
        detalle: 'Sáb 8 Ago · 3:00 PM - 9:00 PM · Salón del 5to Piso, Acropolis Center'
    },
    ninos: {
        label: 'Taller "Mis Generaciones"',
        titulo: 'Mis Generaciones',
        instructor: 'Andrés y Cintia Buffa · Para padres y servidores del ministerio infantil',
        detalle: 'Sáb 8 Ago · 9:00 AM - 1:00 PM · Salón del 5to Piso, Acropolis Center'
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

    // Overlay de pantalla completa (bloquea toda la interacción)
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.classList.toggle('hidden', !show);

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
// ENVIAR DATOS VIA POST (permite enviar imágenes)
// ============================================
// Nota: JSONP (GET) no sirve para el comprobante porque una imagen no cabe
// en la URL. Usamos POST con Content-Type "text/plain" para que Google Apps
// Script lo acepte sin bloqueo de CORS (evita la petición "preflight").
function sendDataPOST(data, callback) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    fetch(WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        redirect: 'follow',
        signal: controller.signal
    })
        .then(function(res) { return res.json(); })
        .then(function(response) {
            clearTimeout(timeoutId);
            callback(response);
        })
        .catch(function(err) {
            clearTimeout(timeoutId);
            console.error('Error al enviar el registro:', err);
            const message = err.name === 'AbortError'
                ? 'Tiempo de espera agotado. Revisa tu conexión e inténtalo de nuevo.'
                : 'Error de conexión con el servidor';
            callback({ success: false, message: message });
        });
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
        mensaje += `Ya subí mi comprobante de transferencia en el formulario. Por favor validar mi inscripción. ¡Gracias!`;

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
        mensaje += `Ya subí mi comprobante de transferencia en el formulario. Por favor validar mi inscripción. ¡Gracias!`;
    }
    
    return mensaje;
}




// ============================================
// MANEJAR ENVÍO DE FORMULARIO
// ============================================
async function handleSubmit(event, type) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    data.tipo = type;
    data.taller = tallerSeleccionado;

    // El objeto File no se puede serializar a JSON; lo procesamos aparte más abajo.
    delete data.comprobante;

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

    showLoading(true);

    // Procesar comprobante: imagen (comprimida) o PDF -> base64
    try {
        const fileInput = form.querySelector('.comprobante-input');
        if (fileInput && fileInput.files[0]) {
            const comprobante = await leerComprobante(fileInput.files[0]);
            data.comprobante_base64 = comprobante.base64;
            data.comprobante_nombre = comprobante.nombre;
            data.comprobante_tipo = comprobante.tipo;
        }
    } catch (err) {
        console.error('Error al procesar el comprobante:', err);
        showLoading(false);
        showError('No se pudo procesar el comprobante. Intenta con otra imagen o archivo.');
        return;
    }

    console.log('Enviando registro via POST');

    sendDataPOST(data, function(response) {
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
            resetComprobantePreviews();

            // Mostrar pantalla de confirmación (WhatsApp queda como acción opcional)
            mostrarConfirmacion(data, type, urlWhatsApp);

            return;
        } else {
            showError('Error: ' + (response.message || 'No se pudo guardar el registro'));
        }
    });
}


// ============================================
// PANTALLA DE CONFIRMACIÓN
// ============================================
function mostrarConfirmacion(data, type, urlWhatsApp) {
    document.getElementById('formulario-section').classList.add('hidden');

    const nombre = type === 'grupal' ? (data.lider_nombre || '') : (data.nombre || '');
    const tallerTxt = TALLERES[data.taller] ? TALLERES[data.taller].titulo : 'el taller';
    const saludo = nombre ? ('Gracias, ' + nombre.trim() + '. ') : 'Gracias. ';
    document.getElementById('confirmacion-text').textContent =
        saludo + 'Tu inscripción al taller "' + tallerTxt + '" quedó registrada y tu comprobante fue recibido.';

    document.getElementById('confirmacion-whatsapp').href = urlWhatsApp;

    document.getElementById('confirmacion-section').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function registrarOtro() {
    document.getElementById('confirmacion-section').classList.add('hidden');
    volverAlSplash();
}

// ============================================
// COPIAR AL PORTAPAPELES (datos bancarios)
// ============================================
function copiarDato(btn, texto) {
    const original = btn.textContent;
    const mostrarOk = function() {
        btn.textContent = '¡Copiado!';
        btn.classList.add('copied');
        setTimeout(function() {
            btn.textContent = original;
            btn.classList.remove('copied');
        }, 1500);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(mostrarOk).catch(function() {
            copiarFallback(texto, mostrarOk);
        });
    } else {
        copiarFallback(texto, mostrarOk);
    }
}

function copiarFallback(texto, done) {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignora */ }
    document.body.removeChild(ta);
    done();
}

// ============================================
// COMPROBANTE: PREVIEW AL SELECCIONAR ARCHIVO
// ============================================
document.addEventListener('change', function(e) {
    if (e.target && e.target.classList.contains('comprobante-input')) {
        mostrarPreviewComprobante(e.target);
    }
});

function mostrarPreviewComprobante(input) {
    const area = input.closest('.file-upload-area');
    if (!area) return;

    const file = input.files[0];
    const content = area.querySelector('.file-upload-content');
    const preview = area.querySelector('.file-preview');
    const previewImg = area.querySelector('.file-preview-img');
    const fileName = area.querySelector('.file-name');

    if (!file) {
        area.classList.remove('has-file');
        content.classList.remove('hidden');
        preview.classList.add('hidden');
        return;
    }

    area.classList.add('has-file');
    content.classList.add('hidden');
    preview.classList.remove('hidden');
    fileName.textContent = file.name;

    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(ev) {
            previewImg.src = ev.target.result;
            previewImg.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    } else {
        // PDF u otro: no mostramos imagen, solo el nombre del archivo
        previewImg.classList.add('hidden');
        previewImg.removeAttribute('src');
    }
}

// Restaura las zonas de subida a su estado inicial (tras enviar o volver)
function resetComprobantePreviews() {
    document.querySelectorAll('.file-upload-area').forEach(function(area) {
        area.classList.remove('has-file');
        const content = area.querySelector('.file-upload-content');
        const preview = area.querySelector('.file-preview');
        const previewImg = area.querySelector('.file-preview-img');
        if (content) content.classList.remove('hidden');
        if (preview) preview.classList.add('hidden');
        if (previewImg) previewImg.removeAttribute('src');
    });
}

// ============================================
// COMPROBANTE: LEER Y CONVERTIR A BASE64
// ============================================
// Devuelve { base64, nombre, tipo }. Las imágenes se comprimen antes de
// enviarlas para que el envío sea rápido y confiable; los PDF van tal cual.
function leerComprobante(file) {
    return new Promise(function(resolve, reject) {
        function finalizar(blob) {
            const reader = new FileReader();
            reader.onload = function() {
                // Un dataURL viene como "data:<tipo>;base64,<datos>"; enviamos solo <datos>.
                const base64 = String(reader.result).split(',')[1];
                resolve({
                    base64: base64,
                    nombre: file.name,
                    tipo: blob.type || file.type || 'application/octet-stream'
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        }

        if (file.type && file.type.indexOf('image/') === 0) {
            // Si la compresión falla por cualquier motivo, enviamos el original.
            comprimirImagen(file).then(finalizar).catch(function() { finalizar(file); });
        } else {
            finalizar(file);
        }
    });
}

// Redimensiona la imagen a máx. `maxLado` px y la exporta como JPEG.
function comprimirImagen(file, maxLado, calidad) {
    maxLado = maxLado || 1600;
    calidad = calidad || 0.82;

    return new Promise(function(resolve, reject) {
        const url = URL.createObjectURL(file);
        const img = new Image();

        img.onload = function() {
            let width = img.width;
            let height = img.height;

            if (width > maxLado || height > maxLado) {
                if (width >= height) {
                    height = Math.round(height * (maxLado / width));
                    width = maxLado;
                } else {
                    width = Math.round(width * (maxLado / height));
                    height = maxLado;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);

            canvas.toBlob(function(blob) {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('No se pudo comprimir la imagen'));
                }
            }, 'image/jpeg', calidad);
        };

        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('No se pudo cargar la imagen'));
        };

        img.src = url;
    });
}
