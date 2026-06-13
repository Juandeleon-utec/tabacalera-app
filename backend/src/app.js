require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const routeSync = require('./routes/sync');
const routeEnvios = require('./routes/envios');

const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rutas
app.use('/api/sync', routeSync);
app.use('/api/envios', routeEnvios);

// Salud del servidor
app.get('/api/health', (req, res) => {
  res.json({ estado: 'ok', timestamp: new Date().toISOString() });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL establecida correctamente.');

    // Sincronizar modelos con la BD (sin forzar recreación)
    await sequelize.sync({ alter: false });
    console.log('Modelos sincronizados con la base de datos.');

    app.listen(PUERTO, () => {
      console.log(`Servidor tabacalera corriendo en puerto ${PUERTO}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciar();
