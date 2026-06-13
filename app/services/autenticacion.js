import * as SecureStore from 'expo-secure-store';
import bcrypt from 'bcryptjs';
import { buscarUsuarioPorNombre, obtenerInfoSync } from './baseDeDatos';

const CLAVE_SESION = 'sesion_actual';
const DIAS_VENCIMIENTO = 7;

// ─── Superadmin hardcodeado ───────────────────────────────────────────────────

const SUPERADMIN_USUARIO = process.env.SUPERADMIN_USUARIO || 'admin';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'AdminTabacalera2024!';

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

    // Verificar que no hayan pasado 7 días sin sync
    const info = await obtenerInfoSync();
    if (!info?.ultima_sync) {
      // Si nunca hubo sync, verificar que el login sea reciente
      const diasDesdeLogin = diasDesde(sesion.login_at);
      if (diasDesdeLogin > DIAS_VENCIMIENTO) return null;
    } else {
      const diasDesdeSync = diasDesde(info.ultima_sync);
      if (diasDesdeSync > DIAS_VENCIMIENTO) return null;
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
  if (!info?.ultima_sync) return true; // Nunca sincronizó
  return diasDesde(info.ultima_sync) > DIAS_VENCIMIENTO;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function login(nombreUsuario, contrasena) {
  // Primero verificar superadmin
  if (nombreUsuario === SUPERADMIN_USUARIO) {
    if (contrasena === SUPERADMIN_PASSWORD) {
      const sesionAdmin = {
        id: 0,
        nombre: 'Administrador',
        usuario: SUPERADMIN_USUARIO,
        rol: 'superadmin',
        login_at: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(CLAVE_SESION, JSON.stringify(sesionAdmin));
      return { ok: true, sesion: sesionAdmin };
    }
    return { ok: false, error: 'Contraseña incorrecta' };
  }

  // Buscar en base de datos local
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

  // Verificar vencimiento por días sin sync
  const vencida = await verificarVencimientoSync();
  if (vencida) {
    return {
      ok: false,
      error: `Han pasado más de ${DIAS_VENCIMIENTO} días sin sincronizar. Conéctese a la red interna y realice una sincronización.`,
      requiere_sync: true,
    };
  }

  const sesion = await guardarSesion(usuario);
  return { ok: true, sesion };
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function diasDesde(isoString) {
  const fecha = new Date(isoString);
  const ahora = new Date();
  const diffMs = ahora - fecha;
  return diffMs / (1000 * 60 * 60 * 24);
}
