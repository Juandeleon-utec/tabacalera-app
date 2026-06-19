import axios from 'axios';
import { CONFIG } from '../src/config/config';
import { obtenerInfoSync } from './baseDeDatos';

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
  const respuesta = await clienteApi.get('/api/sync');
  return respuesta.data;
}

export async function sincronizarEnvios(envios) {
  const headers = await obtenerHeaderAuth();
  const respuesta = await clienteApi.post('/api/envios/sync', { envios }, { headers });
  return respuesta.data;
}

export async function verificarConectividad() {
  try {
    const respuesta = await clienteApi.get('/api/health', { timeout: 5000 });
    return respuesta.data?.estado === 'ok';
  } catch {
    return false;
  }
}
