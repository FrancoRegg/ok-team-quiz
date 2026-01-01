import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('http://192.168.1.12:3000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [inside, setInside] = useState(() => {
    return !!localStorage.getItem("savedGroupName");
  });
  const [nameGroup, setNameGroup] = useState(() => {
    return localStorage.getItem("savedGroupName") || "";
  });
  const [gameState, setGameState] = useState("LOBBY");
  const [optionsAnswers, setOptionsAnswers] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);       
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scoreGroup, setScoreGroup] = useState(0)

  const wakeLockRef = useRef(null);
  
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        console.log('Pantalla bloqueada para no apagarse 💡');
      }
    } catch (err) {
      console.log('El navegador no soporta WakeLock o hubo error:', err);
    }
  };

  useEffect(() => {
    if (inside) {
      requestWakeLock();
    }
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && inside) {
            requestWakeLock();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, [inside]);

  useEffect(() => {
    // Evento de Conexión y Reconexión Automática
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("Conectado al servidor con ID:", socket.id);

      const savedName = localStorage.getItem("savedGroupName");
      if (savedName) {
          console.log("🔄 Reconexión automática detectada para:", savedName);
          socket.emit('join_game', { name: savedName });
          setInside(true); 
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('game_state', (state) => {
      setGameState(state)
    });

    socket.on('new_question', (answers) => {
      setOptionsAnswers(answers);
      setHasAnswered(false);
      setAnswerStatus(null);
      setMyAnswer(null);
      setCorrectAnswer(null);

      if (navigator.vibrate) navigator.vibrate(100);
    })

    socket.on('answer_result', (data) => {
      if(data.correct){
        setAnswerStatus('CORRECT')
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
      }else{
        setAnswerStatus('INCORRECT')
        if (navigator.vibrate) navigator.vibrate(400); 
      }
      setCorrectAnswer(data.correctIndex)
    })

    socket.on('update_players', (data) =>{
        const myData = data.find(player => player.id === socket.id)
        if(myData){
            setScoreGroup(myData.score)
            
            if (myData.hasAnswered) {
                setHasAnswered(true);
            }
        }
    })

    // Limpieza de listeners al desmontar
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('new_question');
      socket.off('answer_result'); 
      socket.off('update_players')
    };
  }, []); 

  // --- FUNCIONES DEL USUARIO ---

  function enterGame(){
    if(!nameGroup.trim()) {
        alert("Por favor, escribe un nombre.");
        return;
    }
    
    localStorage.setItem("savedGroupName", nameGroup);
    
    socket.emit('join_game', { name: nameGroup })
    setInside(true);
    requestWakeLock(); 
  }

  function exitGame() {
      localStorage.removeItem("savedGroupName");
      setInside(false);
      setNameGroup("");
      window.location.reload(); 
  }

  function submitAnswer(i){
    if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback

    socket.emit('submit_answer', { answer: i })
    setHasAnswered(true);
    setMyAnswer(i);
  } 

  const getButtonColor = (index) => {
    if (answerStatus === null) return 'blue'; 
    if (index === correctAnswer) return 'green';
    if (index === myAnswer && answerStatus === 'INCORRECT') return 'red';
    return 'gray';
  }

  // --- RENDERIZADO ---

  if(gameState === 'GAME_OVER'){
    return(
      <div>
        <h1>¡Juego Terminado! 🏁</h1>
        <p>Mira la pantalla grande para ver al ganador.</p>
        <h3>Tu puntaje final: {scoreGroup}</h3>
        <button onClick={exitGame} style={{marginTop: '20px'}}>Salir</button>
      </div>
    )
  }

  return (
    <div>
      <h1>Join the Game!</h1>
      
      {inside ? 
        (gameState === 'LOBBY' ? (
          'Esperando al presentador... ⏳'
        ) : (
        <div>
          {optionsAnswers?.options ? (
            optionsAnswers.options.map((answer, i) => (
              <button
                disabled={hasAnswered}
                key={i} 
                onClick={() => submitAnswer(i)}
                style={{ 
                  margin: '10px', 
                  padding: '10px 20px', 
                  fontSize: '16px',
                  backgroundColor: getButtonColor(i),
                  color: 'white', 
                  border: 'none',
                  cursor: hasAnswered ? 'not-allowed' : 'pointer' 
                }}
              >
                {answer}
              </button>
            ))
          ) : (
            <p>Cargando preguntas...</p>
          )}
          </div>
        )
          ) : (
          <div>
            <label>
              <input name="Entrada" value={nameGroup} onChange={(e) => setNameGroup(e.target.value)} />
            </label>
            <button onClick={enterGame}> Entrar al Juego </button>
        </div>
      )}
      
      <h6>
        Estado del Servidor: {''}
        <span style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
          {isConnected ? '🟢 CONECTADO' : '🔴 DESCONECTADO'}
        </span>
      </h6>
    </div>
  );
}

export default App;