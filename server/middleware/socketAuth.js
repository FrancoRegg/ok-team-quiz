const jwt = require('jsonwebtoken');

// El panel admin manda en el handshake el mismo token que ya usa para la API.
// Si es válido, el socket queda marcado como administrador. Los jugadores y el
// proyector no tienen token: siguen conectándose igual, sin la marca.
const authenticateSocket = (socket, next) => {
    socket.data.isAdmin = false;

    const token = socket.handshake?.auth?.token;

    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET);
            socket.data.isAdmin = true;
        } catch (error) {
            console.log('⛔ Token del panel inválido o expirado:', error.message);
        }
    }

    next();
};

module.exports = { authenticateSocket };
