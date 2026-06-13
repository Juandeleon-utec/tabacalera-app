const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
      underscored: true,
    },
  }
);

const Usuario = require('./Usuario')(sequelize);
const Agricultor = require('./Agricultor')(sequelize);
const Envio = require('./Envio')(sequelize);
const Fardo = require('./Fardo')(sequelize);

// Relaciones
Usuario.hasMany(Envio, { foreignKey: 'usuario_id', as: 'envios' });
Envio.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });

Agricultor.hasMany(Envio, { foreignKey: 'agricultor_id', as: 'envios' });
Envio.belongsTo(Agricultor, { foreignKey: 'agricultor_id', as: 'agricultor' });

Envio.hasMany(Fardo, { foreignKey: 'envio_id', as: 'fardos' });
Fardo.belongsTo(Envio, { foreignKey: 'envio_id', as: 'envio' });

module.exports = { sequelize, Usuario, Agricultor, Envio, Fardo };
