import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import COLORES from '../constants/colores';

const NOMBRE_EMPRESA = 'Montepaz';
const SUBTITULO_EMPRESA = 'Tabacalera — Desde 1880';

function estadoFardo(fardo) {
  if (fardo.valido === 1 || fardo.valido === true) return 'valido';
  if (fardo.motivo_invalido?.toLowerCase().includes('duplicado')) return 'duplicado';
  return 'invalido';
}

function generarHtmlRemito(envio, fardos) {
  const totalValidos = fardos.filter((f) => estadoFardo(f) === 'valido').length;
  const totalDuplicados = fardos.filter((f) => estadoFardo(f) === 'duplicado').length;
  const totalInvalidos = fardos.filter((f) => estadoFardo(f) === 'invalido').length;

  const fechaFormateada = envio.fecha
    ? envio.fecha.split('-').reverse().join('/')
    : new Date(envio.created_at).toLocaleDateString('es-UY', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });

  const filasFardos = fardos
    .map((f, i) => {
      const estado = estadoFardo(f);
      const colorFila = i % 2 === 0 ? '#F9F6F0' : '#FFFFFF';
      const [colorEstado, textoEstado] =
        estado === 'valido'
          ? [COLORES.valido, '✓ Válido']
          : estado === 'duplicado'
          ? [COLORES.duplicado, '✗ Duplicado']
          : [COLORES.invalido, '✗ Inválido'];

      return `
        <tr style="background:${colorFila}">
          <td style="padding:5px 8px;text-align:center;color:#888">${i + 1}</td>
          <td style="padding:5px 8px;font-family:monospace;font-size:12px;letter-spacing:1px">${f.codigo_qr}</td>
          <td style="padding:5px 8px;font-size:11px;color:${colorEstado};font-weight:600">${textoEstado}</td>
          <td style="padding:5px 8px;font-size:11px;color:#999">${
            !f.valido && f.motivo_invalido
              ? f.motivo_invalido.split(':')[0]
              : ''
          }</td>
        </tr>
      `;
    })
    .join('');

  const gpsTexto =
    envio.gps_lat && envio.gps_lng
      ? `${parseFloat(envio.gps_lat).toFixed(6)}, ${parseFloat(envio.gps_lng).toFixed(6)}`
      : 'No registrada';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <style>
        body{font-family:Arial,sans-serif;margin:0;padding:20px;color:#2B2118;font-size:13px}
        .membrete{background:${COLORES.primario};color:white;padding:18px 24px;border-radius:6px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center}
        .membrete h1{margin:0;font-size:20px;letter-spacing:0.5px}
        .membrete .sub{margin:4px 0 0;font-size:12px;opacity:0.85}
        .membrete .fecha-doc{text-align:right;font-size:12px;line-height:1.7}
        h2{color:${COLORES.primario};font-size:13px;border-bottom:2px solid ${COLORES.acento};padding-bottom:3px;margin:20px 0 10px}
        .grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:16px}
        .dato{font-size:12px}.dato b{color:${COLORES.primario}}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
        th{background:${COLORES.primario};color:white;padding:7px 8px;text-align:left;font-size:11px}
        td{border-bottom:1px solid #E6DFD2}
        .resumen{margin-top:16px;background:${COLORES.fondoInfo};border:1px solid ${COLORES.bordeValido};border-radius:5px;padding:12px 16px}
        .resumen p{margin:3px 0;font-size:12px}
        .resumen .total{font-size:15px;font-weight:bold;color:${COLORES.primario}}
        .firma{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:20px}
        .firma div{border-top:1px solid #999;padding-top:6px;text-align:center;font-size:11px;color:#555}
        .pie{margin-top:20px;font-size:10px;color:#aaa;text-align:center;border-top:1px solid #E6DFD2;padding-top:8px}
      </style>
    </head>
    <body>
      <div class="membrete">
        <div>
          <h1>${NOMBRE_EMPRESA}</h1>
          <p class="sub">${SUBTITULO_EMPRESA}</p>
          <p class="sub">Remito de compra de fardos</p>
        </div>
        <div class="fecha-doc">
          <div><b>Fecha:</b> ${fechaFormateada}</div>
          <div><b>Hora:</b> ${envio.hora || ''}</div>
        </div>
      </div>

      <h2>Datos del envío</h2>
      <div class="grid">
        <div class="dato"><b>Agricultor:</b> ${envio.agricultor_nombre || ''}</div>
        <div class="dato"><b>Código agricultor:</b> ${envio.agricultor_codigo || ''}</div>
        <div class="dato"><b>Operador:</b> ${envio.comprador_nombre || 'N/D'}</div>
        <div class="dato"><b>Ubicación GPS:</b> ${gpsTexto}</div>
      </div>

      <h2>Fardos escaneados (${fardos.length})</h2>
      <table>
        <thead>
          <tr>
            <th style="width:36px">#</th>
            <th>Código QR</th>
            <th style="width:90px">Estado</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>${filasFardos}</tbody>
      </table>

      <div class="resumen">
        <p class="total">Fardos válidos: ${totalValidos}</p>
        <p>Duplicados: ${totalDuplicados}</p>
        <p>Inválidos: ${totalInvalidos}</p>
        <p style="margin-top:6px;font-weight:600">Total escaneados: ${fardos.length}</p>
      </div>

      <div class="firma">
        <div>Firma del agricultor</div>
        <div>Firma del operador</div>
      </div>

      <div class="pie">
        Generado por Tabacalera Montepaz v1.0 — ${NOMBRE_EMPRESA} ${new Date().getFullYear()}
      </div>
    </body>
    </html>
  `;
}

export async function generarPDFEnvio(envio, fardos) {
  const html = generarHtmlRemito(envio, fardos);
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

export async function compartirPDF(rutaPDF) {
  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('La función de compartir no está disponible en este dispositivo');
  }
  await Sharing.shareAsync(rutaPDF, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartir remito de fardos',
    UTI: 'com.adobe.pdf',
  });
}
