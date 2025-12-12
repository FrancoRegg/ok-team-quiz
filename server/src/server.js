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
        correct: 2 // El índice de la respuesta correcta (0, 1, 2, 3)
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
    console.log("Nueva conexion: ", socket.id);
    socket.on('join_game', (data)=>{
        const groupId = data.name 
        if (groupId == ""){
            console.log("No se permiten campos vacios")
            return;
        } 
        players[socket.id] = {
            name : groupId,
            score : 0,
            id : socket.id
        };

        socket.join('game_room')

        socket.emit('game_state', gameState)

        const playerList = Object.values(players)
        io.to('game_room').emit('update_players', playerList)
        console.log(`${groupId} se unio a la partida`)
    })

    socket.on('disconnect', () => {
        console.log("Desconectado: ", socket.id);
        delete players[socket.id]
    });

    socket.on('start_game', ()=>{
        gameState = "QUESTION"

        const questionToSend = questions[currentQuestionIndex]

        io.to('game_room').emit('game_state', gameState)
        console.log("El juego comenzo", gameState)

        io.to('game_room').emit('new_question', questionToSend)
        console.log("Pregunta enviada:", questionToSend.options)
    });

    socket.on('reset_game', () => {
        gameState = "LOBBY"

        io.to('game_room').emit('game_state', gameState)
    })
    
});


const PORT = 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
})
