/**
 * Genera un ID local único para identificar envíos creados offline.
 * Usa Math.random() sin dependencias externas (suficiente para IDs locales).
 */
export function generarIdLocal() {
  const timestamp = Date.now().toString(36);
  const aleatorio = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${aleatorio}`;
}
