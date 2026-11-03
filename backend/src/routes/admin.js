const express = require('express');
const router = express.Router();

const { adminAuth } = require('../middleware/adminAuth');
const authRoutes = require('./admin/auth');
const userRoutes = require('./admin/users');
const transporterRoutes = require('./admin/transporters');
const coloresEtiquetaRoutes = require('./admin/colores-etiqueta');
const terminalesRoutes = require('./admin/terminales');
const recepcionesRoutes = require('./admin/recepciones');

// Login/logout
// Debe ir ANTES del middleware de protección para permitir el login.
router.use('/api/admin', authRoutes);

// Todo lo que sigue bajo /api/admin requiere sesión de administrador.
router.use('/api/admin', adminAuth);

// Gestión
router.use('/api/admin', userRoutes);
router.use('/api/admin', transporterRoutes);
router.use('/api/admin', coloresEtiquetaRoutes);
router.use('/api/admin', terminalesRoutes);
router.use('/api/admin', recepcionesRoutes);

// Dashboard
router.get('/api/admin/dashboard', (req, res) => {
  res.json({
    ok: true,
    mensaje: 'Bienvenido al panel de administración',
    sesion: req.session.admin
  });
});

module.exports = router;
