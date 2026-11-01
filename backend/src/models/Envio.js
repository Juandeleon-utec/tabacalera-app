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
    transportista_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    documento_chofer_real: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    // Color de etiqueta: se guarda id + snapshot de nombre/hex para que
    // ediciones posteriores del catálogo no alteren históricos ni PDFs
    color_etiqueta_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    color_etiqueta_nombre: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    color_etiqueta_hex: {
      type: DataTypes.CHAR(7),
      allowNull: true,
    },
    // v1.4.0 — remito único TER<ccc>RMT<zafra><nnnnn> y tiempos de carga
    nro_remito: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: 'envios_nro_remito_unique',
    },
    terminal_codigo: {
      type: DataTypes.CHAR(3),
      allowNull: true,
    },
    hora_inicio_carga: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hora_fin_carga: {
      type: DataTypes.DATE,
      allowNull: true,
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
