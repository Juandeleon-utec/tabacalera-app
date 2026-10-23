const { DataTypes } = require('sequelize');

const REGEX_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Normaliza un color hex: agrega '#' si falta y pasa a mayúsculas.
 * Devuelve null si el valor no es un hex válido de 6 dígitos.
 */
function normalizarHex(valor) {
  if (typeof valor !== 'string') return null;
  let hex = valor.trim();
  if (!hex.startsWith('#')) hex = `#${hex}`;
  return REGEX_HEX.test(hex) ? hex.toUpperCase() : null;
}

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
        is: REGEX_HEX,
      },
    },
    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'colores_etiqueta',
    hooks: {
      beforeValidate: (color) => {
        if (typeof color.nombre === 'string') color.nombre = color.nombre.trim();
        if (color.hex != null) color.hex = normalizarHex(color.hex) || color.hex;
      },
    },
  });

  return ColorEtiqueta;
};

module.exports.normalizarHex = normalizarHex;
module.exports.REGEX_HEX = REGEX_HEX;
