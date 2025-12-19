const express = require('express')
const http = require('http');
const { Server } = require('socket.io')
const cors = require('cors');

const app = express() // Inicializar express

app.use(cors()); // Permite la conexion desde el frontend

const server = http.createServer(app); // Creamos el servidor HTTP a partir de Express

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // Esta es la URL donde correrá React
        methods: ["GET", "POST"] 
    }
});

const questions = [
    {
        title: "¿Cuál es el planeta más grande del sistema solar?",
        options: ["Tierra", "Marte", "Júpiter", "Saturno"],
        correct: 2 
    },
    {
        title: "¿Cuántas patas tiene una araña?",
        options: ["6", "8", "10", "12"],
        correct: 1
    },
    {
        title: "¿En qué año llegó el hombre a la luna?",
        options: ["1969", "1975", "1960", "1980"],
        correct: 0
    }
];

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

        if (data.answer === questionInPlay.correct){
            player.score += 100;
            socket.emit('answer_result', { 
                correct : true,
                correctIndex: questionInPlay.correct
            })
        } else {
            socket.emit('answer_result', { 
                correct : false,
                correctIndex: questionInPlay.correct
            })
        }
        
        // Envia lista actualizada de puntajes inmediatamente
        io.to('game_room').emit('update_players', Object.values(players))
    })
});


const PORT = 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
})
