const { Sequelize } = require('sequelize');
require('dotenv').config()

const database = process.env.PGDATABASE
const host = process.env.PGHOST
const username = process.env.PGUSER
const password = process.env.PGPASSWORD

const sequelize = new Sequelize(database, username, password, {
  host: host,
  dialect: 'postgres',
  logging: false, // Ponlo en true si quieres ver las consultas SQL en consola
});

// 2. Probar la conexión
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a PostgreSQL exitosa.');
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

testConnection();

module.exports = { sequelize };