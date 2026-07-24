# Integración — Subir comprobante de pago al Google Sheet

Esto explica qué se cambió en el sitio (frontend) y **qué tiene que hacer Anthony** en el
Google Apps Script (backend) para que los comprobantes se guarden en Drive y el enlace
quede en el Google Sheet.

---

## Resumen de lo que cambió

- Ahora cada formulario (Individual y Grupal) tiene un campo **"Comprobante de pago"** obligatorio.
- La imagen se **comprime en el navegador** (máx. 1600 px, JPEG) para que el envío sea rápido y liviano. Los PDF se envían tal cual.
- **El envío pasó de JSONP (GET) a POST**, porque una imagen no cabe en una URL. Este es el cambio importante que obliga a actualizar el backend.
- El comprobante viaja como texto **base64** dentro del POST, en estos 3 campos nuevos:
  - `comprobante_base64` — el archivo codificado
  - `comprobante_nombre` — nombre original del archivo
  - `comprobante_tipo` — tipo MIME (ej. `image/jpeg`, `application/pdf`)

> ⚠️ **Importante:** como el frontend ahora envía por POST, el backend **tiene que tener un `doPost`**. Con el `doGet`/JSONP anterior el formulario dejaría de funcionar. Por eso hay que desplegar el backend nuevo.

---

## Pasos para Anthony

### 1. Abrir el Apps Script del Sheet
En el Google Sheet: **Extensiones → Apps Script**.

### 2. Pegar el código
Copia el contenido de **`Codigo.gs`** (en esta misma carpeta) y pégalo en el editor.

- Si tu script actual ya tenía lógica propia (otras columnas, notificaciones, etc.), **intégralo**: quédate con tu lógica y añade la parte de `doPost` + `guardarComprobante`. Si no tenías nada especial, puedes reemplazar todo con este archivo: ya escribe las filas en el Sheet por sí solo.

### 3. Configurar la carpeta de Drive
Arriba del archivo, en `CONFIG`:

```js
var CONFIG = {
  CARPETA_ID: '',                          // pega aquí el ID de tu carpeta de Drive
  CARPETA_NOMBRE: 'Comprobantes CAFE 2026', // o deja esto y el script crea la carpeta solo
  ...
};
```

- Para usar una carpeta existente: abre la carpeta en Drive y copia el ID de la URL
  (`drive.google.com/drive/folders/`**`ESTE_ID`**), pégalo en `CARPETA_ID`.
- Si lo dejas vacío, el script crea/usa una carpeta llamada **"Comprobantes CAFE 2026"** automáticamente.

### 4. Desplegar como aplicación web
**Implementar → Nueva implementación → tipo "Aplicación web"**:

- **Ejecutar como:** *Yo* (tu cuenta — para que tenga permiso de escribir en tu Drive/Sheet).
- **Quién tiene acceso:** *Cualquier usuario*.
- Clic en **Implementar** y **autoriza los permisos** (Drive + Sheets) la primera vez.

> Si en vez de una implementación nueva editas la existente, usa **"Administrar implementaciones → editar (lápiz) → Nueva versión"**. Publicar "Nueva versión" es **obligatorio** cada vez que cambias el código, si no, sigue corriendo la versión vieja.

### 5. Pasar la URL al frontend
Copia la **URL `/exec`** que te da al desplegar.

- Si es **la misma URL de antes**, no hay que tocar nada en el sitio.
- Si es **una URL nueva**, pásamela y la actualizo en `script.js` (constante `WEB_APP_URL`, línea 15). El sitio está en Vercel y se redespliega solo al hacer push.

---

## Coordinación del despliegue (para no romper el formulario)

Como el frontend nuevo envía por POST, conviene desplegar en este orden:

1. **Primero** Anthony despliega el backend nuevo (pasos 1–4).
2. **Después** se sube el frontend (push a Vercel) — o al mismo tiempo.

Si el sitio se actualiza antes que el backend, el formulario dará error de conexión hasta que el `doPost` esté publicado.

---

## Cómo queda en el Sheet

Se crean (si no existen) dos pestañas: **Individual** y **Grupal**. La última columna de cada
fila es **"Comprobante"** con el enlace al archivo en Drive. Para ver la miniatura dentro de la
celda puedes usar la fórmula `=IMAGE(url)` en una columna aparte.

---

## Notas / límites

- **Tamaño:** las imágenes se comprimen antes de enviarse, así que normalmente pesan pocos cientos de KB. Apps Script aguanta varios MB por envío sin problema.
- **Fotos de iPhone (HEIC):** el navegador las convierte a JPEG al comprimir, así que se guardan como `.jpg` sin problema.
- **Privacidad del enlace:** el script marca cada comprobante como *"cualquiera con el enlace puede ver"* para poder abrirlo desde el Sheet. Si tu organización lo bloquea, el archivo igual se guarda en tu carpeta; solo tendrás que abrirlo desde Drive directamente.
- **WhatsApp:** se mantiene el redireccionamiento a WhatsApp al finalizar (el mensaje ahora dice que el comprobante *ya se subió* en el formulario). Si prefieres quitar WhatsApp, avísame y lo elimino del frontend.
