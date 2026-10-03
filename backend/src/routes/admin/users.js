const express = require('express');
const router = express.Router();
const { Usuario, Envio } = require('../../models');
const bcrypt = require('bcryptjs');

/**
 * GET /api/admin/users
 * Listado de usuarios
 */
router.get('/users', async (req, res) => {
  try {
    const { pagina = 1, por_pagina = 20, activo } = req.query;
    
    const where = {};
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    const offset = (parseInt(pagina) - 1) * parseInt(por_pagina);
    
    const { count, rows } = await Usuario.findAndCountAll({
      where,
      order: [['id', 'ASC']],
      limit: parseInt(por_pagina),
      offset,
      attributes: ['id', 'nombre', 'usuario', 'activo', 'rol', 'created_at']
    });
    
    res.json({
      ok: true,
      total: count,
      pagina: parseInt(pagina),
      por_pagina: parseInt(por_pagina),
      usuarios: rows.map(u => u.toJSON())
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

/**
 * POST /api/admin/users
 * Crear nuevo usuario
 */
router.post('/users', async (req, res) => {
  try {
    const { nombre, usuario, password, rol, activo = true } = req.body;
    
    // Validaciones
    if (!nombre || !usuario) {
      return res.status(400).json({ error: 'Nombre y usuario son obligatorios' });
    }
    
    // Verificar unicidad de usuario
    const usuarioExistente = await Usuario.findOne({ 
      where: { usuario } 
    });
    
    if (usuarioExistente) {
      return res.status(409).json({ error: 'Nombre de usuario ya existe' });
    }
    
    // Hashear contraseña si se proporciona
    let password_hash = '';
    if (password) {
      password_hash = await bcrypt.hash(password, 10);
    }
    
    const nuevoUsuario = await Usuario.create({
      nombre,
      usuario,
      password_hash,
      rol: rol || 'comprador',
      activo
    });
    
    res.status(201).json({ 
      ok: true, 
      usuario: nuevoUsuario.toJSON() 
    });
  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Actualizar usuario
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, usuario, password, rol, activo } = req.body;
    
    // Validaciones
    if (!nombre || !usuario) {
      return res.status(400).json({ error: 'Nombre y usuario son obligatorios' });
    }
    
    const usuarioActual = await Usuario.findByPk(id);
    if (!usuarioActual) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar unicidad de usuario (excluyendo al actual)
    if (usuario !== usuarioActual.usuario) {
      const usuarioExistente = await Usuario.findOne({ 
        where: { usuario } 
      });
      
      if (usuarioExistente) {
        return res.status(409).json({ error: 'Nombre de usuario ya existe' });
      }
    }
    
    // Hashear contraseña si se proporciona (y no está vacía)
    let password_hash = usuarioActual.password_hash;
    if (password !== undefined) {
      if (password !== '') {
        password_hash = await bcrypt.hash(password, 10);
      }
    }
    
    const usuarioActualizado = await usuarioActual.update({
      nombre,
      usuario,
      password_hash,
      rol: rol || 'comprador',
      activo
    });
    
    res.json({ 
      ok: true, 
      usuario: usuarioActualizado.toJSON() 
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

/**
 * GET /api/admin/users/:id
 * Obtener un usuario por ID
 */
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const usuario = await Usuario.findByPk(id, {
      attributes: ['id', 'nombre', 'usuario', 'rol', 'activo', 'created_at']
    });
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ 
      ok: true, 
      usuario: usuario.toJSON() 
    });
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Eliminar usuario (con validación de referencias)
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el usuario no tenga registros asociados
    const enviosAsociados = await Envio.count({ 
      where: { usuario_id: id } 
    });
    
    if (enviosAsociados > 0) {
      return res.status(409).json({ 
        error: `El usuario tiene ${enviosAsociados} registros asociados y no puede eliminarse` 
      });
    }
    
    const usuarioEliminado = await Usuario.destroy({ 
      where: { id } 
    });
    
    if (usuarioEliminado === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ ok: true, mensaje: 'Usuario eliminado' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

module.exports = router;