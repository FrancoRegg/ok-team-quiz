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
// Escucha los eventos de conexion
io.on("connection", (socket) => {
    console.log("Nueva conexion: ", socket.id);

    socket.on('disconnect', () => {
        console.log("Desconectado: ", socket.id);
    });
});

const PORT = 3000
server.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`)
})
