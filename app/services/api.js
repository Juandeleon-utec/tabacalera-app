import axios from 'axios';
import { obtenerInfoSync } from './baseDeDatos';

const URL_BASE = process.env.API_URL || 'http://192.168.1.100:3000';

const clienteApi = axios.create({
  baseURL: URL_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Agrega el token JWT a las peticiones que lo requieran
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
