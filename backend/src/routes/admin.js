const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const authRoutes = require('./admin/auth');
const userRoutes = require('./admin/users');
const transporterRoutes = require('./admin/transporters');

// Rutas protegidas por autenticación admin
router.use('/api/admin', adminAuth);

// Rutas de autenticación
router.use(authRoutes);

// Rutas de gestión de usuarios y transportistas
router.use(userRoutes);
router.use(transporterRoutes);

// Ruta de dashboard (ejemplo)
router.get('/api/admin/dashboard', adminAuth, (req, res) => {
  res.json({ 
    ok: true, 
    mensaje: 'Bienvenido al panel de administración',
    sesion: req.session.admin
  });
});

module.exports = router;