const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

/**
 * POST /api/admin/login
 * Autenticación de administrador
 */
router.post('/login', async (req, res) => {
  try {
    const { usuario, contrasena } = req.body;

    const adminUsuario = process.env.ADMIN_USER || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH no está configurado');
      return res.status(500).json({ error: 'Configuración de autenticación incompleta' });
    }

    if (usuario !== adminUsuario) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const passwordValida = await bcrypt.compare(
      contrasena,
      adminPasswordHash
    );

    if (!passwordValida) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    req.session.regenerate((err) => {
      if (err) {
        console.error('Error regenerando sesión:', err);
        return res.status(500).json({ error: 'Error de autenticación' });
      }

      req.session.admin = {
        id: 0,
        nombre: 'Administrador',
        usuario: adminUsuario,
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
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
      return res.status(500).json({ error: 'Error al cerrar sesión' });
    }

    res.clearCookie('tabacalera_admin_sid');
    res.json({ ok: true, mensaje: 'Sesión cerrada' });
  });
});

module.exports = router;
