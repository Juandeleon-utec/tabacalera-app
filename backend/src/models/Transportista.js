const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transportista = sequelize.define('Transportista', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    empresa: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    nombre_chofer: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    documento: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    matricula: {
      type: DataTypes.STRING(20),
      allowNull: false,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'transportistas',
  });

  return Transportista;
};
