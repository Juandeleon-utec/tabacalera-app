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

  // ── Impresora térmica ESC/POS ─────────────────────────────────────────────
  // Puertos serie a probar en orden. Varía según el modelo del dispositivo.
  // Q2I usa ttyS1 o ttyS2. Otros modelos pueden usar ttyS3–ttyS5.
  IMPRESORA: {
    PUERTOS: ['/dev/ttyS1', '/dev/ttyS2', '/dev/ttyS3', '/dev/ttyS4', '/dev/ttyS5'],
    ANCHO_LINEA: 32,
  },
};
