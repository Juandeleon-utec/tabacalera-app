const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Envio = sequelize.define('Envio', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    // ID local generado en la app (UUID) para identificar duplicados en sync
    id_local: {
      type: DataTypes.STRING(36),
      allowNull: true,
      unique: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    agricultor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    hora: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    gps_lat: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    gps_lng: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    total_fardos: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    sincronizado_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'envios',
  });

  return Envio;
};
