import { NativeModules, Platform } from 'react-native';
import { CONFIG } from '../src/config/config';

const { ImpresionTermica } = NativeModules;

function esSoportado() {
  return Platform.OS === 'android' && ImpresionTermica != null;
}

export async function verificarImpresoraDisponible() {
  if (!esSoportado()) return false;
  try {
    // Pasa los puertos configurados; el módulo Java prueba cada uno en orden
    return await ImpresionTermica.verificarEnPuertos(CONFIG.IMPRESORA.PUERTOS);
  } catch {
    return false;
  }
}

export async function imprimirComprobante(envio, fardos, sesion) {
  if (!esSoportado()) {
    throw new Error('Impresión térmica no disponible en este dispositivo');
  }

  const fardosValidosQr = fardos
    .filter((f) => f.valido === 1 || f.valido === true)
    .map((f) => f.codigo_qr);

  const totalValidos = fardosValidosQr.length;
  const totalInvalidos = fardos.filter((f) => f.valido === 0 || f.valido === false).length;
  const totalDuplicados = fardos.filter(
    (f) =>
      (f.valido === 0 || f.valido === false) &&
      f.motivo_invalido?.toLowerCase().includes('duplicado')
  ).length;

  const datos = {
    agricultor: envio.agricultor_nombre || '',
    codigo: envio.agricultor_codigo || '',
    fecha: envio.fecha || '',
    hora: envio.hora || '',
    operador: sesion?.nombre || '',
    fardosValidos: fardosValidosQr,
    totalValidos,
    totalInvalidos,
    totalDuplicados,
    // Puertos desde config — el módulo Java los usa en lugar del hardcode interno
    puertos: CONFIG.IMPRESORA.PUERTOS,
  };

  await ImpresionTermica.imprimirTicket(datos);
}
