import * as SQLite from 'expo-sqlite';
import { CONFIG } from '../src/config/config';
import { generarIdLocal } from '../utils/uuid';

let db;

export function obtenerDB() {
  if (!db) {
    db = SQLite.openDatabaseSync('tabacalera.db');
  }
  return db;
}

export async function inicializarBaseDeDatos() {
  const baseDatos = obtenerDB();

  await baseDatos.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      usuario TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      activo INTEGER DEFAULT 1,
      rol TEXT DEFAULT 'comprador'
    );

    CREATE TABLE IF NOT EXISTS agricultores (
      id INTEGER PRIMARY KEY,
      codigo_6dig TEXT UNIQUE NOT NULL,
      nombre TEXT NOT NULL,
      direccion TEXT,
      telefono TEXT,
      departamento TEXT,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS transportistas (
      id INTEGER PRIMARY KEY,
      empresa TEXT NOT NULL,
      nombre_chofer TEXT NOT NULL,
      documento TEXT,
      matricula TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS colores_etiqueta (
      id INTEGER PRIMARY KEY,
      nombre TEXT NOT NULL,
      hex TEXT NOT NULL,
      activo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS envios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_local TEXT UNIQUE NOT NULL,
      usuario_id INTEGER NOT NULL,
      agricultor_id INTEGER NOT NULL,
      agricultor_codigo TEXT NOT NULL,
      agricultor_nombre TEXT NOT NULL,
      transportista_id INTEGER,
      documento_chofer_real TEXT,
      observaciones TEXT,
      color_etiqueta_id INTEGER,
      color_etiqueta_nombre TEXT,
      color_etiqueta_hex TEXT,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      gps_lat REAL,
      gps_lng REAL,
      estado TEXT DEFAULT 'abierto',
      sincronizado INTEGER DEFAULT 0,
      sincronizado_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (agricultor_id) REFERENCES agricultores(id),
      FOREIGN KEY (transportista_id) REFERENCES transportistas(id)
    );

    CREATE TABLE IF NOT EXISTS fardos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      envio_id INTEGER NOT NULL,
      codigo_qr TEXT NOT NULL,
      valido INTEGER DEFAULT 1,
      motivo_invalido TEXT,
      timestamp_escaneo TEXT NOT NULL,
      FOREIGN KEY (envio_id) REFERENCES envios(id)
    );

    CREATE TABLE IF NOT EXISTS sincronizacion (
      id INTEGER PRIMARY KEY DEFAULT 1,
      ultima_sync TEXT,
      token_sync TEXT,
      usuario_sync_id INTEGER
    );

    INSERT OR IGNORE INTO sincronizacion (id) VALUES (1);

    -- Identidad de esta instalación. codigo lo asigna el servidor (3 dígitos).
    CREATE TABLE IF NOT EXISTS terminal (
      id INTEGER PRIMARY KEY DEFAULT 1,
      id_instalacion TEXT,
      codigo TEXT
    );

    INSERT OR IGNORE INTO terminal (id) VALUES (1);
  `);

  // Migración: agregar columnas nuevas a instalaciones existentes
  const migraciones = [
    'ALTER TABLE envios ADD COLUMN transportista_id INTEGER',
    'ALTER TABLE envios ADD COLUMN documento_chofer_real TEXT',
    'ALTER TABLE envios ADD COLUMN observaciones TEXT',
    // v1.3.0 — color de etiqueta (id + snapshot de nombre/hex)
    'ALTER TABLE envios ADD COLUMN color_etiqueta_id INTEGER',
    'ALTER TABLE envios ADD COLUMN color_etiqueta_nombre TEXT',
    'ALTER TABLE envios ADD COLUMN color_etiqueta_hex TEXT',
    // v1.4.0 — remito único por terminal + tiempos de carga (ISO 8601 UTC)
    'ALTER TABLE envios ADD COLUMN nro_remito TEXT',
    'ALTER TABLE envios ADD COLUMN terminal_codigo TEXT',
    'ALTER TABLE envios ADD COLUMN hora_inicio_carga TEXT',
    'ALTER TABLE envios ADD COLUMN hora_fin_carga TEXT',
  ];
  for (const sql of migraciones) {
    try {
      await baseDatos.runAsync(sql);
    } catch {
      // La columna ya existe — ignorar
    }
  }

  // Garantía local de no repetir remitos (SQLite admite múltiples NULL)
  await baseDatos.runAsync(
    'CREATE UNIQUE INDEX IF NOT EXISTS idx_envios_nro_remito ON envios(nro_remito)'
  );

  // El id de instalación se genera una sola vez y nunca cambia mientras la app
  // esté instalada; el servidor lo usa para asignar el código de terminal.
  const terminal = await baseDatos.getFirstAsync('SELECT id_instalacion FROM terminal WHERE id = 1');
  if (!terminal?.id_instalacion) {
    const idInstalacion = `${generarIdLocal()}-${generarIdLocal()}`;
    await baseDatos.runAsync('UPDATE terminal SET id_instalacion = ? WHERE id = 1', [idInstalacion]);
  }
}

// ─── Terminal ─────────────────────────────────────────────────────────────────

export async function obtenerTerminal() {
  const baseDatos = obtenerDB();
  return await baseDatos.getFirstAsync('SELECT * FROM terminal WHERE id = 1');
}

export async function guardarCodigoTerminal(codigo) {
  const baseDatos = obtenerDB();
  await baseDatos.runAsync('UPDATE terminal SET codigo = ? WHERE id = 1', [codigo]);
}

// ─── Usuarios ────────────────────────────────────────────────────────────────

export async function guardarUsuarios(usuarios) {
  const baseDatos = obtenerDB();
  for (const u of usuarios) {
    await baseDatos.runAsync(
      `INSERT OR REPLACE INTO usuarios (id, nombre, usuario, password_hash, activo, rol)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [u.id, u.nombre, u.usuario, u.password_hash, u.activo ? 1 : 0, u.rol]
    );
  }
}

