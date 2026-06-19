/**
 * Configuración central de la aplicación.
 * Fuente única de verdad para todas las constantes.
 * Cambiar aquí y recompilar — no depende de .env en producción.
 */
export const CONFIG = {
  // ── Servidor ──────────────────────────────────────────────────────────────
  API_URL: 'http://192.168.4.202:3000',

  // ── Superadmin local ──────────────────────────────────────────────────────
  SUPERADMIN_USUARIO: 'admin',
  SUPERADMIN_PASSWORD: 'Admin2026!',

  // ── Sesión ────────────────────────────────────────────────────────────────
  DIAS_VENCIMIENTO_SESION: 14,

  // ── Temporada actual (2 dígitos — valida los QR escaneados) ──────────────
  TEMPORADA_ACTUAL: '26',
};
