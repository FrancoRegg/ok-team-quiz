// --- CORE DE NODE Y EXTERNOS ---
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');

// --- CONFIGURACION --- 
const { dbSynchronization } = require('./config/sync');
const { testConnection } = require('./config/db');
const { configureSocket } = require('./config/socket');
const { configureCORS } = require('./config/cors');

// --- RUTAS ---
const questionRoutes = require('./routes/questionRoutes');
const playerRoutes = require('./routes/playerRoutes');
const authRoutes = require('./routes/authRoutes');

// --- CONTROLLERS Y MIDDLEWARE ---
const playerController = require('./controllers/player.controller');
const { authenticateAdmin } = require('./middleware/auth');

// --- HANDLERS DE SOCKETS
const { registerPlayerHandlers } = require('./sockets/playerHandlers');
const { registerGameHandlers } = require('./sockets/gameHandlers');
const { registerAnswerHandlers } = require('./sockets/answerHandlers');
const { registerAdminHandlers } = require('./sockets/adminHandlers');

// --- UTILIDADES ---
const gameStateModule = require('./utils/gameState');
const { loadQuestions, sendNextQuestion } = require('./utils/gameLogics');
 
const port = process.env.PORT;

// Validar contraseña de admin
const { initializePassword } = require('./utils/passwordManager');

const app = express() // Inicializar express
app.use(express.json());

const { corsMiddleware, allowedOrigins } = configureCORS(); 
app.use(corsMiddleware);

const server = http.createServer(app); // Creamos el servidor HTTP a partir de Express

const io = configureSocket(server, allowedOrigins);

playerController.setSocketIO(io);

// ---> ESTADO DEL JUEGO (importado desde gameState) <---
const {
    getServerRunId,
    getGameSessionId,
    players,
} = gameStateModule;

// Constantes locales
const SERVER_RUN_ID = getServerRunId();

// Exportar players para playerController
module.exports.players = players;

// --- SOCKETS ---
io.on("connection", (socket) => {
    socket.emit('server_check', {
        serverId: SERVER_RUN_ID,
        gameId: getGameSessionId(),
        gameState: gameStateModule.getGameState()
    })

    // Handler para re-enviar server_check si se pierde
    socket.on('request_server_check', () => {
        socket.emit('server_check', {
            serverId: SERVER_RUN_ID,
            gameId: getGameSessionId(),
            gameState: gameStateModule.getGameState()
        });
    });

    // --- Handlers ---
    registerPlayerHandlers(io, socket);
    registerGameHandlers(io, socket, sendNextQuestion);
    registerAnswerHandlers(io, socket);
    registerAdminHandlers(io, socket, loadQuestions);
});

app.use('/api/auth', authRoutes)
app.use('/api/questions', authenticateAdmin ,questionRoutes)
app.use('/api/players', authenticateAdmin, playerRoutes)

// Cualquier otra ruta bajo /api no existe: respondemos 404 en JSON.
// Sin esto caía en el catch-all de React y devolvía index.html con status 200,
// y el cliente fallaba al parsear HTML como si fuera JSON.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Ruta de API no encontrada' });
});

// Servir los archivos estáticos del build de React
app.use(express.static(path.join(__dirname, '../client/dist')));
// Hacer que cualquier ruta no-API devuelva el index.html (para que funcione React Router)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// --- MANEJADOR GLOBAL DE ERRORES ---
// Cualquier excepción que escape de una ruta termina acá. Sin esto, Express
// responde su página genérica de "Server Error" y no queda rastro de la causa.
app.use((err, req, res, next) => {
    console.error(`❌ Error no controlado en ${req.method} ${req.originalUrl}:`, err);

    if (res.headersSent) {
        return next(err);
    }

    const isProduction = process.env.NODE_ENV === 'production';

    res.status(err.status || 500).json({
        error: 'Error interno del servidor',
        // En producción no exponemos detalles internos al cliente
        details: isProduction ? undefined : err.message
    });
});

async function startServer() {
    try {
        console.log("⏳ Conectando a la base de datos...");
        await testConnection();

        console.log("⏳ Iniciando sincronización de base de datos...");
        await dbSynchronization();

        console.log("⏳ Inicializando contraseña de admin...");
        await initializePassword();
        
        console.log("⏳ Cargando preguntas...");
        await loadQuestions();

        server.listen(port, '0.0.0.0', () => {
            console.log(`✅ Servidor corriendo y listo en el puerto ${port}`)
        });
    } catch (error) {
        // Si la base no responde, cortamos acá. Antes el proceso seguía vivo
        // sin base y cada operación fallaba con un 500 sin explicación.
        console.error("❌ Error fatal al iniciar el servidor:", error);
        process.exit(1);
    }
}

startServer();