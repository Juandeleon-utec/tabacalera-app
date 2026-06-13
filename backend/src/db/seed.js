require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { sequelize, Usuario, Agricultor } = require('../models');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a MySQL OK');
    await sequelize.sync({ force: false });

    // Usuarios de ejemplo
    const passwordHash = await bcrypt.hash('campo123', 10);
    const usuariosEjemplo = [
      { nombre: 'Carlos Rodríguez', usuario: 'carlos.r', password_hash: passwordHash, activo: true, rol: 'comprador' },
      { nombre: 'María González', usuario: 'maria.g', password_hash: passwordHash, activo: true, rol: 'comprador' },
      { nombre: 'Pedro Álvarez', usuario: 'pedro.a', password_hash: passwordHash, activo: true, rol: 'comprador' },
    ];

    for (const u of usuariosEjemplo) {
      const [usuario, creado] = await Usuario.findOrCreate({
        where: { usuario: u.usuario },
        defaults: u,
      });
      console.log(`Usuario ${u.usuario}: ${creado ? 'creado' : 'ya existía'}`);
    }

    // Agricultores de ejemplo
    const agricultoresEjemplo = [
      { codigo_6dig: '100001', nombre: 'Juan Pérez Tabares', direccion: 'Ruta 5 km 120', telefono: '099123456', departamento: 'Rivera' },
      { codigo_6dig: '100002', nombre: 'Roberto Silva Motta', direccion: 'Ruta 8 km 85', telefono: '098765432', departamento: 'Tacuarembó' },
      { codigo_6dig: '100003', nombre: 'Ana Martínez López', direccion: 'Cnel. Blanco 450', telefono: '091234567', departamento: 'Rivera' },
      { codigo_6dig: '100004', nombre: 'Luis Fernández Rivas', direccion: 'Ruta 6 km 42', telefono: '092345678', departamento: 'Salto' },
      { codigo_6dig: '100005', nombre: 'Carmen Acosta Bentos', direccion: 'Paraje Tranqueras', telefono: '099876543', departamento: 'Rivera' },
    ];

    for (const a of agricultoresEjemplo) {
      const [agr, creado] = await Agricultor.findOrCreate({
        where: { codigo_6dig: a.codigo_6dig },
        defaults: a,
      });
      console.log(`Agricultor ${a.codigo_6dig} - ${a.nombre}: ${creado ? 'creado' : 'ya existía'}`);
    }

    console.log('\nSeed completado. Contraseña de prueba para todos los usuarios: campo123');
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    process.exit(1);
  }
}

seed();
