/* ============================================
   COMUNIDAD VIVA - LANDING PAGE v2
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
const PRICE_PER_PERSON = 20;

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
    document.getElementById('attendee-count').textContent = count;
    document.getElementById('total-price').textContent = `$${count * PRICE_PER_PERSON} USD`;
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

    script.src = WEB_APP_URL + '?' + params.toString();

    window[callbackName] = function(response) {
        delete window[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
        callback(response);
    };

    script.onerror = function() {
        delete window[callbackName];
        if (script.parentNode) {
            script.parentNode.removeChild(script);
        }
        callback({ success: false, message: 'Error de conexión con el servidor' });
    };

    setTimeout(function() {
        if (window[callbackName]) {
            delete window[callbackName];
            if (script.parentNode) {
                script.parentNode.removeChild(script);
            }
            callback({ success: false, message: 'Tiempo de espera agotado' });
        }
    }, 15000);

    document.head.appendChild(script);
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
            document.getElementById('success-modal').classList.remove('hidden');
            form.reset();

            if (type === 'grupal') {
                const list = document.getElementById('attendees-list');
                while (list.children.length > 1) {
                    list.removeChild(list.lastChild);
                }
                attendeeCounter = 1;
                updatePrice();
            }

            // Restaurar campos de instrumento según taller
            actualizarInstrumentoFields();
        } else {
            showError('Error: ' + (response.message || 'No se pudo guardar el registro'));
        }
    });
}

// ============================================
// CERRAR MODAL
// ============================================
function closeModal() {
    document.getElementById('success-modal').classList.add('hidden');
}

// ============================================
// EVENT LISTENERS
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('success-modal').addEventListener('click', function(e) {
        if (e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
});