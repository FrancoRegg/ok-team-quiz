const { Server } = require('socket.io');

function configureSocket(server, allowedOrigins) {
    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true, 
        }
    });

    console.log('✅ Socket.io configurado');
    
    return io;
}

module.exports = { configureSocket };