import { CONFIG } from '../src/config/config';
import { codigoQrYaUsado } from './baseDeDatos';

/**
 * Valida un código QR de fardo.
 *
 * Formato: 13 dígitos
 *   Posiciones 0-5  (6 dígitos): código del agricultor
 *   Posiciones 6-7  (2 dígitos): año de la temporada (ej: "26")
 *   Posiciones 8-12 (5 dígitos): secuencial
 */
export async function validarCodigoQR(codigoQr, codigoAgricultor, codigosEnSesion = []) {
  if (!/^\d{13}$/.test(codigoQr)) {
    return { valido: false, motivo: 'Formato inválido: debe tener exactamente 13 dígitos' };
  }

  const codigoAgricultorQr = codigoQr.substring(0, 6);
  if (codigoAgricultorQr !== codigoAgricultor) {
    return {
      valido: false,
      motivo: `Agricultor incorrecto: el fardo pertenece al código ${codigoAgricultorQr}, no a ${codigoAgricultor}`,
    };
  }

  const anioQr = codigoQr.substring(6, 8);
  if (anioQr !== CONFIG.TEMPORADA_ACTUAL) {
    return {
      valido: false,
      motivo: `Temporada incorrecta: el fardo es de la temporada ${anioQr}, se esperaba ${CONFIG.TEMPORADA_ACTUAL}`,
    };
  }

  if (codigosEnSesion.includes(codigoQr)) {
    return { valido: false, motivo: 'Código duplicado: ya fue escaneado en este envío' };
  }

  const yaUsado = await codigoQrYaUsado(codigoQr, codigoAgricultor, CONFIG.TEMPORADA_ACTUAL);
  if (yaUsado) {
    return { valido: false, motivo: 'Código duplicado: ya fue registrado en un envío anterior de este agricultor' };
  }

  return { valido: true };
}

export function esCodigoQrConFormato(texto) {
  return /^\d{13}$/.test(texto);
}
