const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors');
const { sincro } = require('./config/sync')
const Question = require('./models/Questions')
const questionRoutes = require('./routes/questionRoutes');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
 
const port = process.env.PORT;
const app = express() // Inicializar express
app.use(express.json());

const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        process.env.CLIENT_URL || 'https://ok-team-quiz-production.up.railway.app', // URL de producción
      ] 
    : [
        'http://localhost:5173',      // Vite en desarrollo
        'http://localhost:3000',      // Si frontend y backend en mismo puerto
        'http://192.168.1.14:5173',   // Tu red local (REEMPLAZA con tu IP)
      ];

console.log("🔒 CORS configurado para:", allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        // Permitir requests sin origin (como Postman, curl, o mismo dominio)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("⛔ CORS bloqueó origen:", origin);
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true, // Permite cookies/autenticación
})); 

const server = http.createServer(app); // Creamos el servidor HTTP a partir de Express

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true, 
    }
});
// --- VARIABLES GLOBALES DEL JUEGO ---
const SERVER_RUN_ID = Date.now(); // Identificador único de esta sesión del servidor
let GAME_SESSION_ID = Date.now(); // Identificador de esta sesión de la partida
let questions = []; 
const players = {}; 
const playerTimeouts = {};
let gameState = 'LOBBY';
let currentQuestionIndex = 0;
let firstCorrectAnswer = null;
let currentCorrectAnswer = null;

// Cargar preguntas al inicio
async function loadQuestions() {
    try {
        const questionsFromDB = await Question.findAll();
        questions = questionsFromDB.map(q => q.toJSON());
        console.log(`✅ ${questions.length} preguntas cargadas.`);
    } catch (error) {
        console.error("❌ Error al cargar preguntas:", error);
    }
}

// --- ENVIAR SIGUIENTE PREGUNTA ---
const sendNextQuestion = async () =>{
    // Si es la primera pregunta, recaga desde BD
    if (currentQuestionIndex === 0) {
        await loadQuestions();
        console.log("🔄 Preguntas recargadas desde BD")
    }

    // Si se acabaron las preguntas
    if (currentQuestionIndex >= questions.length){
        gameState = 'GAME_OVER' 
        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))
        return;
    }

    // Preparar nueva pregunta con estado bloqueado 
    gameState = "QUESTION_LOCKED"
    const fullQuestion = questions[currentQuestionIndex]

    const questionToSend = {
        title: fullQuestion.title,
        options: fullQuestion.options,
        type: fullQuestion.type,      
        mediaUrl: fullQuestion.mediaUrl 
    }

    // Resetear estado de respuesta de los jugadores
    for(const id in players){
        players[id].hasAnswered = false;
    };

    firstCorrectAnswer = null;
    currentCorrectAnswer = null;

    // Enviar a todos
    io.to('game_room').emit('game_state', gameState);

    // Envia la pregunta solo al HOST
    const hostSocket = Object.keys(players).find(id => players[id].name === 'HOST');
    if (hostSocket) {
        io.to(hostSocket).emit('new_question', questionToSend);
    }
    currentQuestionIndex++;
}

