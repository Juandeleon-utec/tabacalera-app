const { DataTypes } = require('sequelize');

/**
 * Terminal (instalación de la app). El código de 3 dígitos se deriva del id
 * y forma parte del N° de remito: TER<codigo>RMT<zafra><correlativo>.
 */
module.exports = (sequelize) => {
  const Terminal = sequelize.define('Terminal', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // Identificador generado por la app en su primera ejecución
    id_instalacion: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    codigo: {
      type: DataTypes.CHAR(3),
      allowNull: true,
      unique: true,
    },
    alias: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ultima_sync_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'terminales',
  });

  return Terminal;
};
