// --- CORE DE NODE Y EXTERNOS ---
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');

// --- CONFIGURACION --- 
const { dbSynchronization } = require('./config/sync');
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
console.log('🔧 Registrando listener de connection...');
io.on("connection", (socket) => {
    console.log('🔌 CONEXIÓN DETECTADA en server.js - Socket ID:', socket.id);
    socket.emit('server_check', { 
        serverId: SERVER_RUN_ID, 
        gameId: getGameSessionId(),
        gameState: gameStateModule.getGameState() 
    })
    console.log('✅ server_check enviado');
    
    // ✅ AGREGAR: Handler para re-enviar server_check si se pierde
    socket.on('request_server_check', () => {
        console.log('🔄 Cliente pidió server_check manualmente');
        socket.emit('server_check', { 
            serverId: SERVER_RUN_ID, 
            gameId: getGameSessionId(),
            gameState: gameStateModule.getGameState() 
        });
        console.log('✅ server_check re-enviado');
    });
    
    // --- Handlers ---
    console.log('🔧 Registrando handlers para socket:', socket.id);
    registerPlayerHandlers(io, socket);
    registerGameHandlers(io, socket, sendNextQuestion);
    registerAnswerHandlers(io, socket);
    registerAdminHandlers(io, socket, loadQuestions);
    console.log('✅ Handlers registrados para socket:', socket.id);
});

    console.log('✅ Listener de connection registrado');

app.use('/api/auth', authRoutes)
app.use('/api/questions', authenticateAdmin ,questionRoutes)
app.use('/api/players', authenticateAdmin, playerRoutes)

// Servir los archivos estáticos del build de React
app.use(express.static(path.join(__dirname, '../client/dist')));
// Hacer que cualquier ruta no-API devuelva el index.html (para que funcione React Router)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function startServer() {
    try {
        console.log("⏳ Iniciando sincronización de base de datos...");
        await dbSynchronization(); 
        
        console.log("⏳ Cargando preguntas...");
        await loadQuestions();

        server.listen(port, '0.0.0.0', () => {
            console.log(`✅ Servidor corriendo y listo en el puerto ${port}`)
        });
    } catch (error) {
        console.error("❌ Error fatal al iniciar el servidor:", error);
    }
}

startServer();