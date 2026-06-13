const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Agricultor = sequelize.define('Agricultor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo_6dig: {
      type: DataTypes.STRING(6),
      allowNull: false,
      unique: true,
      validate: {
        len: [6, 6],
        isNumeric: true,
      },
    },
    nombre: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    direccion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    telefono: {
      type: DataTypes.STRING(30),
      allowNull: true,
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'agricultores',
  });

  return Agricultor;
};
