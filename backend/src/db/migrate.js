require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { sequelize } = require('../models');

async function migrar() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL OK');

    // force: false => no borra datos existentes
    // alter: true  => ajusta columnas si cambiaron
    await sequelize.sync({ force: false, alter: true });
    console.log('Tablas creadas/actualizadas correctamente.');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración:', error);
    process.exit(1);
  }
}

migrar();
