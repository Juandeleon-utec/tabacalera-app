const express = require('express');
const router = express.Router();
const { soloRedInterna } = require('../middleware/ipWhitelist');
const { generarToken } = require('../middleware/auth');
const { Usuario, Agricultor } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * GET /api/sync
 * Descarga usuarios activos y agricultores para sincronización inicial.
 * Solo accesible desde red interna.
 */
router.get('/', soloRedInterna, async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: ['id', 'nombre', 'usuario', 'password_hash', 'activo', 'rol'],
    });

    const agricultores = await Agricultor.findAll({
      where: { activo: true },
      attributes: ['id', 'codigo_6dig', 'nombre', 'direccion', 'telefono', 'departamento'],
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
    });
  } catch (error) {
    console.error('[SYNC GET]', error);
    res.status(500).json({ error: 'Error al obtener datos de sincronización' });
  }
});

module.exports = router;
