const express = require('express');
const router = express.Router();
const { ColorEtiqueta, Envio } = require('../../models');
const { normalizarHex } = require('../../models/ColorEtiqueta');

/**
 * Valida y normaliza el body de alta/modificación.
 * Devuelve { datos } o { error }.
 */
function validarColor(body) {
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  if (!nombre || !body.hex) {
    return { error: 'Nombre y color (hex) son obligatorios' };
  }
  if (nombre.length > 50) {
    return { error: 'El nombre no puede superar los 50 caracteres' };
  }
  const hex = normalizarHex(body.hex);
  if (!hex) {
    return { error: 'Color inválido: use el formato #RRGGBB' };
  }
  return { datos: { nombre, hex } };
}

/**
 * GET /api/admin/colores-etiqueta
 * Listado de colores de etiqueta
 */
router.get('/colores-etiqueta', async (req, res) => {
  try {
    const { pagina = 1, por_pagina = 50, activo } = req.query;

    const where = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }

    const offset = (parseInt(pagina) - 1) * parseInt(por_pagina);

    const { count, rows } = await ColorEtiqueta.findAndCountAll({
      where,
      order: [['nombre', 'ASC']],
      limit: parseInt(por_pagina),
      offset,
      attributes: ['id', 'nombre', 'hex', 'activo', 'created_at']
    });

    res.json({
      ok: true,
      total: count,
      pagina: parseInt(pagina),
      por_pagina: parseInt(por_pagina),
      colores: rows.map(c => c.toJSON())
    });
  } catch (error) {
    console.error('Error al obtener colores de etiqueta:', error);
    res.status(500).json({ error: 'Error al obtener colores de etiqueta' });
  }
});

/**
 * POST /api/admin/colores-etiqueta
 * Crear nuevo color de etiqueta
 */
router.post('/colores-etiqueta', async (req, res) => {
  try {
    const { datos, error } = validarColor(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { activo = true } = req.body;
    const nuevoColor = await ColorEtiqueta.create({ ...datos, activo });

    res.status(201).json({
      ok: true,
      color: nuevoColor.toJSON()
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' });
    }
    console.error('Error al crear color de etiqueta:', error);
    res.status(500).json({ error: 'Error al crear color de etiqueta' });
  }
});

/**
 * PUT /api/admin/colores-etiqueta/:id
 * Actualizar color de etiqueta.
 * Las compras ya registradas conservan su snapshot de nombre/hex.
 */
router.put('/colores-etiqueta/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { datos, error } = validarColor(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const colorActual = await ColorEtiqueta.findByPk(id);
    if (!colorActual) {
      return res.status(404).json({ error: 'Color de etiqueta no encontrado' });
    }

    const { activo } = req.body;
    const colorActualizado = await colorActual.update({
      ...datos,
      ...(activo !== undefined && { activo })
    });

    res.json({
      ok: true,
      color: colorActualizado.toJSON()
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Ya existe un color con ese nombre' });
    }
    console.error('Error al actualizar color de etiqueta:', error);
    res.status(500).json({ error: 'Error al actualizar color de etiqueta' });
  }
});

/**
 * PATCH /api/admin/colores-etiqueta/:id/desactivar
 * Desactivar color (alternativa al borrado cuando tiene compras asociadas)
 */
router.patch('/colores-etiqueta/:id/desactivar', async (req, res) => {
  try {
    const colorActual = await ColorEtiqueta.findByPk(req.params.id);
    if (!colorActual) {
      return res.status(404).json({ error: 'Color de etiqueta no encontrado' });
    }

    await colorActual.update({ activo: false });
    res.json({ ok: true, color: colorActual.toJSON() });
  } catch (error) {
    console.error('Error al desactivar color de etiqueta:', error);
    res.status(500).json({ error: 'Error al desactivar color de etiqueta' });
  }
});

/**
 * DELETE /api/admin/colores-etiqueta/:id
 * Eliminar color de etiqueta (con validación de referencias)
 */
router.delete('/colores-etiqueta/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el color no tenga compras asociadas
    const enviosAsociados = await Envio.count({
      where: { color_etiqueta_id: id }
    });

    if (enviosAsociados > 0) {
      return res.status(409).json({
        error: `El color tiene ${enviosAsociados} registros asociados y no puede eliminarse`,
        puede_desactivar: true
      });
    }

    const colorEliminado = await ColorEtiqueta.destroy({
      where: { id }
    });

    if (colorEliminado === 0) {
      return res.status(404).json({ error: 'Color de etiqueta no encontrado' });
    }

    res.json({ ok: true, mensaje: 'Color de etiqueta eliminado' });
  } catch (error) {
    console.error('Error al eliminar color de etiqueta:', error);
    res.status(500).json({ error: 'Error al eliminar color de etiqueta' });
  }
});

module.exports = router;