export async function buscarUsuarioPorNombre(nombreUsuario) {
  const baseDatos = obtenerDB();
  return await baseDatos.getFirstAsync(
    'SELECT * FROM usuarios WHERE usuario = ?',
    [nombreUsuario]
  );
}

// ─── Transportistas ───────────────────────────────────────────────────────────

export async function guardarTransportistas(transportistas) {
  const baseDatos = obtenerDB();
  for (const t of transportistas) {
    await baseDatos.runAsync(
      `INSERT OR REPLACE INTO transportistas (id, empresa, nombre_chofer, documento, matricula, activo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t.id, t.empresa, t.nombre_chofer, t.documento || null, t.matricula, 1]
    );
  }
}

export async function listarTransportistas() {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    'SELECT * FROM transportistas WHERE activo = 1 ORDER BY empresa ASC, nombre_chofer ASC'
  );
}

export async function obtenerTransportistaPorId(id) {
  const baseDatos = obtenerDB();
  return await baseDatos.getFirstAsync('SELECT * FROM transportistas WHERE id = ?', [id]);
}

// ─── Colores de etiqueta ──────────────────────────────────────────────────────

// El servidor solo envía los activos: se desactivan todos y se reactivan los
// recibidos, así un color dado de baja en el panel deja de aparecer sin borrarlo.
export async function guardarColoresEtiqueta(colores) {
  const baseDatos = obtenerDB();
  await baseDatos.runAsync('UPDATE colores_etiqueta SET activo = 0');
  for (const c of colores) {
    await baseDatos.runAsync(
      `INSERT OR REPLACE INTO colores_etiqueta (id, nombre, hex, activo)
       VALUES (?, ?, ?, ?)`,
      [c.id, c.nombre, c.hex, 1]
    );
  }
}

export async function listarColoresEtiqueta() {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    'SELECT * FROM colores_etiqueta WHERE activo = 1 ORDER BY nombre ASC'
  );
}

// ─── Agricultores ─────────────────────────────────────────────────────────────

export async function guardarAgricultores(agricultores) {
  const baseDatos = obtenerDB();
  for (const a of agricultores) {
    await baseDatos.runAsync(
      `INSERT OR REPLACE INTO agricultores (id, codigo_6dig, nombre, direccion, telefono, departamento, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [a.id, a.codigo_6dig, a.nombre, a.direccion || null, a.telefono || null, a.departamento || null, 1]
    );
  }
}

export async function listarAgricultores() {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    'SELECT * FROM agricultores WHERE activo = 1 ORDER BY nombre ASC'
  );
}

