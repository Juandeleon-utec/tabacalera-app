import RNHTMLtoPDF from 'react-native-html-to-pdf';
import * as Sharing from 'expo-sharing';

const NOMBRE_EMPRESA = 'Tabacalera S.A.';
const COLOR_EMPRESA = '#1B4332';

/**
 * Genera el HTML del remito de envío de fardos.
 */
function generarHtmlRemito(envio, fardos) {
  const fardosValidos = fardos.filter((f) => f.valido);
  const fechaFormateada = new Date(envio.created_at).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaFormateada = envio.hora;

  const filasFardos = fardosValidos
    .map(
      (f, i) => `
        <tr style="background: ${i % 2 === 0 ? '#F9F9F9' : '#FFFFFF'}">
          <td style="padding: 6px 10px; text-align: center;">${i + 1}</td>
          <td style="padding: 6px 10px; font-family: monospace; letter-spacing: 1px;">${f.codigo_qr}</td>
          <td style="padding: 6px 10px; text-align: center; color: #1B6B3A;">✓ Válido</td>
        </tr>
      `
    )
    .join('');

  const gpsTexto = envio.gps_lat && envio.gps_lng
    ? `Lat: ${parseFloat(envio.gps_lat).toFixed(6)}, Lng: ${parseFloat(envio.gps_lng).toFixed(6)}`
    : 'No registrada';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #222; }
        .membrete { background: ${COLOR_EMPRESA}; color: white; padding: 20px 30px; border-radius: 4px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
        .membrete h1 { margin: 0; font-size: 22px; }
        .membrete .subtitulo { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
        .membrete .fecha-doc { text-align: right; font-size: 13px; }
        h2 { color: ${COLOR_EMPRESA}; font-size: 15px; border-bottom: 2px solid ${COLOR_EMPRESA}; padding-bottom: 4px; margin-top: 24px; }
        .grid-datos { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; margin-bottom: 20px; }
        .dato { font-size: 13px; }
        .dato span { font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
        th { background: ${COLOR_EMPRESA}; color: white; padding: 8px 10px; text-align: left; }
        td { border-bottom: 1px solid #E0E0E0; }
        .resumen { margin-top: 20px; background: #F0F7F4; border: 1px solid #A8D5B8; border-radius: 4px; padding: 12px 16px; }
        .resumen p { margin: 4px 0; font-size: 13px; }
        .resumen .total { font-size: 16px; font-weight: bold; color: ${COLOR_EMPRESA}; }
        .pie { margin-top: 40px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #E0E0E0; padding-top: 10px; }
        .firma { margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .firma div { border-top: 1px solid #555; padding-top: 6px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="membrete">
        <div>
          <h1>${NOMBRE_EMPRESA}</h1>
          <p class="subtitulo">Compra de fardos de tabaco — Remito de envío</p>
        </div>
        <div class="fecha-doc">
          <div>Fecha: ${fechaFormateada}</div>
          <div>Hora: ${horaFormateada}</div>
        </div>
      </div>

      <h2>Datos del envío</h2>
      <div class="grid-datos">
        <div class="dato"><span>Agricultor:</span> ${envio.agricultor_nombre}</div>
        <div class="dato"><span>Código:</span> ${envio.agricultor_codigo}</div>
        <div class="dato"><span>Comprador:</span> ${envio.comprador_nombre || 'N/D'}</div>
        <div class="dato"><span>Ubicación GPS:</span> ${gpsTexto}</div>
      </div>

      <h2>Fardos escaneados (${fardosValidos.length})</h2>
      <table>
        <thead>
          <tr>
            <th style="width:50px">#</th>
            <th>Código QR</th>
            <th style="width:100px">Estado</th>
          </tr>
        </thead>
        <tbody>
          ${filasFardos}
        </tbody>
      </table>

      <div class="resumen">
        <p class="total">Total de fardos válidos: ${fardosValidos.length}</p>
        <p>Fardos inválidos/rechazados: ${fardos.length - fardosValidos.length}</p>
      </div>

      <div class="firma">
        <div>Firma del agricultor</div>
        <div>Firma del comprador</div>
      </div>

      <div class="pie">
        Documento generado automáticamente por sistema de gestión — ${NOMBRE_EMPRESA}
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera el PDF y devuelve la ruta del archivo.
 */
export async function generarPDFEnvio(envio, fardos) {
  const html = generarHtmlRemito(envio, fardos);
  const nombreArchivo = `remito_${envio.agricultor_codigo}_${envio.fecha?.replace(/-/g, '')}_${Date.now()}`;

  const opciones = {
    html,
    fileName: nombreArchivo,
    directory: 'Documents',
    base64: false,
  };

  const pdf = await RNHTMLtoPDF.convert(opciones);
  return pdf.filePath;
}

/**
 * Comparte el PDF (abre el selector de apps, incluido WhatsApp).
 */
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
