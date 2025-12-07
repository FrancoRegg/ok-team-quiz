import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Conectar Backend
const socket = io('http://localhost:3000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    // Escuchar eventos de conexión del socket
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("Conectado al servidor con ID:", socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Limpieza al cerrar el componente
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>Prueba de Conexión OK TEAM</h1>
      <h2>
        Estado del Servidor: {' '}
        <span style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
          {isConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
        </span>
      </h2>
      <p>Si ves esto en verde, la Fase 0 y 1 están listas.</p>
    </div>
  );
}

export default App;