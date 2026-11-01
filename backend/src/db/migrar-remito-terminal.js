require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { DataTypes } = require('sequelize');
const { sequelize, Terminal } = require('../models');

/**
 * Migración puntual (app v1.4.0): N° de remito por terminal y tiempos de carga.
 *
 * - Crea la tabla terminales si no existe (sin alter).
 * - Agrega a envios nro_remito / terminal_codigo / hora_inicio_carga / hora_fin_carga.
 * - Crea índice único sobre envios.nro_remito (MySQL admite múltiples NULL).
 *
 * Idempotente. No usa sync({ alter }) para no tocar el resto del esquema.
 */
const COLUMNAS_ENVIOS = {
  nro_remito: { type: DataTypes.STRING(20), allowNull: true },
  terminal_codigo: { type: DataTypes.CHAR(3), allowNull: true },
  hora_inicio_carga: { type: DataTypes.DATE, allowNull: true },
  hora_fin_carga: { type: DataTypes.DATE, allowNull: true },
};

const NOMBRE_INDICE = 'envios_nro_remito_unique';

async function migrar() {
  const qi = sequelize.getQueryInterface();
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL OK');

    await Terminal.sync();
    console.log('Tabla terminales: OK');

    const columnasActuales = await qi.describeTable('envios');
    for (const [nombre, definicion] of Object.entries(COLUMNAS_ENVIOS)) {
      if (columnasActuales[nombre]) {
        console.log(`Columna envios.${nombre}: ya existía`);
        continue;
      }
      await qi.addColumn('envios', nombre, definicion);
      console.log(`Columna envios.${nombre}: creada`);
    }

    const indices = await qi.showIndex('envios');
    if (indices.some((i) => i.name === NOMBRE_INDICE)) {
      console.log(`Índice ${NOMBRE_INDICE}: ya existía`);
    } else {
      await qi.addIndex('envios', ['nro_remito'], { unique: true, name: NOMBRE_INDICE });
      console.log(`Índice ${NOMBRE_INDICE}: creado`);
    }

    console.log('Migración remito/terminal completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración remito/terminal:', error);
    process.exit(1);
  }
}

migrar();
