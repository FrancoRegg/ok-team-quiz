import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Conectar Backend
const socket = io('http://localhost:3000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [inside, setInside] = useState(false);
  const [nameGroup, setNameGroup] = useState("");
  const [gameState, setGameState] = useState("LOBBY")
  console.log("ESTADO DEL JUEGO",gameState)
  useEffect(() => {
    // Escuchar eventos de conexión del socket
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("Conectado al servidor con ID:", socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game_state', (stateFromServer)=>{
      setGameState(stateFromServer)
    });

    // Limpieza al cerrar el componente
    return () => {
      socket.off('connect');
      socket.off('disconnect');
    };
  }, []);

  function enterGame(){
    
    socket.emit('join_game', {name:nameGroup})
    setInside(true);
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px', fontFamily: 'Arial' }}>
      <h1>Join the Game!</h1>
      
      {inside ? 
        (gameState === 'LOBBY' ? (
          'Esperando al presentador... ⏳'
        ) : (
        <div>
          <button>Boton 1</button>
          <button>Boton 2</button>
          <button>Boton 3</button>
          <button>Boton 4</button>
        </div>
        )
          ) : (
          <div>
            <label>
              <input name="Entrada" value={nameGroup} onChange={e => setNameGroup(e.target.value)} />
            </label>
            <button onClick={enterGame}> Entrar al Juego </button>
        </div>
      )}
      
      <h6>
        Estado del Servidor: {' '}
        <span style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
          {isConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
        </span>
      </h6>
    </div>
  );
}

export default App;