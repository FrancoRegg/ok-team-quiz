// Carga preguntas de ejemplo en la base de datos.
//
// ATENCIÓN: borra la tabla de preguntas y la vuelve a crear, así que se
// pierden todas las preguntas existentes. Jugadores y contraseña de admin
// no se tocan. Por eso exige --confirm y se niega a correr contra producción:
//
//     node seed.js --confirm

const path = require('path');
// Mismo .env que usa el servidor, así el seed apunta a la misma base
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Guardas antes de cargar nada que abra la conexión
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
    console.error('⛔ seed.js no se ejecuta contra producción.');
    console.error('   Detectado NODE_ENV=production o DATABASE_URL definida.');
    console.error('   Para cargar preguntas en producción usá el panel de administración.');
    process.exit(1);
}

if (!process.argv.includes('--confirm')) {
    console.error('⚠️  Esto BORRA todas las preguntas y carga las de ejemplo.');
    console.error(`   Base de destino: ${process.env.PGDATABASE} en ${process.env.PGHOST}`);
    console.error('   Jugadores y contraseña de admin no se tocan.');
    console.error('   Si es lo que querés, ejecutá: node seed.js --confirm');
    process.exit(1);
}

const { sequelize } = require('./config/db');
const Question = require('./models/Questions');

const initialQuestions = [
    {
        title: "¿Cuál es el planeta más grande del sistema solar?",
        type: "TEXT",
        mediaUrl: null,
        options: ["Tierra", "Marte", "Júpiter", "Saturno"],
        correctIndex: 2
    },
    {
        title: "¿Cuántas patas tiene una araña?",
        type: "TEXT",
        mediaUrl: null,
        options: ["6", "8", "10", "12"],
        correctIndex: 1
    },
    {
        title: "¿En qué año llegó el hombre a la luna?",
        type: "IMAGE",
        mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/9/98/Aldrin_Apollo_11_original.jpg",
        options: ["1969", "1975", "1960", "1980"],
        correctIndex: 0
    }
];

const seedDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log(`🔌 Conectado a ${process.env.PGDATABASE}.`);

        // force: true borra la tabla y la crea de nuevo. Solo afecta a los
        // modelos cargados en este archivo: acá, únicamente Question.
        await sequelize.sync({ force: true });
        console.log('🗑️  Tabla de preguntas recreada.');

        await Question.bulkCreate(initialQuestions);
        console.log(`🌱 ${initialQuestions.length} preguntas de ejemplo cargadas.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error en el sembrado:', error);
        process.exit(1);
    }
};

seedDatabase();
