import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';
import { CONFIG } from '../src/config/config';
import { buscarUsuarioPorNombre, obtenerInfoSync } from './baseDeDatos';

const CLAVE_SESION = 'sesion_actual';

// ─── Sesión ───────────────────────────────────────────────────────────────────

export async function guardarSesion(usuario) {
  const sesion = {
    id: usuario.id,
    nombre: usuario.nombre,
    usuario: usuario.usuario,
    rol: usuario.rol,
    login_at: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(sesion));
  return sesion;
}

export async function obtenerSesionActiva() {
  try {
    const sesionJson = await SecureStore.getItemAsync(CLAVE_SESION);
    if (!sesionJson) return null;

    const sesion = JSON.parse(sesionJson);

    // El superadmin no tiene vencimiento de sesión
    if (sesion.rol === 'superadmin') return sesion;

    const info = await obtenerInfoSync();
    if (!info?.ultima_sync) {
      const diasDesdeLogin = diasDesde(sesion.login_at);
      if (diasDesdeLogin > CONFIG.DIAS_VENCIMIENTO_SESION) return null;
    } else {
      const diasDesdeSync = diasDesde(info.ultima_sync);
      if (diasDesdeSync > CONFIG.DIAS_VENCIMIENTO_SESION) return null;
    }

    return sesion;
  } catch {
    return null;
  }
}

export async function cerrarSesion() {
  await SecureStore.deleteItemAsync(CLAVE_SESION);
}

export async function verificarVencimientoSync() {
  const info = await obtenerInfoSync();
  if (!info?.ultima_sync) return true;
  return diasDesde(info.ultima_sync) > CONFIG.DIAS_VENCIMIENTO_SESION;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(nombreUsuario, contrasena) {
  if (nombreUsuario === CONFIG.SUPERADMIN_USUARIO) {
    if (contrasena === CONFIG.SUPERADMIN_PASSWORD) {
      const sesionAdmin = {
        id: 0,
        nombre: 'Administrador',
        usuario: CONFIG.SUPERADMIN_USUARIO,
        rol: 'superadmin',
        login_at: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(sesionAdmin));
      return { ok: true, sesion: sesionAdmin };
    }
    return { ok: false, error: 'Contraseña incorrecta' };
  }

  const usuario = await buscarUsuarioPorNombre(nombreUsuario);
  if (!usuario) {
    return { ok: false, error: 'Usuario no encontrado. Realice una sincronización.' };
  }

  if (!usuario.activo) {
    return { ok: false, error: 'Usuario desactivado. Contacte al administrador.' };
  }

  const passwordValida = await bcrypt.compare(contrasena, usuario.password_hash);
  if (!passwordValida) {
    return { ok: false, error: 'Contraseña incorrecta' };
  }

  const vencida = await verificarVencimientoSync();
  if (vencida) {
    return {
      ok: false,
      error: `Han pasado más de ${CONFIG.DIAS_VENCIMIENTO_SESION} días sin sincronizar. Conéctese a la red interna y realice una sincronización.`,
      requiere_sync: true,
    };
  }

  const sesion = await guardarSesion(usuario);
  return { ok: true, sesion };
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function diasDesde(isoString) {
  const diffMs = new Date() - new Date(isoString);
  return diffMs / (1000 * 60 * 60 * 24);
}
