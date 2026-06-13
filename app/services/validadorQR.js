import { codigoQrYaUsado } from './baseDeDatos';

const TEMPORADA_ACTUAL = process.env.TEMPORADA_ACTUAL || new Date().getFullYear().toString().slice(-2);

/**
 * Valida un código QR de fardo.
 *
 * Formato esperado: 13 dígitos
 *   - Posiciones 0-5  (6 dígitos): código del agricultor
 *   - Posiciones 6-7  (2 dígitos): año de la temporada (ej: "26")
 *   - Posiciones 8-12 (5 dígitos): secuencial
 *
 * @param {string} codigoQr - El código escaneado
 * @param {string} codigoAgricultor - Código del agricultor seleccionado (6 dígitos)
 * @param {number[]} codigosEnSesion - Array de códigos QR ya escaneados en este envío
 * @returns {{ valido: boolean, motivo?: string }}
 */
export async function validarCodigoQR(codigoQr, codigoAgricultor, codigosEnSesion = []) {
  // 1. Longitud exacta
  if (!/^\d{13}$/.test(codigoQr)) {
    return { valido: false, motivo: 'Formato inválido: debe tener exactamente 13 dígitos' };
  }

  // 2. Los primeros 6 dígitos deben coincidir con el código del agricultor
  const codigoAgricultorQr = codigoQr.substring(0, 6);
  if (codigoAgricultorQr !== codigoAgricultor) {
    return {
      valido: false,
      motivo: `Agricultor incorrecto: el fardo pertenece al código ${codigoAgricultorQr}, no a ${codigoAgricultor}`,
    };
  }

  // 3. Los dígitos 6-7 deben corresponder a la temporada actual
  const anioQr = codigoQr.substring(6, 8);
  if (anioQr !== TEMPORADA_ACTUAL) {
    return {
      valido: false,
      motivo: `Temporada incorrecta: el fardo es de la temporada ${anioQr}, se esperaba ${TEMPORADA_ACTUAL}`,
    };
  }

  // 4. No puede repetirse en el envío actual
  if (codigosEnSesion.includes(codigoQr)) {
    return { valido: false, motivo: 'Código duplicado: ya fue escaneado en este envío' };
  }

  // 5. No puede repetirse en envíos anteriores del mismo agricultor
  const yaUsado = await codigoQrYaUsado(codigoQr, codigoAgricultor, TEMPORADA_ACTUAL);
  if (yaUsado) {
    return { valido: false, motivo: 'Código duplicado: ya fue registrado en un envío anterior de este agricultor' };
  }

  return { valido: true };
}

export function esCodigoQrConFormato(texto) {
  return /^\d{13}$/.test(texto);
}
