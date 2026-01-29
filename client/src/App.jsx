import { useEffect, useState, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import GameOverScreen from './components/screens/GameOverScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import LoginScreen from './components/screens/LoginScreen';
import QuestionScreen from './components/screens/QuestionScreen';
import WaitingScreen from './components/screens/WaitingScreen';
import './styles/App.css';

function App() {
  const {socket, isConnected} = useSocket();

  const [inside, setInside] = useState(() => !!localStorage.getItem("savedGroupName"));
  const [nameGroup, setNameGroup] = useState(() => localStorage.getItem("savedGroupName") || "");

  const [gameState, setGameState] = useState("LOBBY");
  const [optionsAnswers, setOptionsAnswers] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);       
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scoreGroup, setScoreGroup] = useState(0);
  const [timer, setTimer] = useState(null);

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

  const releaseWakeLock = async () => {
    try {
      if (wakeLockRef.current) {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {
      console.log('Error releasing WakeLock:', err);
    }
  };

  useEffect(() => {
    if (!socket) {
      console.log('⏳ App: Esperando socket...');
      return;
    }

    console.log('✅ App: Socket disponible');

    if (inside) requestWakeLock();

    const onServerCheck = (data) => {
      const { serverId, gameId } = data;
    
      console.log("🔔 server_check recibido:", { serverId, gameId });
      
      const incomingServerId = String(serverId);
      const incomingGameId = String(gameId);
      
      const storedServerId = localStorage.getItem("server_run_id");
      const storedGameId = localStorage.getItem("game_session_id");
      const storedName = localStorage.getItem("savedGroupName");

      // Primera vez que se conecta
      if (!storedServerId || !storedGameId) {
        console.log("📝 Primera conexión, guardando IDs...");
        localStorage.setItem("server_run_id", incomingServerId);
        localStorage.setItem("game_session_id", incomingGameId);
        return;
      }

      // El servidor se reinició
      if (storedServerId !== incomingServerId) {
        console.log("🔄 Servidor reiniciado, actualizando IDs...");
        localStorage.setItem("server_run_id", incomingServerId);
        localStorage.setItem("game_session_id", incomingGameId);
        
        if (storedName) {
            console.log("🧹 Limpiando nombre guardado (servidor reiniciado)");
            localStorage.removeItem("savedGroupName");
            setInside(false);
            setNameGroup("");
            alert("El servidor se reinició. Por favor, vuelve a unirte.");
        }
        return;
      }

      // La partida se reseteó
      if (storedGameId !== incomingGameId) {
          console.log("🎮 Partida reseteada (gameId cambió)");
          console.log("   - Guardado:", storedGameId);
          console.log("   - Recibido:", incomingGameId);
          
          localStorage.setItem("game_session_id", incomingGameId);
          
          if (storedName) {
              console.log("🧹 Limpiando nombre guardado (partida reseteada)");
              localStorage.removeItem("savedGroupName");
              setInside(false);
              setNameGroup("");
              alert("La partida se reinició. Por favor, vuelve a unirte.");
          }
          return;
      }

      // Reconexión normal
      if (storedName) {
          console.log("🔄 Reconectando con gameId guardado:", storedGameId);
          socket.emit('join_game', { 
              name: storedName,
              gameId: storedGameId
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

    const onTimerUpdate = (data) => {
        setTimer(data.remainingTime);
    };

    const onTimerFinished = () => {
        setTimer(0);
    };

    const onAnswerResult = (data) => {
      if (data.correctIndex !== undefined) {
        setCorrectAnswer(data.correctIndex);
      }
    
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

    const onSessionExpired = (data) => {
      console.log('⛔ Sesión expirada:', data.message);
      
      if (data.currentGameId) {
        localStorage.setItem("game_session_id", String(data.currentGameId));
      }
      
      localStorage.removeItem("savedGroupName");
      
      setInside(false);
      setNameGroup("");
      
      alert(data.message || 'La partida se reinició. Debes volver a unirte.');
    };

    socket.on('server_check', onServerCheck);
    socket.on('force_refresh', onForceRefresh);
    socket.on('game_state', onGameState);
    socket.on('new_question', onNewQuestion);
    socket.on('answer_result', onAnswerResult);
    socket.on('update_players', onUpdatePlayers);
    socket.on('session_expired', onSessionExpired);
    socket.on('timer_update', onTimerUpdate); 
    socket.on('timer_finished', onTimerFinished);

    return () => {
      releaseWakeLock();
      if(socket) {
        socket.off('server_check', onServerCheck);
        socket.off('force_refresh', onForceRefresh);
        socket.off('game_state', onGameState);
        socket.off('new_question', onNewQuestion);
        socket.off('answer_result', onAnswerResult);
        socket.off('update_players', onUpdatePlayers);
        socket.off('session_expired', onSessionExpired);
        socket.off('timer_update', onTimerUpdate); 
        socket.off('timer_finished', onTimerFinished);
      }
    };
  }, [inside, socket]); 

  // --- FUNCIONES ---
  function enterGame(){
    if(!nameGroup.trim()) { 
      alert("Escribe un nombre"); 
      return; 
    }
    const currentGameId = localStorage.getItem("game_session_id");
    console.log("🎟️ Intentando unirse con:");
    console.log("  - Nombre:", nameGroup);
    console.log("  - GameId:", currentGameId);
    
    localStorage.setItem("savedGroupName", nameGroup);
    
    socket.emit('join_game', { 
      name: nameGroup,
      gameId: currentGameId  
    });
    
    setInside(true);
    requestWakeLock(); 
  }

  function exitGame() {
    releaseWakeLock();
    localStorage.removeItem("savedGroupName");
    setInside(false);
    setNameGroup("");
    window.location.reload(); 
  }

  function submitAnswer(i){
    socket.emit('submit_answer', { answer: i });
    setHasAnswered(true);
    setMyAnswer(i);
  } 

  // --- RENDERIZADO CONDICIONAL ---
  
  if(gameState === 'GAME_OVER'){
    return <GameOverScreen score={scoreGroup} onExitGame={exitGame} />;
  }

  if (!inside) {
    return (
      <LoginScreen 
        nameGroup={nameGroup}
        setNameGroup={setNameGroup}
        onEnterGame={enterGame}
        isConnected={isConnected}
      />
    );
  }

  if(gameState === 'QUESTION_LOCKED'){
    return <WaitingScreen playerName={nameGroup} score={scoreGroup} />;
  }

  if(gameState === 'LOBBY'){
    return <LobbyScreen playerName={nameGroup} score={scoreGroup} />;
  }

  if(gameState === 'QUESTION_ACTIVE'){
    return (
      <QuestionScreen 
        playerName={nameGroup}
        score={scoreGroup}
        timer={timer}
        optionsAnswers={optionsAnswers}
        hasAnswered={hasAnswered}
        answerStatus={answerStatus}
        myAnswer={myAnswer}
        correctAnswer={correctAnswer}
        onSubmitAnswer={submitAnswer}
      />
    );
  }

  // Fallback
  return (
    <div className="mobile-container">
      <div className="pulse-text">Cargando...</div>
    </div>
  );
}

export default App;