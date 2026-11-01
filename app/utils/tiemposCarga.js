/**
 * Formateo de los tiempos de carga (guardados como ISO 8601 UTC)
 * a hora local del dispositivo.
 */
export function formatearHoraLocal(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toTimeString().substring(0, 5);
}

export function duracionCarga(inicioIso, finIso) {
  if (!inicioIso || !finIso) return '';
  const ms = new Date(finIso).getTime() - new Date(inicioIso).getTime();
  if (isNaN(ms) || ms < 0) return '';
  const minutos = Math.round(ms / 60000);
  if (minutos < 60) return `${minutos} min`;
  return `${Math.floor(minutos / 60)} h ${String(minutos % 60).padStart(2, '0')} min`;
}
