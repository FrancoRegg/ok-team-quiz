import { useEffect, useState } from "react";
import io from 'socket.io-client';

// Variable GLOBAL para mantener UNA SOLA instancia del socket
let socketInstance = null; 

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Si no existe el socket, crearlo
        if (!socketInstance) {
            const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
            
            console.log('🔌 Creando nueva instancia de socket:', SOCKET_URL);
            
            socketInstance = io(SOCKET_URL, {
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5,
                transports: ['websocket', 'polling']
            });
        }

        // Listeners para el estado de conexión
        const onConnect = () => {
            console.log('✅ Socket conectado:', socketInstance.id);
            setIsConnected(true);
        };

        const onDisconnect = () => {
            console.log('❌ Socket desconectado');
            setIsConnected(false);
        };

        // Registrar listeners
        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);

        // Establecer estado inicial
        setIsConnected(socketInstance.connected);

        // Remover listeners (pero NO desconectar el socket)
        return () => {
            socketInstance.off('connect', onConnect);
            socketInstance.off('disconnect', onDisconnect);
        };
    }, []);

    return { 
        socket: socketInstance, 
        isConnected 
    };
};

export const disconnectSocket = () => {
    if (socketInstance) {
        console.log('🔌 Desconectando socket globalmente');
        socketInstance.disconnect();
        socketInstance = null;
    }
};