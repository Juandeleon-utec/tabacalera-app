const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Fardo = sequelize.define('Fardo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    envio_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    codigo_qr: {
      type: DataTypes.STRING(13),
      allowNull: false,
      validate: {
        len: [13, 13],
      },
    },
    valido: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    motivo_invalido: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    timestamp_escaneo: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    tableName: 'fardos',
    indexes: [
      // Garantiza que el código QR no se repita para el mismo agricultor en la misma temporada
      {
        name: 'idx_codigo_qr_unico',
        unique: false,
        fields: ['codigo_qr'],
      },
    ],
  });

  return Fardo;
};
