import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import './styles/App.css';

const socket = io('http://192.168.1.13:3000');

function App() {
  const [inside, setInside] = useState(() => !!localStorage.getItem("savedGroupName"));
  const [nameGroup, setNameGroup] = useState(() => localStorage.getItem("savedGroupName") || "");
  const [isConnected, setIsConnected] = useState(socket.connected);
  
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

    const onConnect = () => {
        setIsConnected(true);
    };

    const onDisconnect = () => setIsConnected(false);

    const onServerCheck = (data) => {
        const { serverId, gameId } = data;
        
        const incomingServerId = String(serverId);
        const incomingGameId = String(gameId);
        
        const storedServerId = localStorage.getItem("server_run_id");
        const storedGameId = localStorage.getItem("game_session_id");
        const storedName = localStorage.getItem("savedGroupName");

        if (storedServerId && storedServerId !== incomingServerId) {
            console.log("⛔ Servidor reiniciado. Limpiando...");
            localStorage.clear();
            localStorage.setItem("server_run_id", incomingServerId);
            localStorage.setItem("game_session_id", incomingGameId); 
            window.location.reload();
            return;
        }

        if (storedName) {
            if (!storedGameId || storedGameId !== incomingGameId) {
                console.log("⛔ Detectada sesión de partida anterior. Limpiando...");

                localStorage.clear();
                localStorage.setItem("server_run_id", incomingServerId);
                localStorage.setItem("game_session_id", incomingGameId);
                
                window.location.reload();
                return; 
            }
        }

        localStorage.setItem("server_run_id", incomingServerId);
        localStorage.setItem("game_session_id", incomingGameId);

        if (storedName) {
            console.log("✅ Sesión válida verificada. Reconectando:", storedName);
            socket.emit('join_game', { 
                name: storedName,
                gameId: incomingGameId 
            });
            setInside(true);
        }
      };
    const onForceRefresh = () => {
        localStorage.removeItem("savedGroupName");
        setInside(false);
        setNameGroup("");
        window.location.reload();
    };

    const onGameState = (state) => setGameState(state);
    
    const onNewQuestion = (answers) => {
        setOptionsAnswers(answers);
        setHasAnswered(false);
        setAnswerStatus(null);
        setMyAnswer(null);
        setCorrectAnswer(null);
        if (navigator.vibrate) navigator.vibrate(100);
    };

    const onAnswerResult = (data) => {
        setCorrectAnswer(data.correctIndex);
        if(data.correct){
            setAnswerStatus('CORRECT');
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        } else {
            setAnswerStatus('INCORRECT');
            if (navigator.vibrate) navigator.vibrate(400); 
        }
    };

    const onUpdatePlayers = (data) => {
        const myData = data.find(player => player.id === socket.id);
        if(myData){
            setScoreGroup(myData.score);
            if (myData.hasAnswered) setHasAnswered(true);
        }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('server_check', onServerCheck);
    socket.on('force_refresh', onForceRefresh);
    socket.on('game_state', onGameState);
    socket.on('new_question', onNewQuestion);
    socket.on('answer_result', onAnswerResult);
    socket.on('update_players', onUpdatePlayers);

    return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('server_check', onServerCheck);
        socket.off('force_refresh', onForceRefresh);
        socket.off('game_state', onGameState);
        socket.off('new_question', onNewQuestion);
        socket.off('answer_result', onAnswerResult);
        socket.off('update_players', onUpdatePlayers);
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

  const getButtonClass = (index) => {
    if (answerStatus === null && !hasAnswered) return 'active';
    if (answerStatus === null && hasAnswered) return index === myAnswer ? 'active' : 'disabled';
    if (index === correctAnswer) return 'correct';
    if (index === myAnswer && answerStatus === 'INCORRECT') return 'incorrect';
    return 'disabled';
  }

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

  return (
    <div className="mobile-container" style={{justifyContent: 'flex-start'}}>
      <div className="app-header">
         <span className="player-info">👤 {nameGroup}</span>
         <span className="score-badge">{scoreGroup} pts</span>
      </div>
      <div className="header-spacer"></div>

      {gameState === 'LOBBY' ? (
         <div style={{marginTop: '50px'}}>
            <div className="pulse-text">⏳</div>
            <h2>Esperando al Host...</h2>
            <p>¡Prepárate, va a empezar!</p>
            <div className="status-footer">Mira la pantalla grande</div>
         </div>
      ) : (
         <div style={{width: '100%', maxWidth: '500px'}}>
            {optionsAnswers?.options ? (
               <div>
                  <h3 style={{marginBottom: '20px'}}>Elige una opción:</h3>
                  <div className="game-grid">
                    {optionsAnswers.options.map((answer, i) => (
                      <button
                        key={i} 
                        disabled={hasAnswered && answerStatus === null}
                        onClick={() => submitAnswer(i)}
                        className={`game-btn ${getButtonClass(i)}`}
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