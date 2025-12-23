require('dotenv').config()
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

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Esta es la URL donde correrá React
        methods: ["GET", "POST"] 
    }
});

// Variable global para guardar las preguntas en memoria
let questions = []; 

// Función para cargar preguntas desde la BD
async function loadQuestions() {
    try {
        // Pedimos todas las preguntas a Postgres
        const questionsFromDB = await Question.findAll();
        
        // Convertimos los datos "crudos" de Sequelize a objetos JSON simples
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

// Escucha los eventos de conexion
io.on("connection", (socket) => {
    
    socket.on('join_game', (data)=>{
        const groupId = data.name 
        if (!groupId || groupId === ""){
            console.log("No se permiten campos vacios")
            return;
        } 
        players[socket.id] = {
            name : groupId,
            score : 0,
            id : socket.id
        };

        socket.join('game_room')

        // Enviamos estado actual al que entra
        socket.emit('game_state', gameState)
        // Actualizamos la lista para TODOS en la sala
        io.to('game_room').emit('update_players', Object.values(players))
    })

    socket.on('disconnect', () => {
        delete players[socket.id]
        // Avisar a los jugadores de quien abandono la partida
        io.to('game_room').emit('update_players', Object.values(players))
    });

    socket.on('start_game', () => {
        
        // Verificar si ya se acabaron las preguntas
        if (currentQuestionIndex >= questions.length) {
            gameState = 'GAME_OVER' 

            io.to('game_room').emit('game_state', gameState)
            io.to('game_room').emit('update_players', Object.values(players))

            return;
        }

        gameState = "QUESTION"
        const fullQuestion = questions[currentQuestionIndex]

        const questionToSend = {
            title: fullQuestion.title,
            options: fullQuestion.options
        }

        //Resetear el juego
        for(const id in players){
            players[id].hasAnswered = false;
        }

        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('new_question', questionToSend)
        
        currentQuestionIndex++;
    });

    socket.on('reset_game', () => {
        gameState = "LOBBY"
        currentQuestionIndex = 0;

        // Reiniciar puntajes de todos los grupos
        for (const id in players) {
            players[id].score = 0;
        }

        io.to('game_room').emit('game_state', gameState)
        io.to('game_room').emit('update_players', Object.values(players))
    })
    
    socket.on('submit_answer', (data) => {
        const player = players[socket.id]
        // Validación por si el grupo se desconectó o no existe
        if (!player) return; 

        if(player.hasAnswered){
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
    })
});

app.use('/api/questions', questionRoutes)

server.listen(port, () => {
    console.log(`Servidor corriendo en el puerto ${port}`)
})
