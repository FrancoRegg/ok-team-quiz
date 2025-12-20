require('dotenv').config(); // Cargar variables de entorno
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
        type: "IMAGE", // ¡Probemos ponerle tipo IMAGE aunque no tengamos foto aun!
        mediaUrl: "https://upload.wikimedia.org/wikipedia/commons/9/98/Aldrin_Apollo_11_original.jpg",
        options: ["1969", "1975", "1960", "1980"],
        correctIndex: 0
    }
];

const seedDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('🔌 Conectado a la DB.');

        // 1. Borrar todo lo anterior (Limpiar la casa)
        // force: true borra la tabla y la crea de nuevo
        await sequelize.sync({ force: true });
        console.log('🗑️  Tablas limpiadas.');

        // 2. Insertar las preguntas (Sembrar)
        await Question.bulkCreate(initialQuestions);
        console.log('🌱 Datos sembrados exitosamente!');

        process.exit(0); // Terminar el proceso
    } catch (error) {
        console.error('❌ Error en el sembrado:', error);
        process.exit(1);
    }
};

seedDatabase();