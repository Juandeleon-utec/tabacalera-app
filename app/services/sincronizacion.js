import NetInfo from '@react-native-community/netinfo';
import {
  guardarUsuarios,
  guardarAgricultores,
  guardarInfoSync,
  listarEnviosNosincronizados,
  listarFardosPorEnvio,
  marcarEnvioSincronizado,
} from './baseDeDatos';
import { descargarDatosSync, sincronizarEnvios, verificarConectividad } from './api';

/**
 * Verifica si hay conectividad con el servidor interno.
 * No basta con tener WiFi; el servidor debe responder.
 */
export async function hayConectividadConServidor() {
  const estado = await NetInfo.fetch();
  if (estado.type !== 'wifi') return false;
  return await verificarConectividad();
}

/**
 * Sincronización inicial: descarga usuarios y agricultores desde el servidor.
 * Solo debe ejecutarla el superadmin.
 * @param {function} onProgreso - Callback con mensajes de progreso
 */
export async function sincronizacionInicial(onProgreso) {
  onProgreso('Conectando con el servidor...');

  const conectado = await hayConectividadConServidor();
  if (!conectado) {
    throw new Error('No hay conexión con el servidor. Verifique que está en la red interna WiFi.');
  }

  onProgreso('Descargando datos del servidor...');
  const datos = await descargarDatosSync();

  onProgreso(`Guardando ${datos.usuarios.length} usuarios...`);
  await guardarUsuarios(datos.usuarios);

  onProgreso(`Guardando ${datos.agricultores.length} agricultores...`);
  await guardarAgricultores(datos.agricultores);

  onProgreso('Guardando información de sincronización...');
  await guardarInfoSync(datos.token_sync);

  onProgreso('¡Sincronización completada!');
  return {
    usuarios: datos.usuarios.length,
    agricultores: datos.agricultores.length,
    sync_at: datos.sync_at,
  };
}

/**
 * Sincronización automática de envíos pendientes.
 * Se ejecuta en segundo plano cuando se detecta red WiFi interna.
 */
export async function sincronizarEnviosPendientes() {
  const conectado = await hayConectividadConServidor();
  if (!conectado) return { sincronizados: 0, pendientes: 0 };

  const enviosPendientes = await listarEnviosNosincronizados();
  if (enviosPendientes.length === 0) return { sincronizados: 0, pendientes: 0 };

  // Armar payload completo con fardos
  const enviosConFardos = await Promise.all(
    enviosPendientes.map(async (envio) => {
      const fardos = await listarFardosPorEnvio(envio.id);
      return {
        id_local: envio.id_local,
        usuario_id: envio.usuario_id,
        agricultor_id: envio.agricultor_id,
        fecha: envio.fecha,
        hora: envio.hora,
        gps_lat: envio.gps_lat,
        gps_lng: envio.gps_lng,
        fardos: fardos.map((f) => ({
          codigo_qr: f.codigo_qr,
          valido: f.valido === 1,
          motivo_invalido: f.motivo_invalido,
          timestamp_escaneo: f.timestamp_escaneo,
        })),
      };
    })
  );

  const respuesta = await sincronizarEnvios(enviosConFardos);

  // Marcar los que se sincronizaron correctamente
  let sincronizados = 0;
  for (const resultado of respuesta.resultados) {
    if (resultado.estado === 'creado' || resultado.estado === 'duplicado') {
      await marcarEnvioSincronizado(resultado.id_local, resultado.id_servidor);
      sincronizados++;
    }
  }

  return { sincronizados, pendientes: enviosPendientes.length };
}