// --- SOCKETS ---
io.on("connection", (socket) => {
    
    // 1. Lo primero: Enviar ID del servidor para validar sesión
    socket.emit('server_check', { 
        serverId: SERVER_RUN_ID, 
        gameId: GAME_SESSION_ID 
    });

    socket.on('join_game', (data) => {
        try{
            console.log("📥 Evento join_game recibido:", data);

            if(!data){
                throw new Error('Datos no proporcionados') 
            }

            const groupId = data.name 
            const clientGameId = data.gameId; 

            // Validacion 1: Nombre obligatorio
            if (!groupId || groupId.trim() === "") {
                console.log(`⛔ Intento de conexión sin nombre`);
                socket.emit('error', { message: 'Debes proporcionar un nombre de equipo' });
                return;
            }

            // Validacion 2: Ticket de sesion, excepto para el host
            if (groupId !== 'HOST') {
                if (process.env.NODE_ENV === 'production') {
                    // En producción: validar estrictamente
                    if (!clientGameId || String(clientGameId) !== String(GAME_SESSION_ID)) {
                        console.log(`⛔ Bloqueado: ${groupId} - Ticket caducado`);
                        console.log(`   - Tiene: ${clientGameId}`);
                        console.log(`   - Esperado: ${GAME_SESSION_ID}`);
                        
                        socket.emit('session_expired', { 
                            message: 'La sesión ha expirado. Por favor, recarga la página.',
                            currentGameId: GAME_SESSION_ID 
                        });
                        
                        socket.disconnect(true); 
                        return;
                    }
                } else {
                    // En desarrollo: solo loguear, permitir conexión
                    if (clientGameId && String(clientGameId) !== String(GAME_SESSION_ID)) {
                        console.log(`⚠️ [DEV] GameId diferente para ${groupId}: ${clientGameId} vs ${GAME_SESSION_ID} (permitido en desarrollo)`);
                    }
                }
            }
            console.log(`✅ Validación pasada para: ${groupId}`);
            
            const existingPlayerId = Object.keys(players).find(key => players[key].name === groupId);

            if (existingPlayerId) {
                console.log(`🔄 ${groupId} recuperado.`);
                const oldData = players[existingPlayerId];

                // Cancelacion del timeout si existe grupo
                if(playerTimeouts[existingPlayerId]){
                    clearTimeout(playerTimeouts[existingPlayerId]);
                    delete playerTimeouts[existingPlayerId];
                    console.log(`⏰ Timeout cancelado para ${groupId} (reconectado a tiempo)`);
                }

                delete players[existingPlayerId]; 
            
                players[socket.id] = {
                    name : groupId,
                    score : oldData.score,
                    id : socket.id,
                    hasAnswered: oldData.hasAnswered,
                };
            } else {
                console.log(`📝 Nuevo jugador: ${groupId}`);
                players[socket.id] = {
                    name: groupId,
                    score: 0,
                    id: socket.id,
                    hasAnswered: false
                };
            }

            socket.join('game_room')
            
            // Actualizamos estado al recién llegado y a todos
            socket.emit('game_state', gameState)
            io.to('game_room').emit('update_players', Object.values(players))

            // Si entran tarde y ya hay pregunta, se la enviamos
            if (gameState === 'QUESTION' && currentQuestionIndex > 0) {
                const currentQ = questions[currentQuestionIndex - 1]; 
                if (currentQ) {
                    socket.emit('new_question', {
                        title: currentQ.title,
                        options: currentQ.options,
                        type: currentQ.type,
                        mediaUrl: currentQ.mediaUrl
                    });
                }
            }
        } catch (error){
            console.error('❌ Error en join_game:', error.message)
            socket.emit('error', {
                message: 'Error al unirse al juego. Intenta recargar la página.'
            });
        }
    });

    socket.on('disconnect', () => {
        try{
            const player = players[socket.id]
            if(!player) return;

            if(player.name === 'HOST'){
                console.log(`🔌 HOST desconectado (mantenido en memoria)`);
                return;
            }

            console.log(`⏳ ${player.name} desconectado. Esperando 30s para eliminar...`);
        
            playerTimeouts[socket.id] = setTimeout(() => {
            console.log(`🗑️ ${player.name} eliminado, se cumplio el tiempo.`);
            
            // Eliminar del objeto players
            delete players[socket.id];
            
            // Eliminar el timeout del registro
            delete playerTimeouts[socket.id];
            
            // Notificar al host que la lista cambió
            io.to('game_room').emit('update_players', Object.values(players));
            }, 30000)
        } catch (error){
            console.error('❌ Error en disconnect:', error.message)
        }
    });

    socket.on('next_question', async () => {
        try{
            console.log('➡️ Evento next_question recibido (avance manual)');
            await sendNextQuestion();
        } catch (error){
            console.error('❌ Error en next_question:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al avanzar pregunta'
            });
        }
    });

    socket.on('activate_answers', () => {
        try{
            console.log('🟢 Activando respuestas...');
            
            if (gameState !== 'QUESTION_LOCKED') {
                console.log('⚠️ Intento de activar respuestas en estado:', gameState);
                return;
            }
            
            gameState = 'QUESTION_ACTIVE';
            
            // Enviar la pregunta a TODOS los jugadores
            const currentQ = questions[currentQuestionIndex - 1];
            if (currentQ) {
                const questionToSend = {
                    title: currentQ.title,
                    options: currentQ.options,
                    type: currentQ.type,
                    mediaUrl: currentQ.mediaUrl
                };
                
                io.to('game_room').emit('new_question', questionToSend);
            }
            
            // Notificar cambio de estado
            io.to('game_room').emit('game_state', gameState);
            
            console.log('✅ Respuestas activadas y pregunta enviada a todos');
        } catch (error){
            console.error('❌ Error en activate_answers:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al activar respuestas'
            });
        }
    });

    socket.on('show_answer', () => {
        try{
            console.log('📺 Mostrando respuesta correcta...');
            
            if (gameState !== 'QUESTION_ACTIVE') {
                console.log('⚠️ Intento de mostrar respuesta en estado:', gameState);
                return;
            }
            
            gameState = 'SHOW_ANSWER';
            
            // Obtener la pregunta actual
            const currentQ = questions[currentQuestionIndex - 1];
            if (currentQ) {
                currentCorrectAnswer = currentQ.correctIndex;
                
                // Enviar la respuesta correcta al HOST
                const hostSocket = Object.keys(players).find(id => players[id].name === 'HOST');
                if (hostSocket) {
                    io.to(hostSocket).emit('show_correct_answer', {
                        correctIndex: currentQ.correctIndex,
                        correctOption: currentQ.options[currentQ.correctIndex]
                    });
                }
            }
            
            // Notificar cambio de estado
            io.to('game_room').emit('game_state', gameState);
            
            console.log('✅ Respuesta correcta mostrada');
        } catch (error){
            console.error('❌ Error en show_answer:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al mostrar respuesta'
            });
        }
    });

    socket.on('reset_game', async () => {
        try{
            console.log("🧹 Realizando HARD RESET completo...");
            GAME_SESSION_ID = Date.now();

            // Limpiar todos los timeouts pendientes
            for (const key in playerTimeouts){
                clearTimeout(playerTimeouts[key]);
                delete playerTimeouts[key];
            }

            // Vaciamos players
            for (const key in players) {
                delete players[key];
            }

            // Reiniciamos variables
            gameState = "LOBBY";
            currentQuestionIndex = 0;
            firstCorrectAnswer = null;
            currentCorrectAnswer = null;

            await loadQuestions();
            console.log("🔄 Preguntas recargadas");

            // Avisamos a todos
            io.emit('game_state', gameState);
            io.emit('update_players', []); 
            io.emit('force_refresh'); 

        } catch (error){
            console.error('❌ Error en reset_game:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al reiniciar el juego' 
            });
        }
    });
    
    socket.on('submit_answer', (data) => {
        try{
            // Validacion de datos
            if(!data || data.answer === undefined){
                throw new Error('Respuesta no proporcionada.')
            }

            const player = players[socket.id]

            if (!player){
                console.log('⚠️ Intento de respuesta de jugador no registrado');
                return;
            }  

            if (gameState !== 'QUESTION_ACTIVE') {
                console.log(`⚠️ ${player.name} intentó responder pero el estado es: ${gameState}`);
                socket.emit('error', { 
                    message: 'Las respuestas aún no están activadas'
                });
                return;
            }

            if(player.hasAnswered){
                console.log(`⚠️ ${player.name} ya respondió esta pregunta`);
                return;
            }

            player.hasAnswered = true;
            const questionInPlay = questions[currentQuestionIndex - 1]; 

            if(!questionInPlay){
                throw new Error('No hay pregunta activa');
            }

            // Calcular puntaje
            const isCorrect = data.answer === questionInPlay.correctIndex;

            // Si responde correcto primero
            if (isCorrect) {

                if (firstCorrectAnswer === null) {
                    firstCorrectAnswer = socket.id;
                    player.score += 100;
                    console.log(`🥇 ${player.name} respondió primero: +100 puntos`);
                } else {
                    // Respuestas correctas subsecuentes
                    player.score += 90;
                    console.log(`✅ ${player.name} respondió correcto: +90 puntos`);
                }
            };

            const result = { 
                correct: isCorrect, 
                wasFirst: isCorrect && firstCorrectAnswer === socket.id
            };

            if(isCorrect){
                result.correctIndex = questionInPlay.correctIndex;
            };

            // Enviar resultado individual
            socket.emit('answer_result', result)
            
            // Actualizar Host
            io.to('game_room').emit('update_players', Object.values(players))

            // --- LÓGICA DE AVANCE AUTOMÁTICO ---
            // const allPlayers = Object.values(players).filter(p => p.name !== 'HOST');
            // const totalPlayers = allPlayers.length;
            // const answersCount = allPlayers.filter(p => p.hasAnswered).length;

            // if (totalPlayers > 0 && answersCount === totalPlayers) {
            //     console.log("🚀 Todos respondieron. Avanzando...");
            //     setTimeout(() => {
            //         sendNextQuestion();
            //     }, 3000); 
            // }
        } catch (error){
            console.error('❌ Error en submit_answer:', error.message);
            socket.emit('error', { 
                message: 'Error al procesar tu respuesta. Intenta de nuevo.' 
            });
        }
    })
});

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

// Servir los archivos estáticos del build de React
app.use(express.static(path.join(__dirname, '../client/dist')));
// Hacer que cualquier ruta no-API devuelva el index.html (para que funcione React Router)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

async function startServer() {
    try {
        console.log("⏳ Iniciando sincronización de base de datos...");
        await sincro(); 
        
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