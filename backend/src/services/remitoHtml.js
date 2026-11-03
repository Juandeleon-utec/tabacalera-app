/**
 * HTML del remito de compra de fardos, para reimprimir desde el panel.
 *
 * Es un port de generarHtmlRemito() de app/services/generadorPDF.js: mismo
 * diseño y mismos datos, para que la copia que se le da al agricultor sea
 * igual al PDF que generó la terminal. Si se cambia el remito en la app,
 * hay que replicar el cambio acá.
 *
 * Diferencias con el original:
 * - Las horas se formatean en America/Montevideo (en la app se usa la hora
 *   local del teléfono; el servidor puede tener otra zona).
 * - Barra superior (solo pantalla) con el botón de imprimir/guardar PDF.
 * - El pie indica que es una reimpresión y cuándo se hizo.
 */

const NOMBRE_EMPRESA = 'C.I.T.M.P.S.A.';
const SUBTITULO_EMPRESA = 'Tabacalera Montepaz S.A.';
const ZONA_HORARIA = 'America/Montevideo';

// Subconjunto de app/constants/colores.js
const COLORES = {
  primario: '#6B5333',
  acento: '#B08D45',
  fondoInfo: '#F1E9D8',
  valido: '#16A34A',
  bordeValido: '#A8D5B8',
};

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearHora(valor) {
  if (!valor) return '';
  const d = new Date(valor);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('es-UY', {
    timeZone: ZONA_HORARIA, hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function formatearFechaHora(valor) {
  const d = new Date(valor);
  return d.toLocaleString('es-UY', {
    timeZone: ZONA_HORARIA, day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function duracionCarga(inicio, fin) {
  if (!inicio || !fin) return '';
  const ms = new Date(fin).getTime() - new Date(inicio).getTime();
  if (isNaN(ms) || ms < 0) return '';
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}

function esValido(fardo) {
  return fardo.valido === 1 || fardo.valido === true;
}

/**
 * @param {object} envio Envio.toJSON() con include agricultor, usuario,
 *                       transportista y fardos.
 */
function generarHtmlRemito(envio) {
  const agricultor = envio.agricultor || {};
  const t = envio.transportista;

  const bloqueRemito = envio.nro_remito ? `
          <div class="nro-remito">N° ${escaparHtml(envio.nro_remito)}</div>` : '';
  const bloqueCarga = envio.hora_inicio_carga ? `
          <div><b>Inicio carga:</b> ${formatearHora(envio.hora_inicio_carga)}</div>
          <div><b>Fin carga:</b> ${formatearHora(envio.hora_fin_carga)}</div>
          <div><b>Duración:</b> ${duracionCarga(envio.hora_inicio_carga, envio.hora_fin_carga)}</div>` : '';

  const fardosValidos = (envio.fardos || [])
    .filter(esValido)
    .sort((a, b) => new Date(a.timestamp_escaneo) - new Date(b.timestamp_escaneo));
  const totalValidos = fardosValidos.length;

  const fechaFormateada = envio.fecha ? String(envio.fecha).split('-').reverse().join('/') : '';
  const hora = envio.hora ? String(envio.hora).substring(0, 5) : '';

  const filasFardos = fardosValidos
    .map((f, i) => {
      const colorFila = i % 2 === 0 ? '#F9F6F0' : '#FFFFFF';
      return `
        <tr style="background:${colorFila}">
          <td style="padding:5px 8px;text-align:center;color:#888">${i + 1}</td>
          <td style="padding:5px 8px;font-family:monospace;font-size:12px;letter-spacing:1px">${escaparHtml(f.codigo_qr)}</td>
          <td style="padding:5px 8px;font-size:11px;color:${COLORES.valido};font-weight:600">✓ Válido</td>
        </tr>`;
    })
    .join('');

  const gpsTexto = envio.gps_lat && envio.gps_lng
    ? `${parseFloat(envio.gps_lat).toFixed(6)}, ${parseFloat(envio.gps_lng).toFixed(6)}`
    : 'No registrada';

  const seccionTransporte = t ? `
    <h2>Transporte</h2>
    <div class="grid">
      <div class="dato"><b>Empresa:</b> ${escaparHtml(t.empresa)}</div>
      <div class="dato"><b>Chofer:</b> ${escaparHtml(t.nombre_chofer)}</div>
      <div class="dato"><b>Matrícula:</b> ${escaparHtml(t.matricula)}</div>
      ${envio.documento_chofer_real ? `<div class="dato"><b>Documento:</b> ${escaparHtml(envio.documento_chofer_real)}</div>` : ''}
      ${envio.observaciones ? `<div class="dato" style="grid-column:span 2"><b>Observaciones:</b> ${escaparHtml(envio.observaciones)}</div>` : ''}
    </div>` : '';

  const bloqueColorEtiqueta = envio.color_etiqueta_nombre && REGEX_HEX.test(envio.color_etiqueta_hex || '') ? `
    <div class="dato color-etiqueta" style="grid-column:span 2">
      <span class="swatch" style="background:${envio.color_etiqueta_hex}"></span>
      <span><b>Color de etiqueta:</b> ${escaparHtml(envio.color_etiqueta_nombre)}</span>
    </div>` : '';

  const titulo = envio.nro_remito
    ? `Remito ${envio.nro_remito}`
    : `Remito ${agricultor.codigo_6dig || ''} ${fechaFormateada}`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>${escaparHtml(titulo)}</title>
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#2B2118;font-size:13px}
    .barra{display:flex;gap:10px;align-items:center;justify-content:space-between;background:#F1E9D8;border:1px solid #D8CBB4;border-radius:6px;padding:10px 14px;margin-bottom:16px;font-size:12px}
    .barra button{background:${COLORES.primario};color:#fff;border:0;border-radius:4px;padding:8px 16px;font-size:14px;cursor:pointer}
    .membrete{background:${COLORES.primario};color:white;padding:18px 24px;border-radius:6px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
    .membrete h1{margin:0;font-size:20px;letter-spacing:0.5px}
    .membrete .sub{margin:4px 0 0;font-size:12px;opacity:0.85}
    .membrete .fecha-doc{text-align:right;font-size:12px;line-height:1.7}
    .membrete .nro-remito{font-size:15px;font-weight:bold;font-family:monospace;letter-spacing:0.5px;margin-bottom:2px}
    h2{color:${COLORES.primario};font-size:13px;border-bottom:2px solid ${COLORES.acento};padding-bottom:3px;margin:20px 0 10px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:16px}
    .dato{font-size:12px}.dato b{color:${COLORES.primario}}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    th{background:${COLORES.primario};color:white;padding:7px 8px;text-align:left;font-size:11px}
    td{border-bottom:1px solid #E6DFD2}
    .total-validos{margin-top:16px;background:${COLORES.fondoInfo};border:1px solid ${COLORES.bordeValido};border-radius:5px;padding:12px 16px}
    .total-validos p{margin:0;font-size:15px;font-weight:bold;color:${COLORES.primario}}
    .firma{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .firma div{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:11px;color:#555}
    .pie{margin-top:20px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #E6DFD2;padding-top:8px}
    .color-etiqueta{display:flex;align-items:center;gap:6px}
    .swatch{display:inline-block;width:14px;height:14px;border:1px solid #555}
    *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @media print{.barra{display:none}body{padding:0}}
    @page{size:A4;margin:12mm}
  </style>
</head>
<body>
  <div class="barra">
    <span>Para enviarlo por WhatsApp, elegí <b>Guardar como PDF</b> en el diálogo de impresión.</span>
    <button onclick="window.print()">Imprimir / Guardar PDF</button>
  </div>

  <div class="membrete">
    <div>
      <h1>${NOMBRE_EMPRESA}</h1>
      <p class="sub">${SUBTITULO_EMPRESA}</p>
      <p class="sub">Remito de compra de fardos</p>
    </div>
    <div class="fecha-doc">${bloqueRemito}
      <div><b>Fecha:</b> ${fechaFormateada}</div>
      <div><b>Hora:</b> ${escaparHtml(hora)}</div>${bloqueCarga}
    </div>
  </div>

  <h2>Datos del envío</h2>
  <div class="grid">
    <div class="dato"><b>Agricultor:</b> ${escaparHtml(agricultor.nombre)}</div>
    <div class="dato"><b>Código agricultor:</b> ${escaparHtml(agricultor.codigo_6dig)}</div>
    <div class="dato"><b>Operador:</b> ${escaparHtml(envio.usuario?.nombre || 'N/D')}</div>
    <div class="dato"><b>Ubicación GPS:</b> ${gpsTexto}</div>
    ${bloqueColorEtiqueta}
  </div>
  ${seccionTransporte}

  <h2>Fardos válidos (${totalValidos})</h2>
  <table>
    <thead>
      <tr>
        <th style="width:36px">#</th>
        <th>Código QR</th>
        <th style="width:80px">Estado</th>
      </tr>
    </thead>
    <tbody>${filasFardos}</tbody>
  </table>

  <div class="total-validos">
    <p>Total fardos válidos: ${totalValidos}</p>
  </div>

  <div class="firma">
    <div>Firma del agricultor</div>
    <div>Firma del operador</div>
  </div>

  <div class="pie">
    Reimpresión desde el servidor — ${formatearFechaHora(new Date())} — ${NOMBRE_EMPRESA} ${new Date().getFullYear()}
  </div>
</body>
</html>`;
}

module.exports = { generarHtmlRemito };
