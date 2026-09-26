const { players } = require('../utils/gameState');

// Quién puede manejar la partida: el proyector, que entra como HOST al cargar
// la página, y el panel admin, que se identifica con su token en el handshake.
// Un jugador no puede disparar estos eventos desde la consola del navegador.
const isGameController = (socket) =>
    socket.data?.isAdmin === true || players[socket.id]?.name === 'HOST';

// El proyector ya muestra los error_message en pantalla
const rejectUnauthorized = (socket, event) => {
    console.log(`⛔ Evento ${event} rechazado: el socket ${socket.id} no controla la partida`);
    socket.emit('error_message', {
        message: 'No tienes permiso para controlar la partida'
    });
};

module.exports = { isGameController, rejectUnauthorized };
