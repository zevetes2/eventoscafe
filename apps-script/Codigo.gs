/**
 * ============================================================
 * CAFE 2026 — Backend (Google Apps Script)
 * Guarda el registro + el comprobante (Drive) en UNA sola pasada.
 * ============================================================
 *
 * INSTALACIÓN:
 *   1. Google Sheet -> Extensiones -> Apps Script.
 *   2. Pega este código completo (reemplaza TODO lo anterior).
 *   3. Guarda (Ctrl+S).
 *   4. Implementar -> Nueva implementación -> Aplicación web:
 *        - Ejecutar como: Yo (tu cuenta)
 *        - Quién tiene acceso: Cualquier usuario
 *      (Autoriza los permisos de Drive + Sheets + Gmail la primera vez.)
 *   5. Copia la URL /exec y pásala al frontend (WEB_APP_URL).
 *
 * IMPORTANTE: cada vez que cambies el código, publica una NUEVA VERSIÓN
 * de la implementación; si no, sigue corriendo la versión anterior.
 *
 * ¿Errores? Menú "Ver -> Ejecuciones" muestra la excepción exacta.
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
var CONFIG = {
  CARPETA_ID: '',           // ID de carpeta de Drive (opcional). Vacío = se crea por nombre.
  CARPETA_NOMBRE: 'Comprobantes CAFE 2026',
  HOJA_INDIVIDUAL: 'Registros Individuales',
  HOJA_GRUPAL: 'Registros Grupales',
  HOJA_ASISTENTES: 'Asistentes Grupales'
};

// Datos de pago que se muestran en los correos de confirmación
var PAGO = {
  beneficiario: 'Comunidad de Adoración Familia Eterna CAFE',
  banco: 'Banco Popular · Cuenta corriente',
  cuenta: '834253486',
  rnc: '43034570',
  whatsapp: '849-472-2853'
};

// ============================================================
// PUNTOS DE ENTRADA
// ============================================================

// POST: el formulario envía registro + comprobante juntos (JSON).
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('POST vacío: no llegó e.postData.contents');
    }

    var data = JSON.parse(e.postData.contents);
    if (!data.tipo) throw new Error('Falta el campo "tipo" en los datos');

    // 1) Subir el comprobante a Drive (si vino uno)
    var comprobanteUrl = '';
    if (data.comprobante_base64) {
      comprobanteUrl = guardarComprobante(data);
    }

    // 2) Guardar el registro CON la URL del comprobante en la misma fila
    if (data.tipo === 'grupal') {
      guardarRegistroGrupal(data, comprobanteUrl);
    } else {
      guardarRegistroIndividual(data, comprobanteUrl);
    }

    // 3) Email de confirmación (si falla, no debe tumbar el registro)
    enviarEmailConfirmacion(data, data.tipo === 'grupal' ? 'grupal' : 'individual');

    return jsonResponse({ success: true, comprobanteUrl: comprobanteUrl });

  } catch (err) {
    // Queda registrado en "Ver -> Ejecuciones" para diagnosticar
    console.error('doPost error: ' + (err && err.stack ? err.stack : err));
    return jsonResponse({ success: false, message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// GET: chequeo de salud + fallback JSONP (sin comprobante, no lo usa el sitio actual).
function doGet(e) {
  if (e && e.parameter && e.parameter.tipo) {
    return handleJsonp(e);
  }
  return jsonResponse({ success: true, message: 'CAFE 2026 backend activo' });
}

// ============================================================
// SUBIR COMPROBANTE A DRIVE
// ============================================================
function guardarComprobante(data) {
  var carpeta = obtenerCarpeta();

  if (!data.comprobante_base64) throw new Error('comprobante_base64 vacío');

  var tipo = data.comprobante_tipo || 'application/octet-stream';
  var bytes = Utilities.base64Decode(data.comprobante_base64);

  var quien = data.tipo === 'grupal'
    ? (data.lider_nombre || 'lider')
    : ((data.nombre || '') + ' ' + (data.apellido || '')).trim();
  var cedula = data.tipo === 'grupal' ? (data.lider_cedula || '') : (data.cedula || '');
  var stamp = Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH-mm-ss');
  var nombreArchivo = 'Comprobante_' + limpiar(quien) + '_' + limpiar(cedula) + '_' + stamp + extension(tipo);

  var blob = Utilities.newBlob(bytes, tipo, nombreArchivo);
  var file = carpeta.createFile(blob);

  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Si la organización no permite compartir por enlace, el archivo queda
    // guardado igual (privado). Se abre desde Drive.
    console.warn('No se pudo compartir el archivo: ' + err);
  }

  return file.getUrl();
}

function obtenerCarpeta() {
  if (CONFIG.CARPETA_ID) {
    return DriveApp.getFolderById(CONFIG.CARPETA_ID);
  }
  var existentes = DriveApp.getFoldersByName(CONFIG.CARPETA_NOMBRE);
  return existentes.hasNext() ? existentes.next() : DriveApp.createFolder(CONFIG.CARPETA_NOMBRE);
}

// ============================================================
// GUARDAR REGISTRO INDIVIDUAL
// ============================================================
function guardarRegistroIndividual(data, comprobanteUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.HOJA_INDIVIDUAL);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HOJA_INDIVIDUAL);
    sheet.appendRow([
      'Timestamp', 'Nombre', 'Apellido', 'Cédula', 'Iglesia', 'Teléfono',
      'Email', 'Ciudad', 'País', 'Taller', 'Instrumento', 'Contacto Futuro',
      'Inversión', 'URL Comprobante', 'Estado Pago'
    ]);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold').setBackground('#ea580c').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    data.nombre || '',
    data.apellido || '',
    data.cedula || '',
    data.iglesia || '',
    data.telefono || '',
    data.email || '',
    data.ciudad || '',
    data.pais || '',
    textoTaller(data.taller),
    data.instrumento || '',
    esSi(data.contacto_futuro),
    'RD$1,500',
    comprobanteUrl,
    'PENDIENTE'
  ]);
}

// ============================================================
// GUARDAR REGISTRO GRUPAL (+ hoja de asistentes)
// ============================================================
function guardarRegistroGrupal(data, comprobanteUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var timestamp = new Date();

  var sheetGrupal = ss.getSheetByName(CONFIG.HOJA_GRUPAL);
  if (!sheetGrupal) {
    sheetGrupal = ss.insertSheet(CONFIG.HOJA_GRUPAL);
    sheetGrupal.appendRow([
      'Timestamp', 'Cédula Líder', 'Nombre Líder', 'Email Líder', 'Teléfono Líder',
      'Cargo', 'Ministerio', 'Iglesia', 'Ciudad', 'País', 'Cantidad Asistentes',
      'Lista Asistentes', 'Precio p/p', 'Total', 'Contacto Futuro', 'URL Comprobante', 'Estado Pago'
    ]);
    sheetGrupal.getRange(1, 1, 1, 17).setFontWeight('bold').setBackground('#ea580c').setFontColor('#ffffff');
    sheetGrupal.setFrozenRows(1);
  }

  var asistentes = Array.isArray(data.asistentes) ? data.asistentes : [];
  var cantidad = asistentes.length;
  var precio = precioPorPersona(cantidad);

  var lista = asistentes.map(function(a, i) {
    var inst = a.instrumento ? ' (' + a.instrumento + ')' : '';
    return (i + 1) + '. ' + (a.nombre || '') + ' - ' + (a.cedula || '') + inst;
  }).join('\n');

  sheetGrupal.appendRow([
    timestamp,
    data.lider_cedula || '',
    data.lider_nombre || '',
    data.lider_email || '',
    data.lider_telefono || '',
    data.lider_cargo || '',
    data.ministerio || '',
    data.iglesia || '',
    data.ciudad || '',
    data.pais || '',
    cantidad,
    lista,
    'RD$' + precio.toLocaleString('en-US'),
    'RD$' + (cantidad * precio).toLocaleString('en-US'),
    esSi(data.contacto_futuro),
    comprobanteUrl,
    'PENDIENTE'
  ]);

  // Hoja detalle: una fila por asistente
  var sheetAsis = ss.getSheetByName(CONFIG.HOJA_ASISTENTES);
  if (!sheetAsis) {
    sheetAsis = ss.insertSheet(CONFIG.HOJA_ASISTENTES);
    sheetAsis.appendRow([
      'Timestamp', 'Cédula Líder', 'Nombre Líder', 'Nombre Asistente',
      'Cédula Asistente', 'Taller', 'Instrumento'
    ]);
    sheetAsis.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#ea580c').setFontColor('#ffffff');
    sheetAsis.setFrozenRows(1);
  }

  asistentes.forEach(function(a) {
    sheetAsis.appendRow([
      timestamp,
      data.lider_cedula || '',
      data.lider_nombre || '',
      a.nombre || '',
      a.cedula || '',
      textoTaller(a.taller || data.taller),
      a.instrumento || ''
    ]);
  });
}

// ============================================================
// FALLBACK JSONP (GET) — registro sin comprobante
// ============================================================
function handleJsonp(e) {
  var callbackName = e.parameter.callback || null;
  try {
    var data = {};
    for (var key in e.parameter) {
      if (key === 'callback') continue;
      try { data[key] = JSON.parse(e.parameter[key]); }
      catch (err) { data[key] = e.parameter[key]; }
    }

    if (data.tipo === 'grupal') {
      guardarRegistroGrupal(data, '');
    } else {
      guardarRegistroIndividual(data, '');
    }
    enviarEmailConfirmacion(data, data.tipo === 'grupal' ? 'grupal' : 'individual');

    var res = { success: true, message: 'Registro guardado' };
    return callbackName
      ? ContentService.createTextOutput(callbackName + '(' + JSON.stringify(res) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT)
      : jsonResponse(res);
  } catch (err) {
    console.error('handleJsonp error: ' + err);
    var errRes = { success: false, message: String(err) };
    return callbackName
      ? ContentService.createTextOutput(callbackName + '(' + JSON.stringify(errRes) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT)
      : jsonResponse(errRes);
  }
}

// ============================================================
// EMAIL DE CONFIRMACIÓN
// ============================================================
function enviarEmailConfirmacion(data, tipo) {
  try {
    var destinatario = tipo === 'individual' ? data.email : data.lider_email;
    if (!destinatario) return;

    var asunto = tipo === 'individual'
      ? 'Confirmación de Registro - CAFE 2026'
      : 'Confirmación de Registro Grupal - CAFE 2026';
    var cuerpo = tipo === 'individual' ? generarEmailIndividual(data) : generarEmailGrupal(data);

    MailApp.sendEmail({ to: destinatario, subject: asunto, htmlBody: cuerpo, name: 'Comunidad CAFE' });
  } catch (error) {
    console.error('Error enviando email: ' + error);
  }
}

function bloquePagoHtml(montoTexto) {
  return '' +
    '<div style="background:#fff7ed;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #ea580c;">' +
      '<h3 style="color:#ea580c;margin-top:0;">Datos de Pago - Transferencia Bancaria</h3>' +
      '<p><strong>Beneficiario:</strong> ' + PAGO.beneficiario + '</p>' +
      '<p><strong>Banco:</strong> ' + PAGO.banco + '</p>' +
      '<p><strong>No. de cuenta:</strong> ' + PAGO.cuenta + '</p>' +
      '<p><strong>RNC:</strong> ' + PAGO.rnc + '</p>' +
      '<p><strong>' + montoTexto + '</strong></p>' +
      '<p style="font-size:12px;color:#666;">Si ya subiste tu comprobante en el formulario, no necesitas hacer nada más. Dudas: WhatsApp ' + PAGO.whatsapp + '.</p>' +
    '</div>';
}

function generarEmailIndividual(data) {
  var instrumentoTexto = data.instrumento ? '<p><strong>Instrumento:</strong> ' + data.instrumento + '</p>' : '';
  return '' +
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">' +
      '<div style="background:#ea580c;padding:30px;text-align:center;">' +
        '<h1 style="color:white;margin:0;font-size:24px;">Comunidad CAFE</h1>' +
        '<p style="color:#fdba74;margin:10px 0 0 0;">Sábado 8 de Agosto 2026</p>' +
      '</div>' +
      '<div style="padding:30px;background:#f9f9f9;">' +
        '<h2 style="color:#ea580c;">¡Registro Confirmado!</h2>' +
        '<p>Hola <strong>' + (data.nombre || '') + ' ' + (data.apellido || '') + '</strong>,</p>' +
        '<p>Tu registro fue recibido exitosamente. Detalles:</p>' +
        '<div style="background:white;padding:20px;border-radius:8px;margin:20px 0;">' +
          '<p><strong>Taller:</strong> ' + textoTaller(data.taller) + '</p>' +
          instrumentoTexto +
          '<p><strong>Iglesia:</strong> ' + (data.iglesia || '') + '</p>' +
          '<p><strong>Ciudad:</strong> ' + (data.ciudad || '') + ', ' + (data.pais || '') + '</p>' +
        '</div>' +
        bloquePagoHtml('Monto: RD$1,500') +
        '<p style="color:#666;font-size:14px;">¡Nos vemos el 8 de agosto!</p>' +
      '</div>' +
      '<div style="background:#1a1a1a;padding:20px;text-align:center;">' +
        '<p style="color:#888;font-size:12px;margin:0;">Ministerio Toma Tu Lugar | CAFE 2026</p>' +
      '</div>' +
    '</div>';
}

function generarEmailGrupal(data) {
  var cantidad = data.asistentes ? data.asistentes.length : 0;
  var precio = precioPorPersona(cantidad);
  var total = cantidad * precio;

  var asistentesHtml = '';
  if (Array.isArray(data.asistentes)) {
    asistentesHtml = '<ul style="padding-left:20px;">';
    data.asistentes.forEach(function(a) {
      var instrumento = a.instrumento ? ' - ' + a.instrumento : '';
      asistentesHtml += '<li>' + (a.nombre || '') + ' (' + textoTaller(a.taller || data.taller) + instrumento + ')</li>';
    });
    asistentesHtml += '</ul>';
  }

  return '' +
    '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#333;">' +
      '<div style="background:#ea580c;padding:30px;text-align:center;">' +
        '<h1 style="color:white;margin:0;font-size:24px;">Comunidad CAFE</h1>' +
        '<p style="color:#fdba74;margin:10px 0 0 0;">Sábado 8 de Agosto 2026</p>' +
      '</div>' +
      '<div style="padding:30px;background:#f9f9f9;">' +
        '<h2 style="color:#ea580c;">¡Registro Grupal Confirmado!</h2>' +
        '<p>Hola <strong>' + (data.lider_nombre || '') + '</strong>,</p>' +
        '<p>El registro de tu grupo fue recibido exitosamente.</p>' +
        '<div style="background:white;padding:20px;border-radius:8px;margin:20px 0;">' +
          '<p><strong>Ministerio:</strong> ' + (data.ministerio || '') + '</p>' +
          '<p><strong>Iglesia:</strong> ' + (data.iglesia || '') + '</p>' +
          '<p><strong>Ciudad:</strong> ' + (data.ciudad || '') + ', ' + (data.pais || '') + '</p>' +
          '<p><strong>Cantidad de asistentes:</strong> ' + cantidad + '</p>' +
        '</div>' +
        '<div style="background:white;padding:20px;border-radius:8px;margin:20px 0;">' +
          '<h3 style="color:#333;margin-top:0;">Lista de Asistentes:</h3>' + asistentesHtml +
        '</div>' +
        bloquePagoHtml('Monto total: RD$' + total.toLocaleString('en-US') + ' (' + cantidad + ' x RD$' + precio.toLocaleString('en-US') + ')') +
        '<p style="color:#666;font-size:14px;">¡Nos vemos el 8 de agosto!</p>' +
      '</div>' +
      '<div style="background:#1a1a1a;padding:20px;text-align:center;">' +
        '<p style="color:#888;font-size:12px;margin:0;">Ministerio Toma Tu Lugar | CAFE 2026</p>' +
      '</div>' +
    '</div>';
}

// ============================================================
// UTILIDADES
// ============================================================
function precioPorPersona(count) {
  if (count >= 10) return 1000;
  if (count >= 5) return 1200;
  return 1500;
}

function textoTaller(taller) {
  if (taller === 'adoracion') return 'Taller de Adoración y Alabanza (Mesa y Altar)';
  if (taller === 'ninos') return 'Taller "Mis Generaciones" (para padres y servidores)';
  return taller || '';
}

function esSi(valor) {
  return (valor === 'on' || valor === true || valor === 'true') ? 'Sí' : 'No';
}

function extension(tipo) {
  var mapa = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/heic': '.heic',
    'application/pdf': '.pdf'
  };
  return mapa[tipo] || '';
}

function limpiar(texto) {
  return String(texto || '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sin-dato';
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
