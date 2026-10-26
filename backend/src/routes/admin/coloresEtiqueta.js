const express = require('express');
const router = express.Router();
const colorEtiquetaController = require('../../controllers/colorEtiquetaController');

/**
 * GET /api/admin/colores-etiqueta
 * Listado de colores de etiqueta
 */
router.get('/colores-etiqueta', colorEtiquetaController.getAll);

/**
 * POST /api/admin/colores-etiqueta
 * Crear nuevo color de etiqueta
 */
router.post('/colores-etiqueta', colorEtiquetaController.create);

/**
 * PUT /api/admin/colores-etiqueta/:id
 * Actualizar color de etiqueta
 */
router.put('/colores-etiqueta/:id', colorEtiquetaController.update);

/**
 * GET /api/admin/colores-etiqueta/:id
 * Obtener un color por ID
 */
router.get('/colores-etiqueta/:id', colorEtiquetaController.getById);

/**
 * DELETE /api/admin/colores-etiqueta/:id
 * Eliminar color de etiqueta (con validación de referencias)
 */
router.delete('/colores-etiqueta/:id', colorEtiquetaController.delete);

/**
 * PATCH /api/admin/colores-etiqueta/:id/toggle
 * Cambiar estado de activo/inactivo
 */
router.patch('/colores-etiqueta/:id/toggle', colorEtiquetaController.toggleStatus);

module.exports = router;
