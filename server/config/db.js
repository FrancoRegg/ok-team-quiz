const { Sequelize } = require('sequelize');
const path = require('path');

// Cargamos el archivo .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const database = process.env.PGDATABASE;
const username = process.env.PGUSER;
const host = process.env.PGHOST;
const password = String(process.env.PGPASSWORD || ''); // Convertimos a texto por seguridad

console.log("🔌 Intentando conectar a:", host, "Usuario:", username, "Base:", database);

const sequelize = new Sequelize(database, username, password, {
  host: host,
  dialect: 'postgres',
  logging: false,
  // Configuración para Producción (Railway)
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

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