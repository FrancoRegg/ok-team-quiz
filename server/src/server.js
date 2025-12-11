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

const players = {}
let gameState = 'LOBBY'

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

        io.to('game_room').emit('game_state', gameState)
        console.log("El juego comenzo", gameState)
    });

    
    
});


const PORT = 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
})