export async function buscarAgricultores(termino) {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    `SELECT * FROM agricultores WHERE activo = 1 AND (nombre LIKE ? OR codigo_6dig LIKE ?)
     ORDER BY nombre ASC LIMIT 20`,
    [`%${termino}%`, `%${termino}%`]
  );
}

// ─── Envíos ───────────────────────────────────────────────────────────────────

export async function crearEnvio(datos) {
  const baseDatos = obtenerDB();
  const ahora = new Date().toISOString();
  const resultado = await baseDatos.runAsync(
    `INSERT INTO envios (id_local, usuario_id, agricultor_id, agricultor_codigo, agricultor_nombre,
      transportista_id, documento_chofer_real, observaciones,
      color_etiqueta_id, color_etiqueta_nombre, color_etiqueta_hex,
      fecha, hora, gps_lat, gps_lng, estado, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'abierto', ?)`,
    [
      datos.id_local,
      datos.usuario_id,
      datos.agricultor_id,
      datos.agricultor_codigo,
      datos.agricultor_nombre,
      datos.transportista_id || null,
      datos.documento_chofer_real || null,
      datos.observaciones || null,
      datos.color_etiqueta_id || null,
      datos.color_etiqueta_nombre || null,
      datos.color_etiqueta_hex || null,
      datos.fecha,
      datos.hora,
      datos.gps_lat || null,
      datos.gps_lng || null,
      ahora,
    ]
  );
  return resultado.lastInsertRowId;
}

export class TerminalNoRegistradaError extends Error {
  constructor() {
    super('Esta terminal no tiene código asignado o fue dada de baja. Conéctese a la red interna y sincronice con el servidor antes de cerrar el envío.');
    this.name = 'TerminalNoRegistradaError';
  }
}

/**
 * Cierra el envío y le asigna el N° de remito: TER<ccc>RMT<zafra><nnnnn>.
 * - inicio de carga = primer fardo escaneado; fin de carga = momento del cierre.
 * - el correlativo es por terminal y por zafra (reinicia al cambiar TEMPORADA_ACTUAL).
 * Idempotente: si ya estaba cerrado no reasigna número.
 */
export async function cerrarEnvio(envioId) {
  const baseDatos = obtenerDB();
  const envio = await baseDatos.getFirstAsync('SELECT estado FROM envios WHERE id = ?', [envioId]);
  if (envio?.estado === 'cerrado') return;

  const terminal = await obtenerTerminal();
  if (!terminal?.codigo) throw new TerminalNoRegistradaError();

  const prefijo = `TER${terminal.codigo}RMT${CONFIG.TEMPORADA_ACTUAL}`;
  const ultimo = await baseDatos.getFirstAsync(
    'SELECT MAX(CAST(substr(nro_remito, ?) AS INTEGER)) AS n FROM envios WHERE nro_remito LIKE ?',
    [prefijo.length + 1, `${prefijo}%`]
  );
  const siguiente = (ultimo?.n || 0) + 1;
  if (siguiente > 99999) throw new Error('Se agotó la numeración de remitos de esta zafra');
  const nroRemito = prefijo + String(siguiente).padStart(5, '0');

  const primerFardo = await baseDatos.getFirstAsync(
    'SELECT MIN(timestamp_escaneo) AS t FROM fardos WHERE envio_id = ?',
    [envioId]
  );
  const finCarga = new Date().toISOString();

  await baseDatos.runAsync(
    `UPDATE envios SET estado = 'cerrado', nro_remito = ?, terminal_codigo = ?,
       hora_inicio_carga = ?, hora_fin_carga = ?
     WHERE id = ?`,
    [nroRemito, terminal.codigo, primerFardo?.t || finCarga, finCarga, envioId]
  );
}

export async function obtenerEnvioPorId(envioId) {
  const baseDatos = obtenerDB();
  return await baseDatos.getFirstAsync('SELECT * FROM envios WHERE id = ?', [envioId]);
}

export async function listarEnviosNosincronizados() {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    "SELECT * FROM envios WHERE estado = 'cerrado' AND sincronizado = 0"
  );
}

