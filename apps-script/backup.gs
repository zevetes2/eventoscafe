/**
 * ============================================================
 * CAFE 2026 — Backend Fusionado (Google Apps Script)
 * JSONP para registros + POST para comprobantes con Drive
 * ============================================================
 *
 * INSTRUCCIONES:
 *   1. Abre tu Google Sheet -> Extensiones -> Apps Script.
 *   2. Pega este código completo (reemplaza TODO lo anterior).
 *   3. Guarda (Ctrl+S).
 *   4. Implementar -> Nueva implementación -> Aplicación web:
 *        - Ejecutar como: Yo (tu cuenta)
 *        - Quién tiene acceso: Cualquier usuario
 *   5. Copia la URL /exec y pásala al frontend (WEB_APP_URL).
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
var CONFIG = {
  CARPETA_ID: '',           // ID de carpeta de Drive (opcional)
  CARPETA_NOMBRE: 'Comprobantes CAFE 2026',
  HOJA_INDIVIDUAL: 'Registros Individuales',
  HOJA_GRUPAL: 'Registros Grupales',
  HOJA_ASISTENTES: 'Asistentes Grupales'
};

// ============================================================
// PUNTO DE ENTRADA — GET (JSONP para registros normales)
// ============================================================
function doGet(e) {
  return handleRequest(e);
}

// ============================================================
// PUNTO DE ENTRADA — POST (Comprobantes con archivo Base64)
// ============================================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var data = JSON.parse(e.postData.contents);

    // Si viene comprobante_base64, es subida de comprobante
    if (data.comprobante_base64) {
      var comprobanteUrl = guardarComprobante(data);
      actualizarComprobanteEnHoja(data, comprobanteUrl);
      return jsonResponse({ success: true, comprobanteUrl: comprobanteUrl });
    }

    // Si no, es un registro normal vía POST (fallback)
    if (data.tipo === 'grupal') {
      guardarRegistroGrupal(data, '');
      enviarEmailConfirmacion(data, 'grupal');
    } else {
      guardarRegistroIndividual(data, '');
      enviarEmailConfirmacion(data, 'individual');
    }
    return jsonResponse({ success: true });

  } catch (err) {
    return jsonResponse({ success: false, message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// ============================================================
// MANEJADOR JSONP (para registros desde el frontend)
// ============================================================
function handleRequest(e) {
  try {
    let data;
    let callbackName = null;
    let response;

    // Detectar callback para JSONP
    if (e.parameter && e.parameter.callback) {
      callbackName = e.parameter.callback;
    }

    // Parsear datos
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = parseFormData(e.postData.contents);
      }
    } else if (e.parameter) {
      data = {};
      for (let key in e.parameter) {
        if (key !== 'callback') {
          try {
            data[key] = JSON.parse(e.parameter[key]);
          } catch {
            data[key] = e.parameter[key];
          }
        }
      }
    }

    if (!data || !data.tipo) {
      throw new Error('No se recibieron datos o falta el tipo de registro');
    }

    const tipo = data.tipo;

    if (tipo === 'individual') {
      guardarRegistroIndividual(data, '');
      enviarEmailConfirmacion(data, tipo);
      response = {
        success: true,
        message: 'Registro guardado exitosamente'
      };

    } else if (tipo === 'grupal') {
      guardarRegistroGrupal(data, '');
      enviarEmailConfirmacion(data, tipo);
      response = {
        success: true,
        message: 'Registro guardado exitosamente'
      };

    } else if (tipo === 'comprobante') {
      // Comprobante sin archivo (solo metadatos) — se guarda en hoja aparte
      guardarComprobanteMetadata(data);
      response = { success: true, message: 'Comprobante registrado' };

    } else {
      throw new Error('Tipo de registro no válido: ' + tipo);
    }

    // RESPUESTA JSONP
    if (callbackName) {
      return ContentService.createTextOutput(callbackName + '(' + JSON.stringify(response) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    const errorResponse = {
      success: false,
      message: error.toString()
    };

    if (callbackName) {
      return ContentService.createTextOutput(callbackName + '(' + JSON.stringify(errorResponse) + ');')
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    }

    return ContentService.createTextOutput(JSON.stringify(errorResponse))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// PARSEAR FORM DATA (para JSONP)
// ============================================================
function parseFormData(contents) {
  const data = {};
  const pairs = contents.split('&');
  pairs.forEach(pair => {
    const [key, value] = pair.split('=');
    if (key && value) {
      const decodedKey = decodeURIComponent(key);
      const decodedValue = decodeURIComponent(value);
      try {
        data[decodedKey] = JSON.parse(decodedValue);
      } catch {
        data[decodedKey] = decodedValue;
      }
    }
  });
  return data;
}

// ============================================================
// GUARDAR REGISTRO INDIVIDUAL
// ============================================================
function guardarRegistroIndividual(data, comprobanteUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.HOJA_INDIVIDUAL);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.HOJA_INDIVIDUAL);
    sheet.appendRow([
      'Timestamp',
      'Nombre',
      'Apellido',
      'Cédula',
      'Iglesia',
      'Teléfono',
      'Email',
      'Ciudad',
      'País',
      'Taller',
      'Instrumento',
      'Contacto Futuro',
      'Inversión',
      'URL Comprobante',
      'Estado Pago'
    ]);
    const headerRange = sheet.getRange(1, 1, 1, 15);
    headerRange.setFontWeight('bold')
      .setBackground('#ea580c')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  const timestamp = new Date();
  const contactoFuturo = data.contacto_futuro === 'on' || data.contacto_futuro === true || data.contacto_futuro === 'true' ? 'Sí' : 'No';

  sheet.appendRow([
    timestamp,
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
    contactoFuturo,
    'RD$1,500',
    comprobanteUrl,
    'PENDIENTE'
  ]);
}

// ============================================================
// GUARDAR REGISTRO GRUPAL
// ============================================================
function guardarRegistroGrupal(data, comprobanteUrl) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = new Date();
  const contactoFuturo = data.contacto_futuro === 'on' || data.contacto_futuro === true || data.contacto_futuro === 'true' ? 'Sí' : 'No';

  // === HOJA DE REGISTROS GRUPALES ===
  let sheetGrupal = ss.getSheetByName(CONFIG.HOJA_GRUPAL);

  if (!sheetGrupal) {
    sheetGrupal = ss.insertSheet(CONFIG.HOJA_GRUPAL);
    sheetGrupal.appendRow([
      'Timestamp',
      'Cédula Líder',
      'Nombre Líder',
      'Email Líder',
      'Teléfono Líder',
      'Cargo',
      'Ministerio',
      'Iglesia',
      'Ciudad',
      'País',
      'Cantidad Asistentes',
      'Lista Asistentes',
      'Precio p/p',
      'Total',
      'Contacto Futuro',
      'URL Comprobante',
      'Estado Pago'
    ]);
    const headerRange = sheetGrupal.getRange(1, 1, 1, 17);
    headerRange.setFontWeight('bold')
      .setBackground('#ea580c')
      .setFontColor('#ffffff');
    sheetGrupal.setFrozenRows(1);
  }

  const asistentes = Array.isArray(data.asistentes) ? data.asistentes : [];
  const cantidadAsistentes = asistentes.length;
  const precio = precioPorPersona(cantidadAsistentes);

  const lista = asistentes.map(function(a, i) {
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
    cantidadAsistentes,
    lista,
    'RD$' + precio.toLocaleString('en-US'),
    'RD$' + (cantidadAsistentes * precio).toLocaleString('en-US'),
    contactoFuturo,
    comprobanteUrl,
    'PENDIENTE'
  ]);

  // === HOJA DE ASISTENTES GRUPALES ===
  let sheetAsistentes = ss.getSheetByName(CONFIG.HOJA_ASISTENTES);

  if (!sheetAsistentes) {
    sheetAsistentes = ss.insertSheet(CONFIG.HOJA_ASISTENTES);
    sheetAsistentes.appendRow([
      'Timestamp',
      'Cédula Líder',
      'Nombre Líder',
      'Nombre Asistente',
      'Cédula Asistente',
      'Taller',
      'Instrumento'
    ]);
    const headerRange = sheetAsistentes.getRange(1, 1, 1, 7);
    headerRange.setFontWeight('bold')
      .setBackground('#ea580c')
      .setFontColor('#ffffff');
    sheetAsistentes.setFrozenRows(1);
  }

  if (asistentes.length > 0) {
    asistentes.forEach(asistente => {
      sheetAsistentes.appendRow([
        timestamp,
        data.lider_cedula || '',
        data.lider_nombre || '',
        asistente.nombre || '',
        asistente.cedula || '',
        textoTaller(asistente.taller || data.taller),
        asistente.instrumento || ''
      ]);
    });
  }
}

// ============================================================
// GUARDAR COMPROBANTE EN GOOGLE DRIVE
// ============================================================
function guardarComprobante(data) {
  var carpeta = obtenerCarpeta();

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
    // Si la organización no permite compartir, el archivo queda privado
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
// ACTUALIZAR COMPROBANTE EN HOJA EXISTENTE
// ============================================================
function actualizarComprobanteEnHoja(data, comprobanteUrl) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cedula = data.tipo === 'grupal' ? (data.lider_cedula || '') : (data.cedula || '');
  var hojaNombre = data.tipo === 'grupal' ? CONFIG.HOJA_GRUPAL : CONFIG.HOJA_INDIVIDUAL;
  var hoja = ss.getSheetByName(hojaNombre);

  if (!hoja || !cedula) return;

  var datos = hoja.getDataRange().getValues();
  var colCedula = data.tipo === 'grupal' ? 2 : 4; // Col B para grupal, Col D para individual
  var colComprobante = data.tipo === 'grupal' ? 16 : 14; // Col P para grupal, Col N para individual

  for (var i = datos.length - 1; i >= 1; i--) {
    if (String(datos[i][colCedula - 1]) === String(cedula)) {
      hoja.getRange(i + 1, colComprobante).setValue(comprobanteUrl);
      break;
    }
  }
}

// ============================================================
// GUARDAR METADATOS DE COMPROBANTE (sin archivo)
// ============================================================
function guardarComprobanteMetadata(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Comprobantes');

  if (!sheet) {
    sheet = ss.insertSheet('Comprobantes');
    sheet.appendRow([
      'Timestamp',
      'ID Registro',
      'Tipo Registro',
      'Depositante',
      'Banco Origen',
      'Monto',
      'Fecha Transferencia',
      'Filename',
      'Estado'
    ]);
    var headerRange = sheet.getRange(1, 1, 1, 9);
    headerRange.setFontWeight('bold')
      .setBackground('#ea580c')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    new Date(),
    data.registro_id || '',
    data.registro_tipo || '',
    data.depositante || '',
    data.banco_origen || '',
    data.monto_transferido || '',
    data.fecha_transferencia || '',
    data.filename || '',
    'PENDIENTE'
  ]);
}

// ============================================================
// ENVIAR EMAIL DE CONFIRMACIÓN
// ============================================================
function enviarEmailConfirmacion(data, tipo) {
  try {
    let destinatario;
    let asunto;
    let cuerpo;

    if (tipo === 'individual') {
      destinatario = data.email;
      asunto = 'Confirmación de Registro - Comunidad CAFE 2026';
      cuerpo = generarEmailIndividual(data);
    } else {
      destinatario = data.lider_email;
      asunto = 'Confirmación de Registro Grupal - Comunidad CAFE 2026';
      cuerpo = generarEmailGrupal(data);
    }

    if (destinatario) {
      MailApp.sendEmail({
        to: destinatario,
        subject: asunto,
        htmlBody: cuerpo,
        name: 'Comunidad CAFE'
      });
    }

  } catch (error) {
    console.error('Error enviando email:', error);
  }
}

function generarEmailIndividual(data) {
  const tallerTexto = data.taller === 'adoracion' ? 'Taller de Adoración (Andrés Buffa)' : 'Taller de Niños - Líderes Infantiles (Cintia Buffa)';
  const instrumentoTexto = data.instrumento ? `<p><strong>Instrumento:</strong> ${data.instrumento}</p>` : '';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #ea580c; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Comunidad CAFE</h1>
        <p style="color: #fdba74; margin: 10px 0 0 0;">Sábado 8 de Agosto 2026</p>
      </div>

      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #ea580c;">¡Registro Confirmado!</h2>
        <p>Hola <strong>${data.nombre} ${data.apellido}</strong>,</p>
        <p>Tu registro ha sido recibido exitosamente. Aquí están los detalles:</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Taller:</strong> ${tallerTexto}</p>
          ${instrumentoTexto}
          <p><strong>Iglesia:</strong> ${data.iglesia}</p>
          <p><strong>Ciudad:</strong> ${data.ciudad}, ${data.pais}</p>
        </div>

        <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
          <h3 style="color: #ea580c; margin-top: 0;">Datos de Pago - Transferencia Bancaria</h3>
          <p><strong>Banco:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Titular:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Cuenta:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Monto:</strong> RD$1,500</p>
          <p style="font-size: 12px; color: #666;">Por favor, envía el comprobante de pago por WhatsApp al 849-472-2853.</p>
        </div>

        <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p style="color: #666; font-size: 14px;">¡Nos vemos el 8 de agosto!</p>
      </div>

      <div style="background: #1a1a1a; padding: 20px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">Ministerio Toma Tu Lugar | Comunidad CAFE 2026</p>
      </div>
    </div>
  `;
}

function generarEmailGrupal(data) {
  const cantidadAsistentes = data.asistentes ? data.asistentes.length : 0;
  const precio = precioPorPersona(cantidadAsistentes);
  const total = cantidadAsistentes * precio;
  let asistentesHtml = '';

  if (data.asistentes && Array.isArray(data.asistentes)) {
    asistentesHtml = '<ul style="padding-left: 20px;">';
    data.asistentes.forEach((a, i) => {
      const taller = a.taller === 'adoracion' ? 'Adoración' : 'Niños';
      const instrumento = a.instrumento ? ` - ${a.instrumento}` : '';
      asistentesHtml += `<li>${a.nombre} (${taller}${instrumento})</li>`;
    });
    asistentesHtml += '</ul>';
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      <div style="background: #ea580c; padding: 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Comunidad CAFE</h1>
        <p style="color: #fdba74; margin: 10px 0 0 0;">Sábado 8 de Agosto 2026</p>
      </div>

      <div style="padding: 30px; background: #f9f9f9;">
        <h2 style="color: #ea580c;">¡Registro Grupal Confirmado!</h2>
        <p>Hola <strong>${data.lider_nombre}</strong>,</p>
        <p>El registro de tu grupo ha sido recibido exitosamente.</p>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Ministerio:</strong> ${data.ministerio}</p>
          <p><strong>Iglesia:</strong> ${data.iglesia}</p>
          <p><strong>Ciudad:</strong> ${data.ciudad}, ${data.pais}</p>
          <p><strong>Cantidad de asistentes:</strong> ${cantidadAsistentes}</p>
        </div>

        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Lista de Asistentes:</h3>
          ${asistentesHtml}
        </div>

        <div style="background: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c;">
          <h3 style="color: #ea580c; margin-top: 0;">Datos de Pago - Transferencia Bancaria</h3>
          <p><strong>Banco:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Titular:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Cuenta:</strong> [PENDIENTE - Configurar]</p>
          <p><strong>Monto total:</strong> RD$${total.toLocaleString('en-US')} (${cantidadAsistentes} personas x RD$${precio.toLocaleString('en-US')})</p>
          <p style="font-size: 12px; color: #666;">Por favor, envía el comprobante de pago por WhatsApp al 849-472-2853.</p>
        </div>

        <p style="color: #666; font-size: 14px;">Si tienes alguna pregunta, no dudes en contactarnos.</p>
        <p style="color: #666; font-size: 14px;">¡Nos vemos el 8 de agosto!</p>
      </div>

      <div style="background: #1a1a1a; padding: 20px; text-align: center;">
        <p style="color: #888; font-size: 12px; margin: 0;">Ministerio Toma Tu Lugar | Comunidad CAFE 2026</p>
      </div>
    </div>
  `;
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
  if (taller === 'adoracion') return 'Taller de Adoración';
  if (taller === 'ninos') return 'Taller de Niños';
  return taller || '';
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
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}