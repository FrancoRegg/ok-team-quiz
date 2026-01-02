import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './styles/App.css'; // <--- 1. IMPORTANTE: Conectar el CSS

const socket = io('http://192.168.1.12:3000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [inside, setInside] = useState(() => !!localStorage.getItem("savedGroupName"));
  const [nameGroup, setNameGroup] = useState(() => localStorage.getItem("savedGroupName") || "");
  const [gameState, setGameState] = useState("LOBBY");
  const [optionsAnswers, setOptionsAnswers] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);       
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scoreGroup, setScoreGroup] = useState(0);

  const wakeLockRef = useRef(null);
  
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch (err) {
      console.log('Error WakeLock:', err);
    }
  };

  useEffect(() => {
    if (inside) requestWakeLock();
    
    // Reconexión y lógica del socket (Tu código original intacto)
    socket.on('connect', () => {
      setIsConnected(true);
      const savedName = localStorage.getItem("savedGroupName");
      if (savedName) {
          socket.emit('join_game', { name: savedName });
          setInside(true); 
      }
    });

    socket.on('disconnect', () => setIsConnected(false));
    socket.on('game_state', (state) => setGameState(state));

    socket.on('new_question', (answers) => {
      setOptionsAnswers(answers);
      setHasAnswered(false);
      setAnswerStatus(null);
      setMyAnswer(null);
      setCorrectAnswer(null);
      if (navigator.vibrate) navigator.vibrate(100);
    });

    socket.on('answer_result', (data) => {
      setCorrectAnswer(data.correctIndex);
      if(data.correct){
        setAnswerStatus('CORRECT');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
      }else{
        setAnswerStatus('INCORRECT');
        if (navigator.vibrate) navigator.vibrate(400); 
      }
    });

    socket.on('update_players', (data) =>{
        const myData = data.find(player => player.id === socket.id);
        if(myData){
            setScoreGroup(myData.score);
            if (myData.hasAnswered) setHasAnswered(true);
        }
    });

    socket.on('force_refresh', () => {
      // Borramos su nombre guardado
      localStorage.removeItem("savedGroupName");

      setInside(false);
      setNameGroup("");
      setScoreGroup(0);
      setHasAnswered(false);
      
      // Recargamos la página forzosamente
      window.location.reload();
    })

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('new_question');
      socket.off('answer_result'); 
      socket.off('update_players');
      socket.off('force_refresh')
    };
  }, [inside]); 

  // --- FUNCIONES ---
  function enterGame(){
    if(!nameGroup.trim()) { alert("Escribe un nombre"); return; }
    localStorage.setItem("savedGroupName", nameGroup);
    socket.emit('join_game', { name: nameGroup });
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
    if (navigator.vibrate) navigator.vibrate(50);
    socket.emit('submit_answer', { answer: i });
    setHasAnswered(true);
    setMyAnswer(i);
  } 

  // --- LÓGICA DE ESTILOS CSS ---
  // Esta función decide qué CLASE (color) lleva cada botón
  const getButtonClass = (index) => {
    // 1. Si nadie ha respondido aún, color normal activo
    if (answerStatus === null && !hasAnswered) return 'active';

    // 2. Si ya respondí pero espero resultado, deshabilito los que no toqué
    if (answerStatus === null && hasAnswered) {
        return index === myAnswer ? 'active' : 'disabled';
    }

    // 3. RESULTADO FINAL (Colores Semáforo)
    if (index === correctAnswer) return 'correct'; // ¡El correcto siempre Verde!
    if (index === myAnswer && answerStatus === 'INCORRECT') return 'incorrect'; // El mío rojo si fallé
    
    return 'disabled'; // Los demás grises
  }

  // --- RENDERIZADO ---

  // VISTA: GAME OVER
  if(gameState === 'GAME_OVER'){
    return(
      <div className="mobile-container">
        <div className="mobile-card">
          <h1>🏁 Fin del Juego</h1>
          <p>Mira la pantalla grande para ver el podio.</p>
          <div className="score-badge" style={{fontSize: '2rem', margin: '20px auto'}}>
            {scoreGroup} pts
          </div>
          <button className="btn-login" onClick={exitGame} style={{background: '#666'}}>
            Salir
          </button>
        </div>
      </div>
    )
  }

  // VISTA: LOGIN / ENTRADA
  if (!inside) {
    return (
      <div className="mobile-container">
         <div className="mobile-card">
            <h1 style={{color: 'var(--primary-blue)'}}>¡Bienvenido! 👋</h1>
            <p>Ingresa el nombre de tu equipo</p>
            <input 
              className="mobile-input"
              placeholder="Ej: Los Invencibles"
              value={nameGroup} 
              onChange={(e) => setNameGroup(e.target.value)} 
            />
            <button className="btn-login" onClick={enterGame}> 
              ¡A Jugar! 🚀 
            </button>
            
            <div className="status-footer">
               Estado: <span style={{ color: isConnected ? 'green' : 'red', fontWeight: 'bold' }}>
                  {isConnected ? 'Conectado' : 'Desconectado'}
               </span>
            </div>
         </div>
      </div>
    );
  }

  // VISTA: DENTRO DEL JUEGO
  return (
    <div className="mobile-container" style={{justifyContent: 'flex-start'}}>
      
      {/* HEADER FIJO */}
      <div className="app-header">
         <span className="player-info">👤 {nameGroup}</span>
         <span className="score-badge">{scoreGroup} pts</span>
      </div>
      <div className="header-spacer"></div> {/* Empuja el contenido abajo */}

      {/* CONTENIDO CAMBIANTE */}
      {gameState === 'LOBBY' ? (
         <div style={{marginTop: '50px'}}>
            <div className="pulse-text">⏳</div>
            <h2>Esperando al Host...</h2>
            <p>¡Prepárate, va a empezar!</p>
            <div className="status-footer">Mira la pantalla grande</div>
         </div>
      ) : (
         // ZONA DE PREGUNTAS
         <div style={{width: '100%', maxWidth: '500px'}}>
            {optionsAnswers?.options ? (
               <div>
                  <h3 style={{marginBottom: '20px'}}>Elige una opción:</h3>
                  <div className="game-grid">
                    {optionsAnswers.options.map((answer, i) => (
                      <button
                        key={i} 
                        disabled={hasAnswered && answerStatus === null} // Bloquea al pulsar
                        onClick={() => submitAnswer(i)}
                        className={`game-btn ${getButtonClass(i)}`} // <--- AQUÍ APLICAMOS LA CLASE
                      >
                        {answer}
                      </button>
                    ))}
                  </div>
                  
                  {hasAnswered && answerStatus === null && (
                     <p className="pulse-text" style={{fontSize: '1rem', color: '#888'}}>
                        Respuesta enviada... Esperando resultado 🤞
                     </p>
                  )}
               </div>
            ) : (
               <div className="pulse-text">Cargando preguntas... 🔄</div>
            )}
         </div>
      )}
    </div>
  );
}

export default App;