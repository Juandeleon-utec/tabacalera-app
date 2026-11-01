const express = require('express');
const router = express.Router();
const { soloRedInterna } = require('../middleware/ipWhitelist');
const { generarToken } = require('../middleware/auth');
const { Usuario, Agricultor, Transportista, ColorEtiqueta, Terminal } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * GET /api/sync
 * Descarga usuarios activos, agricultores, transportistas y colores de etiqueta
 * para sincronización inicial.
 * Solo accesible desde red interna.
 */
/**
 * Registra (o reconoce) la terminal por su id de instalación y devuelve su
 * código de 3 dígitos. El código se deriva del id autoincremental.
 */
async function registrarTerminal(idInstalacion) {
  if (!idInstalacion || typeof idInstalacion !== 'string' || idInstalacion.length > 64) {
    return null;
  }
  const [terminal] = await Terminal.findOrCreate({ where: { id_instalacion: idInstalacion } });
  if (!terminal.codigo) {
    if (terminal.id > 999) throw new Error('Se agotaron los códigos de terminal (máx. 999)');
    terminal.codigo = String(terminal.id).padStart(3, '0');
  }
  terminal.ultima_sync_at = new Date();
  await terminal.save();
  return { codigo: terminal.codigo, activo: terminal.activo };
}

router.get('/', soloRedInterna, async (req, res) => {
  try {
    // APKs anteriores a 1.4.0 no envían id_instalacion: terminal = null
    const terminal = await registrarTerminal(req.query.id_instalacion);

    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'usuario', 'password_hash', 'activo', 'rol'],
    });

    const agricultores = await Agricultor.findAll({
      where: { activo: true },
      attributes: ['id', 'codigo_6dig', 'nombre', 'direccion', 'telefono', 'departamento'],
    });

    const transportistas = await Transportista.findAll({
      where: { activo: true },
      attributes: ['id', 'empresa', 'nombre_chofer', 'documento', 'matricula'],
    });

    const coloresEtiqueta = await ColorEtiqueta.findAll({
      where: { activo: true },
      attributes: ['id', 'nombre', 'hex'],
      order: [['nombre', 'ASC']],
    });

    // Generar un token JWT de sincronización para que la app pueda
    // enviar los envíos posteriormente
    const tokenSync = generarToken({ tipo: 'app_sync', timestamp: Date.now() });

    res.json({
      ok: true,
      sync_at: new Date().toISOString(),
      token_sync: tokenSync,
      usuarios: usuarios.map((u) => u.toJSON()),
      agricultores: agricultores.map((a) => a.toJSON()),
      transportistas: transportistas.map((t) => t.toJSON()),
      colores_etiqueta: coloresEtiqueta.map((c) => c.toJSON()),
      terminal,
    });
  } catch (error) {
    console.error('[SYNC GET]', error);
    res.status(500).json({ error: 'Error al obtener datos de sincronización' });
  }
});

module.exports = router;
