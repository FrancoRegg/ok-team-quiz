const { Server } = require('socket.io');
const { authenticateSocket } = require('../middleware/socketAuth');

function configureSocket(server, allowedOrigins) {
    console.log('🔧 Configurando Socket.io con orígenes:', allowedOrigins);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true, 
        }
    });

    // Marca los sockets del panel admin antes de registrar los handlers
    io.use(authenticateSocket);

    console.log('✅ Socket.io configurado');

    return io;
}

module.exports = { configureSocket };