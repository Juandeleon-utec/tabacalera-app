const express = require('express');
const session = require('express-session');

// Configuración de sesión para admin
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  name: 'tabacalera_admin_sid',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Cambiar a true en producción con HTTPS
    maxAge: 15 * 60 * 1000, // 15 minutos en ms
    sameSite: 'strict'
  }
};

// Middleware de autenticación admin
function adminAuth(req, res, next) {
  if (req.session && req.session.admin) {
    // Actualizar el tiempo de expiración (sliding window)
    req.session.touch();
    return next();
  }
  
  // Redirigir al login si no hay sesión válida
  if (req.originalUrl.startsWith('/api/admin')) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  } else {
    return res.redirect('/admin/login');
  }
}

// Middleware para inicializar sesión
const initSession = session(sessionConfig);

module.exports = { adminAuth, initSession };