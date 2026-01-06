const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') })
const express = require('express')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors');
const { sincro } = require('./config/sync')
const Question = require('./models/Questions')
const questionRoutes = require('./routes/questionRoutes');

// Sincronizaicon de tablas
sincro();
 
const port = process.env.PORT;
const app = express() // Inicializar express
app.use(cors()); // Permite la conexion desde el frontend
app.use(express.json());

const server = http.createServer(app); // Creamos el servidor HTTP a partir de Express

app.post('/api/login', (req, res) => {
    const { password } = req.body; 

    if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true, message: "Acceso concedido" });
    } else {
        return res.status(401).json({ success: false, message: "Contraseña incorrecta" });
    }
});

const io = new Server(server, {
    cors: {
        origin: "*", // Esta es la URL donde correrá React
        methods: ["GET", "POST"] 
    }
});
// --- VARIABLES GLOBALES DEL JUEGO ---
const SERVER_RUN_ID = Date.now(); // Identificador único de esta sesión del servidor
let GAME_SESSION_ID = Date.now(); // Identificador de esta sesión de la partida
let questions = []; 
const players = {}; 
let gameState = 'LOBBY';
let currentQuestionIndex = 0;

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
loadQuestions();

// --- ENVIAR SIGUIENTE PREGUNTA ---
const sendNextQuestion = () =>{
    // Si se acabaron las preguntas
    if (currentQuestionIndex >= questions.length){
        gameState = 'GAME_OVER' 
        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))
        return;
    }

    // Preparar nueva pregunta
    gameState = "QUESTION"
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
    }

    // Enviar a todos
    io.to('game_room').emit('game_state', gameState)
    io.to('game_room').emit('new_question', questionToSend)
    
    currentQuestionIndex++;
}

// --- SOCKETS ---
io.on("connection", (socket) => {
    
    // 1. Lo primero: Enviar ID del servidor para validar sesión
    socket.emit('server_check', { 
        serverId: SERVER_RUN_ID, 
        gameId: GAME_SESSION_ID 
    });

    socket.on('join_game', (data)=>{
        const groupId = data.name 
        const clientGameId = data.gameId; 

        if (!clientGameId || String(clientGameId) !== String(GAME_SESSION_ID)) {
            console.log(`⛔ Bloqueado intento de acceso de ${groupId} con ticket caducado.`);
            
            socket.emit('force_refresh'); 
            return; 
        }
        if (!groupId || groupId === "") return;
        
        const existingPlayerId = Object.keys(players).find(key => players[key].name === groupId);

        if (existingPlayerId) {
            console.log(`🔄 ${groupId} recuperado.`);
            const oldData = players[existingPlayerId];
            delete players[existingPlayerId]; 
        
            players[socket.id] = {
                name : groupId,
                score : oldData.score,
                id : socket.id,
                hasAnswered: oldData.hasAnswered,
            };
        } else {
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
    })

    socket.on('disconnect', () => {
        // Opcional: Si quieres borrarlos al salir, descomenta esto. 
        // Pero para reconexiones es mejor dejarlos en memoria un rato.
        // delete players[socket.id];
        
        // Solo actualizamos la lista para que el host vea quién queda online (opcional)
        // io.to('game_room').emit('update_players', Object.values(players))
    });

    socket.on('start_game', () => {
        sendNextQuestion()
    });

    socket.on('reset_game', () => {
        console.log("🧹 Realizando HARD RESET completo...");
        GAME_SESSION_ID = Date.now();

        // Vaciamos el objeto players manteniendo la referencia const
        for (const key in players) {
            delete players[key];
        }

        // Reiniciamos variables
        gameState = "LOBBY";
        currentQuestionIndex = 0;

        // Avisamos a todos
        io.emit('game_state', gameState);
        io.emit('update_players', []); 
        io.emit('force_refresh'); 
    })
    
    socket.on('submit_answer', (data) => {
        const player = players[socket.id]
        if (!player || player.hasAnswered) return; 

        player.hasAnswered = true;
        const questionInPlay = questions[currentQuestionIndex - 1]; 

        // Calcular puntaje
        const isCorrect = data.answer === questionInPlay.correctIndex;
        if (isCorrect) player.score += 100;

        // Enviar resultado individual
        socket.emit('answer_result', { 
            correct : isCorrect,
            correctIndex: questionInPlay.correctIndex
        })
        
        // Actualizar Host
        io.to('game_room').emit('update_players', Object.values(players))

        // --- LÓGICA DE AVANCE AUTOMÁTICO ---
        const allPlayers = Object.values(players).filter(p => p.name !== 'HOST');
        const totalPlayers = allPlayers.length;
        const answersCount = allPlayers.filter(p => p.hasAnswered).length;

        if (totalPlayers > 0 && answersCount === totalPlayers) {
            console.log("🚀 Todos respondieron. Avanzando...");
            setTimeout(() => {
                sendNextQuestion();
            }, 3000); 
        }
    })
});

app.use('/api/questions', questionRoutes)

// Servir los archivos estáticos del build de React
app.use(express.static(path.join(__dirname, '../client/dist')));
// Hacer que cualquier ruta no-API devuelva el index.html (para que funcione React Router)
app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
server.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`)
})