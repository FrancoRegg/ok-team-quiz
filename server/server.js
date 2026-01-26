const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const http = require('http');
const { dbSynchronization } = require('./config/sync');
const { configureSocket } = require('./config/socket');
const { configureCORS } = require('./config/cors');
const gameStateModule = require('./utils/gameState')
const Question = require('./models/Questions');
const Player = require('./models/Players');
const questionRoutes = require('./routes/questionRoutes');
const playerRoutes = require('./routes/playerRoutes');
const playerController = require('./controllers/player.controller');
const jwt = require('jsonwebtoken');

// Handlers de socket
const { registerPlayerHandlers } = require('./sockets/playerHandlers');
const { registerGameHandlers } = require('./sockets/gameHandlers');
const { registerAnswerHandlers } = require('./sockets/answerHandlers');
const { registerAdminHandlers } = require('./sockets/adminHandlers');
// Logica de juego
const { loadQuestions, sendNextQuestion } = require('./utils/gameLogics')
 
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
io.on("connection", (socket) => {

    socket.emit('server_check', { 
        serverId: SERVER_RUN_ID, 
        gameId: getGameSessionId() 
    })

    // --- Handlers ---
    registerPlayerHandlers(io, socket);
    registerGameHandlers(io, socket, sendNextQuestion);
    registerAnswerHandlers(io, socket);
    registerAdminHandlers(io, socket, loadQuestions);
    
});

// ---------------------------------------------------------------------

const authenticateAdmin = (req, res, next) => {
    console.log('🔍 authenticateAdmin - Validando request a:', req.path);
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('⛔ Request sin token de autorización');
        return res.status(401).json({ 
            error: 'No autorizado - Token requerido' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        console.log('⛔ Token vacío');
        return res.status(401).json({ 
            error: 'No autorizado - Token vacío' 
        });
    }
    
    // Verificar JWT
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        console.log('✅ JWT válido:', decoded);
        
        // Opcional: agregar info del token al request
        req.user = decoded;
        
        next();
    } catch (error) {
        console.log('⛔ JWT inválido o expirado:', error.message);
        return res.status(403).json({ 
            error: 'No autorizado - Token inválido o expirado',
            details: error.message
        });
    }
};

app.post('/api/login', (req, res) => {
    const { password } = req.body; 

    if (password === process.env.ADMIN_PASSWORD) {

        // Genera JWT que expira en 24 horas
        const token = jwt.sign(
            { role: 'admin', timestamp: Date.now() },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        console.log('✅ Admin autenticado, token generado');

        return res.json({ 
            success: true, 
            message: "Acceso concedido",
            token: token
        });
    } else {
        return res.status(401).json({ 
            success: false, 
            message: "Contraseña incorrecta" 
        });
    }
});


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