require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { DataTypes } = require('sequelize');
const { sequelize, ColorEtiqueta } = require('../models');

/**
 * Migración puntual (app v1.3.0): color de etiqueta en la compra.
 *
 * - Crea la tabla colores_etiqueta si no existe (sin alter).
 * - Agrega a envios las columnas color_etiqueta_id / _nombre / _hex si faltan.
 * - Agrega la FK envios.color_etiqueta_id → colores_etiqueta.id si falta.
 *
 * Idempotente: puede correrse más de una vez sin efectos.
 * No usa sync({ alter }) para no tocar el resto del esquema en producción.
 */
const COLUMNAS_ENVIOS = {
  color_etiqueta_id: { type: DataTypes.INTEGER, allowNull: true },
  color_etiqueta_nombre: { type: DataTypes.STRING(50), allowNull: true },
  color_etiqueta_hex: { type: DataTypes.CHAR(7), allowNull: true },
};

const NOMBRE_FK = 'envios_color_etiqueta_id_fk';

async function migrar() {
  const qi = sequelize.getQueryInterface();
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL OK');

    await ColorEtiqueta.sync();
    console.log('Tabla colores_etiqueta: OK');

    const columnasActuales = await qi.describeTable('envios');
    for (const [nombre, definicion] of Object.entries(COLUMNAS_ENVIOS)) {
      if (columnasActuales[nombre]) {
        console.log(`Columna envios.${nombre}: ya existía`);
        continue;
      }
      await qi.addColumn('envios', nombre, definicion);
      console.log(`Columna envios.${nombre}: creada`);
    }

    const fks = await qi.getForeignKeyReferencesForTable('envios');
    const tieneFk = fks.some((fk) => fk.columnName === 'color_etiqueta_id');
    if (tieneFk) {
      console.log('FK envios.color_etiqueta_id: ya existía');
    } else {
      await qi.addConstraint('envios', {
        fields: ['color_etiqueta_id'],
        type: 'foreign key',
        name: NOMBRE_FK,
        references: { table: 'colores_etiqueta', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      console.log('FK envios.color_etiqueta_id: creada');
    }

    console.log('Migración colores de etiqueta completada.');
    process.exit(0);
  } catch (error) {
    console.error('Error en migración colores de etiqueta:', error);
    process.exit(1);
  }
}

migrar();
