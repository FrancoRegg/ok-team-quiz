const { Sequelize } = require('sequelize');
const path = require('path');

// Carga el archivo .env
require('dotenv').config({ path: path.join(__dirname, '../.env') });

let sequelize;

if (process.env.DATABASE_URL) {
    // PRODUCCIÓN: usan DATABASE_URL
    console.log("🔌 Usando DATABASE_URL (Railway/Render/Heroku)");
    
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
        }
    });
} else {
    // DESARROLLO LOCAL: Usa variables PG separadas
    const database = process.env.PGDATABASE;
    const username = process.env.PGUSER;
    const host = process.env.PGHOST;
    const password = String(process.env.PGPASSWORD || '');
    
    console.log("🔌 Usando variables PG separadas (desarrollo local)");
    console.log("   Host:", host, "Usuario:", username, "Base:", database);
    
    sequelize = new Sequelize(database, username, password, {
        host: host,
        dialect: 'postgres',
        logging: false,
        dialectOptions: {}
    });
}

const testConnection = async() => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a PostgreSQL exitosa.');
    } catch (error) {
        console.error('❌ No se pudo conectar a la base de datos:', error);
    }
}

testConnection();

module.exports = { sequelize };