export async function marcarEnvioSincronizado(idLocal, idServidor) {
  const baseDatos = obtenerDB();
  await baseDatos.runAsync(
    "UPDATE envios SET sincronizado = 1, sincronizado_at = ? WHERE id_local = ?",
    [new Date().toISOString(), idLocal]
  );
}

// ─── Fardos ───────────────────────────────────────────────────────────────────

export async function insertarFardo(datos) {
  const baseDatos = obtenerDB();
  const resultado = await baseDatos.runAsync(
    `INSERT INTO fardos (envio_id, codigo_qr, valido, motivo_invalido, timestamp_escaneo)
     VALUES (?, ?, ?, ?, ?)`,
    [datos.envio_id, datos.codigo_qr, datos.valido ? 1 : 0, datos.motivo_invalido || null, new Date().toISOString()]
  );
  return resultado.lastInsertRowId;
}

export async function listarFardosPorEnvio(envioId) {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    'SELECT * FROM fardos WHERE envio_id = ? ORDER BY id ASC',
    [envioId]
  );
}

export async function codigoQrYaUsado(codigoQr, agricultorCodigo, temporada) {
  const baseDatos = obtenerDB();
  // Busca si el código QR ya fue escaneado en envíos cerrados del mismo agricultor
  // en la misma temporada (los primeros 2 dígitos del sufijo de 7 = año)
  const resultado = await baseDatos.getFirstAsync(
    `SELECT f.id FROM fardos f
     INNER JOIN envios e ON f.envio_id = e.id
     WHERE f.codigo_qr = ?
       AND e.agricultor_codigo = ?
       AND e.estado = 'cerrado'`,
    [codigoQr, agricultorCodigo]
  );
  return resultado !== null && resultado !== undefined;
}

// ─── Sincronización ───────────────────────────────────────────────────────────

export async function guardarInfoSync(tokenSync) {
  const baseDatos = obtenerDB();
  await baseDatos.runAsync(
    'UPDATE sincronizacion SET ultima_sync = ?, token_sync = ? WHERE id = 1',
    [new Date().toISOString(), tokenSync]
  );
}

export async function obtenerInfoSync() {
  const baseDatos = obtenerDB();
  return await baseDatos.getFirstAsync('SELECT * FROM sincronizacion WHERE id = 1');
}

// ─── Historial ────────────────────────────────────────────────────────────────

export async function listarEnviosResumenPorUsuarioYFecha(usuarioId, fecha) {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    `SELECT e.*,
       (SELECT COUNT(*) FROM fardos f WHERE f.envio_id = e.id AND f.valido = 1) AS total_validos,
       (SELECT COUNT(*) FROM fardos f WHERE f.envio_id = e.id) AS total_fardos,
       t.empresa AS transportista_empresa,
       t.nombre_chofer AS transportista_chofer,
       t.matricula AS transportista_matricula
     FROM envios e
     LEFT JOIN transportistas t ON e.transportista_id = t.id
     WHERE e.usuario_id = ? AND e.fecha = ?
     ORDER BY e.hora DESC`,
    [usuarioId, fecha]
  );
}

export async function listarTodosEnviosResumenPorUsuario(usuarioId) {
  const baseDatos = obtenerDB();
  return await baseDatos.getAllAsync(
    `SELECT e.*,
       (SELECT COUNT(*) FROM fardos f WHERE f.envio_id = e.id AND f.valido = 1) AS total_validos,
       (SELECT COUNT(*) FROM fardos f WHERE f.envio_id = e.id) AS total_fardos,
       t.empresa AS transportista_empresa,
       t.nombre_chofer AS transportista_chofer,
       t.matricula AS transportista_matricula
     FROM envios e
     LEFT JOIN transportistas t ON e.transportista_id = t.id
     WHERE e.usuario_id = ?
     ORDER BY e.fecha DESC, e.hora DESC`,
    [usuarioId]
  );
}

export async function reemplazarTransportistas(transportistas) {
  const baseDatos = obtenerDB();
  await baseDatos.runAsync('DELETE FROM transportistas');
  for (const t of transportistas) {
    await baseDatos.runAsync(
      `INSERT INTO transportistas (id, empresa, nombre_chofer, documento, matricula, activo)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [t.id, t.empresa, t.nombre_chofer, t.documento || null, t.matricula, 1]
    );
  }
}
