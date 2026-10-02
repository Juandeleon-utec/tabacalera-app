const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { CONFIG } = require('../../../app/src/config/config');

/**
 * POST /api/admin/login
 * Autenticación de administrador
 */
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;
    
    // Validar credenciales
    if (usuario !== CONFIG.SUPERADMIN_USUARIO) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    // Verificar contraseña con bcrypt
    const passwordValida = await bcrypt.compare(contrasena, CONFIG.SUPERADMIN_PASSWORD);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    
    // Iniciar sesión admin
    req.session.admin = {
      id: 0,
      nombre: 'Administrador',
      usuario: CONFIG.SUPERADMIN_USUARIO,
      rol: 'admin',
      login_at: new Date().toISOString()
    };
    
    // Regenerar la sesión para prevenir fijación de sesiones
    req.session.regenerate((err) => {
      if (err) {
        console.error('Error regenerando sesión:', err);
        return res.status(500).json({ error: 'Error de autenticación' });
      }
      
      // Volver a establecer los datos de sesión
      req.session.admin = {
        id: 0,
        nombre: 'Administrador',
        usuario: CONFIG.SUPERADMIN_USUARIO,
        rol: 'admin',
        login_at: new Date().toISOString()
      };
      
      res.json({ 
        ok: true, 
        sesion: req.session.admin 
      });
    });
    
  } catch (error) {
    console.error('Error en login admin:', error);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

/**
 * POST /api/admin/logout
 * Cierre de sesión de administrador
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }
    res.json({ ok: true, mensaje: 'Sesión cerrada' });
  });
});

module.exports = router;