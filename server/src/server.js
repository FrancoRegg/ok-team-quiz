require('dotenv').config()
console.log("La clave es:", process.env.ADMIN_PASSWORD);
const express = require('express')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors');
const { sequelize } = require('../config/db');
const { sincro } = require('../config/sync')
const Question = require('../models/Questions')
const questionRoutes = require('../routes/questionRoutes')

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

// Variable global para guardar las preguntas en memoria
let questions = []; 

// Función para cargar preguntas desde la BD
async function loadQuestions() {
    try {
        const questionsFromDB = await Question.findAll();
        
        questions = questionsFromDB.map(q => q.toJSON());
        console.log(`✅ ${questions.length} preguntas cargadas desde la Base de Datos.`);
    } catch (error) {
        console.error("❌ Error al cargar preguntas:", error);
    }
}

// Ejecutamos la carga al iniciar
loadQuestions();

const players = {}
let gameState = 'LOBBY'
let currentQuestionIndex = 0;

const sendNextQuestion = () =>{
    if (currentQuestionIndex >= questions.length){
        gameState = 'GAME_OVER' 

        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))
        return;
    }

    gameState = "QUESTION"
    const fullQuestion = questions[currentQuestionIndex]

    const questionToSend = {
        title: fullQuestion.title,
        options: fullQuestion.options,
        type: fullQuestion.type,      
        mediaUrl: fullQuestion.mediaUrl 
    }

    for(const id in players){
        players[id].hasAnswered = false;
    }

    io.to('game_room').emit('game_state', gameState)
    io.to('game_room').emit('new_question', questionToSend)
    
    
    currentQuestionIndex++;
}

// Escucha los eventos de conexion
io.on("connection", (socket) => {
    
    socket.on('join_game', (data)=>{
        const groupId = data.name 
        if (!groupId || groupId === ""){
            console.log("No se permiten campos vacios")
            return;
        }
        
        const existingPlayerId = Object.keys(players).find(key => players[key].name === groupId);

        if (existingPlayerId) {
            console.log(`${groupId} se ha reconectado. Recuperando puntaje.`);
            
            const oldData = players[existingPlayerId];
            
            delete players[existingPlayerId];
        
            players[socket.id] = {
                name : groupId,
                score : oldData.score,
                id : socket.id,
                hasAnswered: oldData.hasAnswered,
            };
        }else{
            players[socket.id] = {
                name: groupId,
                score: 0,
                id: socket.id,
                hasAnswered: false
            };
        }

        socket.join('game_room')
        socket.emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))

        if (gameState === 'QUESTION' && currentQuestionIndex > 0) {
            const currentQ = questions[currentQuestionIndex - 1]; 
            
            if (currentQ) {
                const questionData = {
                    title: currentQ.title,
                    options: currentQ.options,
                    type: currentQ.type,
                    mediaUrl: currentQ.mediaUrl
                };
                
                // Enviamos la pregunta SOLO al que acaba de entrar
                socket.emit('new_question', questionData);
            }
        }
    })

    socket.on('disconnect', () => {
        console.log("Usuario desconectado:", socket.id);
        io.to('game_room').emit('update_players', Object.values(players))
    });

    socket.on('start_game', () => {
        sendNextQuestion()
    });

    socket.on('reset_game', () => {
        gameState = "LOBBY"
        currentQuestionIndex = 0;

        // Reiniciar puntajes de todos los grupos
        for (const id in players) {
            players[id].score = 0;
            players[id].hasAnswered = false;
        }

        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))
    })
    
    socket.on('submit_answer', (data) => {
        const player = players[socket.id]
        // Validación por si el grupo se desconectó o no existe
        if (!player) return; 

        if (player.hasAnswered){
            return;
        }
        player.hasAnswered = true;

        const questionInPlay = questions[currentQuestionIndex - 1]; 

        if (data.answer === questionInPlay.correctIndex){
            player.score += 100;
            socket.emit('answer_result', { 
                correct : true,
                correctIndex: questionInPlay.correctIndex
            })
        } else {
            socket.emit('answer_result', { 
                correct : false,
                correctIndex: questionInPlay.correctIndex
            })
        }
        
        // Envia lista actualizada de puntajes inmediatamente
        io.to('game_room').emit('update_players', Object.values(players))

        const allPlayers = Object.values(players).filter(p => p.name !== 'HOST');
        const totalPlayers = allPlayers.length;
        
        const answersCount = allPlayers.filter(p => p.hasAnswered).length;

        if (totalPlayers > 0 && answersCount === totalPlayers) {
            console.log("Todos han respondido. Avanzando en 3 segundos...");
            
            // Esperamos 3 segundos para que vean si acertaron o fallaron
            setTimeout(() => {
                sendNextQuestion();
            }, 3000); 
        }
    })
});

app.use('/api/questions', questionRoutes)
server.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`)
})