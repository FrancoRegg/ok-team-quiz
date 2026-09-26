import { useSyncExternalStore } from "react";
import io from 'socket.io-client';

let socketInstance = null;

// Un único socket para toda la app, creado la primera vez que se pide. Al
// existir desde el primer render, los componentes registran sus listeners
// antes de que llegue la conexión (y con ella server_check).
const getSocket = () => {
    if (!socketInstance) {
        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

        console.log('🔌 Creando nueva instancia de socket:', SOCKET_URL);

        socketInstance = io(SOCKET_URL, {
            // El panel admin manda su token para poder reiniciar la partida.
            // Se lee en cada conexión, así una reconexión no usa uno viejo.
            auth: (cb) => {
                let token = null;
                try {
                    token = localStorage.getItem('admin_token');
                } catch {
                    // Almacenamiento no disponible: se conecta sin token
                }
                cb(token ? { token } : {});
            },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            transports: ['websocket', 'polling']
        });

        socketInstance.on('connect', () => console.log('✅ Socket conectado:', socketInstance.id));
        socketInstance.on('disconnect', () => console.log('❌ Socket desconectado'));
    }

    return socketInstance;
};

// isConnected sale del propio socket: React lo vuelve a leer en cada conexión
// o desconexión, sin copiarlo a un estado que pueda quedar desfasado
const subscribeToConnection = (onChange) => {
    const socket = getSocket();
    socket.on('connect', onChange);
    socket.on('disconnect', onChange);

    return () => {
        socket.off('connect', onChange);
        socket.off('disconnect', onChange);
    };
};

const isSocketConnected = () => getSocket().connected;

export const useSocket = () => {
    const socket = getSocket();
    const isConnected = useSyncExternalStore(subscribeToConnection, isSocketConnected);

    return {
        socket,
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
