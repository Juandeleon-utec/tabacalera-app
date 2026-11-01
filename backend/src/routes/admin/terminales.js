const express = require('express');
const router = express.Router();
const { Terminal, sequelize } = require('../../models');

/**
 * Las terminales se dan de alta solas en su primera sincronización
 * (GET /api/sync con id_instalacion). Desde el panel solo se edita el alias
 * y el estado. No hay alta manual (requiere el id de instalación de la app)
 * ni borrado: el código de terminal es parte del N° de remito y no debe
 * reutilizarse nunca.
 */

/**
 * GET /api/admin/terminales
 * Listado con fecha de alta, última sincronización y resumen de remitos.
 */
router.get('/terminales', async (req, res) => {
  try {
    const terminales = await Terminal.findAll({
      order: [['codigo', 'ASC']],
      attributes: ['id', 'codigo', 'alias', 'activo', 'created_at', 'ultima_sync_at'],
    });

    const [resumen] = await sequelize.query(
      `SELECT terminal_codigo,
              COUNT(*) AS total_remitos,
              MAX(nro_remito) AS ultimo_remito,
              MAX(hora_fin_carga) AS ultimo_remito_at
         FROM envios
        WHERE terminal_codigo IS NOT NULL
        GROUP BY terminal_codigo`
    );
    const porCodigo = Object.fromEntries(resumen.map((r) => [r.terminal_codigo, r]));

    res.json({
      ok: true,
      terminales: terminales.map((t) => {
        const r = porCodigo[t.codigo] || {};
        return {
          ...t.toJSON(),
          total_remitos: Number(r.total_remitos || 0),
          ultimo_remito: r.ultimo_remito || null,
          ultimo_remito_at: r.ultimo_remito_at || null,
        };
      }),
    });
  } catch (error) {
    console.error('Error al obtener terminales:', error);
    res.status(500).json({ error: 'Error al obtener terminales' });
  }
});

/**
 * PUT /api/admin/terminales/:id
 * Actualiza alias y/o estado. Una terminal inactiva deja de poder emitir
 * remitos nuevos a partir de su próxima sincronización.
 */
router.put('/terminales/:id', async (req, res) => {
  try {
    const terminal = await Terminal.findByPk(req.params.id);
    if (!terminal) {
      return res.status(404).json({ error: 'Terminal no encontrada' });
    }

    const cambios = {};
    if (req.body.alias !== undefined) {
      const alias = typeof req.body.alias === 'string' ? req.body.alias.trim() : '';
      if (alias.length > 50) {
        return res.status(400).json({ error: 'El alias no puede superar los 50 caracteres' });
      }
      cambios.alias = alias || null;
    }
    if (req.body.activo !== undefined) {
      cambios.activo = !!req.body.activo;
    }

    await terminal.update(cambios);
    res.json({ ok: true, terminal: terminal.toJSON() });
  } catch (error) {
    console.error('Error al actualizar terminal:', error);
    res.status(500).json({ error: 'Error al actualizar terminal' });
  }
});

module.exports = router;
