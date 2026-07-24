/**
 * ============================================================
 * CAFE 2026 — Backend (Google Apps Script)
 * Recibe los registros del formulario, guarda el comprobante
 * de pago en Google Drive y escribe una fila en el Google Sheet
 * con el enlace al comprobante.
 * ============================================================
 *
 * CÓMO INSTALARLO (ver README-INTEGRACION.md para el detalle):
 *   1. Abre tu Google Sheet -> Extensiones -> Apps Script.
 *   2. Pega este código (reemplazando el anterior, o intégralo).
 *   3. Ajusta la CONFIG de abajo (carpeta de Drive).
 *   4. Implementar -> Nueva implementación -> Aplicación web:
 *        - Ejecutar como: Yo (tu cuenta)
 *        - Quién tiene acceso: Cualquier usuario
 *   5. Copia la URL /exec y pásala al frontend (WEB_APP_URL en script.js).
 */

// ============================================================
// CONFIGURACIÓN
// ============================================================
var CONFIG = {
  // Carpeta de Drive donde se guardarán los comprobantes.
  // Pega aquí el ID de la carpeta (lo que va después de /folders/ en la URL).
  // Si lo dejas vacío, el script crea/usa una carpeta llamada como CARPETA_NOMBRE.
  CARPETA_ID: '',
  CARPETA_NOMBRE: 'Comprobantes CAFE 2026',

  // Nombres de las pestañas (tabs) del Sheet. Se crean solas si no existen.
  HOJA_INDIVIDUAL: 'Individual',
  HOJA_GRUPAL: 'Grupal'
};

// ============================================================
// PUNTO DE ENTRADA — POST (lo que envía el formulario)
// ============================================================
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000); // evita que dos envíos simultáneos se pisen
  try {
    var data = JSON.parse(e.postData.contents);

    // 1) Guardar el comprobante en Drive (si vino uno)
    var comprobanteUrl = '';
    if (data.comprobante_base64) {
      comprobanteUrl = guardarComprobante(data);
    }

    // 2) Escribir la fila en la hoja correspondiente
    if (data.tipo === 'grupal') {
      guardarGrupal(data, comprobanteUrl);
    } else {
      guardarIndividual(data, comprobanteUrl);
    }

    return jsonResponse({ success: true, comprobanteUrl: comprobanteUrl });
  } catch (err) {
    return jsonResponse({ success: false, message: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Chequeo rápido de que el web app está vivo (abrir la URL en el navegador).
function doGet(e) {
  return jsonResponse({ success: true, message: 'CAFE 2026 backend activo' });
}

// ============================================================
// GUARDAR EL COMPROBANTE EN DRIVE
// ============================================================
function guardarComprobante(data) {
  var carpeta = obtenerCarpeta();

  var tipo = data.comprobante_tipo || 'application/octet-stream';
  var bytes = Utilities.base64Decode(data.comprobante_base64);

  // Nombre de archivo legible: quién + cédula + fecha
  var quien = data.tipo === 'grupal'
    ? (data.lider_nombre || 'lider')
    : ((data.nombre || '') + ' ' + (data.apellido || '')).trim();
  var cedula = data.tipo === 'grupal' ? (data.lider_cedula || '') : (data.cedula || '');
  var stamp = Utilities.formatDate(new Date(), 'GMT-4', 'yyyy-MM-dd_HH-mm-ss');
  var nombreArchivo = 'Comprobante_' + limpiar(quien) + '_' + limpiar(cedula) + '_' + stamp + extension(tipo);

  var blob = Utilities.newBlob(bytes, tipo, nombreArchivo);
  var file = carpeta.createFile(blob);

  // Enlace visible para cualquiera con el link (para poder abrirlo desde el Sheet)
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Si tu organización no permite compartir "cualquiera con el link",
    // el archivo igual queda guardado en tu carpeta; solo el enlace será privado.
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
// ESCRIBIR FILAS EN EL SHEET
// ============================================================
function guardarIndividual(data, comprobanteUrl) {
  var headers = [
    'Fecha', 'Taller', 'Nombre', 'Apellido', 'Cédula', 'Iglesia',
    'Teléfono', 'Email', 'Ciudad', 'País', 'Instrumento',
    'Contacto futuro', 'Inversión', 'Comprobante'
  ];
  var hoja = obtenerHoja(CONFIG.HOJA_INDIVIDUAL, headers);

  hoja.appendRow([
    new Date(),
    textoTaller(data.taller),
    data.nombre || '',
    data.apellido || '',
    data.cedula || '',
    data.iglesia || '',
    data.telefono || '',
    data.email || '',
    data.ciudad || '',
    data.pais || '',
    data.instrumento || '',
    data.contacto_futuro ? 'Sí' : 'No',
    'RD$1,500',
    comprobanteUrl
  ]);
}

function guardarGrupal(data, comprobanteUrl) {
  var headers = [
    'Fecha', 'Taller', 'Líder', 'Cédula líder', 'Cargo', 'Teléfono', 'Email',
    'Ministerio', 'Iglesia', 'Ciudad', 'País',
    'Cant. asistentes', 'Asistentes', 'Precio p/p', 'Total',
    'Contacto futuro', 'Comprobante'
  ];
  var hoja = obtenerHoja(CONFIG.HOJA_GRUPAL, headers);

  var asistentes = Array.isArray(data.asistentes) ? data.asistentes : [];
  var count = asistentes.length;
  var precio = precioPorPersona(count);

  var lista = asistentes.map(function(a, i) {
    var inst = a.instrumento ? ' (' + a.instrumento + ')' : '';
    return (i + 1) + '. ' + (a.nombre || '') + ' - ' + (a.cedula || '') + inst;
  }).join('\n');

  hoja.appendRow([
    new Date(),
    textoTaller(data.taller),
    data.lider_nombre || '',
    data.lider_cedula || '',
    data.lider_cargo || '',
    data.lider_telefono || '',
    data.lider_email || '',
    data.ministerio || '',
    data.iglesia || '',
    data.ciudad || '',
    data.pais || '',
    count,
    lista,
    'RD$' + precio.toLocaleString('en-US'),
    'RD$' + (count * precio).toLocaleString('en-US'),
    data.contacto_futuro ? 'Sí' : 'No',
    comprobanteUrl
  ]);
}

// Devuelve la pestaña; la crea con encabezados si no existe.
function obtenerHoja(nombre, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(headers);
    hoja.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
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
