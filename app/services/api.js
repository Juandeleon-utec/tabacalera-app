import axios from 'axios';
import { CONFIG } from '../src/config/config';
import { obtenerInfoSync, obtenerTerminal } from './baseDeDatos';

// Confirmación en logcat que la URL correcta fue cargada al iniciar
console.log('[API] URL base:', CONFIG.API_URL);

const clienteApi = axios.create({
  baseURL: CONFIG.API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

async function obtenerHeaderAuth() {
  const info = await obtenerInfoSync();
  if (!info?.token_sync) return {};
  return { Authorization: `Bearer ${info.token_sync}` };
}

export async function descargarDatosSync() {
  console.log('[API] descargarDatosSync →', CONFIG.API_URL + '/api/sync');
  try {
    // id_instalacion permite al servidor registrar la terminal y devolver su código
    const terminal = await obtenerTerminal();
    const respuesta = await clienteApi.get('/api/sync', {
      params: terminal?.id_instalacion ? { id_instalacion: terminal.id_instalacion } : {},
    });
    console.log('[API] descargarDatosSync OK — status:', respuesta.status);
    return respuesta.data;
  } catch (error) {
    console.error('[API] descargarDatosSync ERROR:', {
      mensaje: error.message,
      codigo: error.code,
      url: error.config?.url,
      status: error.response?.status,
      data: JSON.stringify(error.response?.data)?.substring(0, 200),
    });
    throw error;
  }
}

export async function sincronizarEnvios(envios) {
  console.log('[API] sincronizarEnvios →', CONFIG.API_URL + '/api/envios/sync',
    '| cantidad:', envios.length);
  try {
    const headers = await obtenerHeaderAuth();
    const respuesta = await clienteApi.post('/api/envios/sync', { envios }, { headers });
    console.log('[API] sincronizarEnvios OK — status:', respuesta.status);
    return respuesta.data;
  } catch (error) {
    console.error('[API] sincronizarEnvios ERROR:', {
      mensaje: error.message,
      codigo: error.code,
      status: error.response?.status,
    });
    throw error;
  }
}

export async function verificarConectividad() {
  const url = CONFIG.API_URL + '/api/health';
  console.log('[RED] Verificando conectividad →', url);
  try {
    const inicio = Date.now();
    const respuesta = await clienteApi.get('/api/health', { timeout: 10000 });
    const ok = respuesta.data?.estado === 'ok';
    console.log(`[RED] Respuesta: HTTP ${respuesta.status} | estado="${respuesta.data?.estado}" | ok=${ok} | ${Date.now() - inicio}ms`);
    return ok;
  } catch (error) {
    console.warn('[RED] Fallo al verificar conectividad:', {
      mensaje: error.message,
      codigo: error.code,
      esTimeout: error.code === 'ECONNABORTED',
      esRed: error.message?.includes('Network'),
      urlIntentada: error.config?.url,
      status: error.response?.status,
    });
    return false;
  }
}
