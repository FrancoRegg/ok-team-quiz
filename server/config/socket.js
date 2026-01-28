const { Server } = require('socket.io');

function configureSocket(server, allowedOrigins) {
    console.log('🔧 Configurando Socket.io con orígenes:', allowedOrigins);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            credentials: true, 
        }
    });

    console.log('✅ Socket.io configurado');

    io.on('connection', (socket) => {
        console.log('🔌 CONEXIÓN DETECTADA en configureSocket - Socket ID:', socket.id);
    });
    
    return io;
}

module.exports = { configureSocket };