const express = require('express');
const router = express.Router();
const { Transportista, Envio } = require('../../models');

/**
 * GET /api/admin/transporters
 * Listado de transportistas
 */
router.get('/transporters', async (req, res) => {
  try {
    const { pagina = 1, por_pagina = 20, activo } = req.query;
    
    const where = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    const offset = (parseInt(pagina) - 1) * parseInt(por_pagina);
    
    const { count, rows } = await Transportista.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      limit: parseInt(por_pagina),
      offset,
      attributes: ['id', 'empresa', 'nombre_chofer', 'documento', 'matricula', 'activo', 'created_at']
    });
    
    res.json({
      ok: true,
      total: count,
      pagina: parseInt(pagina),
      por_pagina: parseInt(por_pagina),
      transportistas: rows.map(t => t.toJSON())
    });
  } catch (error) {
    console.error('Error al obtener transportistas:', error);
    res.status(500).json({ error: 'Error al obtener transportistas' });
  }
});

/**
 * POST /api/admin/transporters
 * Crear nuevo transportista
 */
router.post('/transporters', async (req, res) => {
  try {
    const { empresa, nombre_chofer, documento, matricula, activo = true } = req.body;
    
    // Validaciones
    if (!empresa || !nombre_chofer || !matricula) {
      return res.status(400).json({ error: 'Empresa, nombre de chofer y matrícula son obligatorios' });
    }
    
    const nuevoTransportista = await Transportista.create({
      empresa,
      nombre_chofer,
      documento,
      matricula,
      activo
    });
    
    res.status(201).json({ 
      ok: true, 
      transportista: nuevoTransportista.toJSON() 
    });
  } catch (error) {
    console.error('Error al crear transportista:', error);
    res.status(500).json({ error: 'Error al crear transportista' });
  }
});

/**
 * PUT /api/admin/transporters/:id
 * Actualizar transportista
 */
router.put('/transporters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { empresa, nombre_chofer, documento, matricula, activo } = req.body;
    
    // Validaciones
    if (!empresa || !nombre_chofer || !matricula) {
      return res.status(400).json({ error: 'Empresa, nombre de chofer y matrícula son obligatorios' });
    }
    
    const transportistaActual = await Transportista.findByPk(id);
    if (!transportistaActual) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }
    
    const transportistaActualizado = await transportistaActual.update({
      empresa,
      nombre_chofer,
      documento,
      matricula,
      activo
    });
    
    res.json({ 
      ok: true, 
      transportista: transportistaActualizado.toJSON() 
    });
  } catch (error) {
    console.error('Error al actualizar transportista:', error);
    res.status(500).json({ error: 'Error al actualizar transportista' });
  }
});

/**
 * GET /api/admin/transporters/:id
 * Obtener un transportista por ID
 */
router.get('/transporters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const transportista = await Transportista.findByPk(id, {
      attributes: ['id', 'empresa', 'nombre_chofer', 'documento', 'matricula', 'activo', 'created_at']
    });
    
    if (!transportista) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }
    
    res.json({ 
      ok: true, 
      transportista: transportista.toJSON() 
    });
  } catch (error) {
    console.error('Error al obtener transportista:', error);
    res.status(500).json({ error: 'Error al obtener transportista' });
  }
});

/**
 * DELETE /api/admin/transporters/:id
 * Eliminar transportista (con validación de referencias)
 */
router.delete('/transporters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el transportista no tenga registros asociados
    const enviosAsociados = await Envio.count({ 
      where: { transportista_id: id } 
    });
    
    if (enviosAsociados > 0) {
      return res.status(409).json({ 
        error: `El transportista tiene ${enviosAsociados} registros asociados y no puede eliminarse` 
      });
    }
    
    const transportistaEliminado = await Transportista.destroy({ 
      where: { id } 
    });
    
    if (transportistaEliminado === 0) {
      return res.status(404).json({ error: 'Transportista no encontrado' });
    }
    
    res.json({ ok: true, mensaje: 'Transportista eliminado' });
  } catch (error) {
    console.error('Error al eliminar transportista:', error);
    res.status(500).json({ error: 'Error al eliminar transportista' });
  }
});

module.exports = router;