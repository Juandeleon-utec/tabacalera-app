const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ColorEtiqueta = sequelize.define('ColorEtiqueta', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    hex: {
      type: DataTypes.CHAR(7),
      allowNull: false,
      validate: {
        is: /^#[0-9A-Fa-f]{6}$/,
      },
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'colores_etiqueta',
  });

  return ColorEtiqueta;
};
