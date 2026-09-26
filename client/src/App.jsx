import { useCallback, useState } from 'react';

import { useSocket } from './hooks/useSocket';
import { useGameSession } from './hooks/useGameSession';
import { useGameSocket } from './hooks/useGameSocket';
import { useWakeLock } from './hooks/useWakeLock';

import AnswerRevealScreen from './components/screens/AnswerRevealScreen';
import GameOverScreen from './components/screens/GameOverScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import LoginScreen from './components/screens/LoginScreen';
import QuestionScreen from './components/screens/QuestionScreen';
import WaitingScreen from './components/screens/WaitingScreen';
import ReconnectingScreen from './components/screens/ReconnectingScreen';
import WakeLockBadge from './components/common/WakeLockBadge';
import ServerNotice from './components/common/ServerNotice';

import './styles/App.css';

function App() {
  const { socket, isConnected } = useSocket();

  // Estados
  const [inside, setInside] = useState(false);
  const [nameGroup, setNameGroup] = useState("");
  const [gameState, setGameState] = useState("LOBBY");
  const [optionsAnswers, setOptionsAnswers] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [myAnswer, setMyAnswer] = useState(null);
  const [correctOption, setCorrectOption] = useState(null);
  const [scoreGroup, setScoreGroup] = useState(0);
  const [timer, setTimer] = useState(null);
  const [isValidating, setIsValidating] = useState(true); 
  const [notice, setNotice] = useState(null);

  // Estable: ServerNotice lo usa dentro de un efecto para cerrarse solo
  const dismissNotice = useCallback(() => setNotice(null), []);

  // El server rechazó la entrada (nombre en uso): volver al login. El nombre
  // guardado se borra para que la reconexión automática no lo reintente sola
  const handleJoinRejected = useCallback(() => {
    localStorage.removeItem("savedGroupName");
    setInside(false);
    setNameGroup("");
  }, []);

  // Mantiene la pantalla encendida mientras el jugador esta en la partida.
  // Va atado a 'inside' para que tambien cubra las reconexiones automaticas.
  const wakeLockStatus = useWakeLock(inside);

  // Hooks personalizados
  useGameSession(socket, setInside, setNameGroup, setIsValidating);
  
  useGameSocket(socket, {
    setGameState,
    setOptionsAnswers,
    setHasAnswered,
    setMyAnswer,
    setCorrectOption,
    setScoreGroup,
    setTimer,
    setNotice,
    onJoinRejected: handleJoinRejected
  });

  // Funciones
  const enterGame = () => {
    if (!nameGroup.trim()) { 
      alert("Escribe un nombre"); 
      return; 
    }

    // Validar que el socket existe y está conectado
    if (!socket || !isConnected) {
      alert("Conectando al servidor. Intenta de nuevo en un momento...");
      console.error('❌ Socket no conectado al intentar unirse');
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
  }

  const exitGame = () => {
    localStorage.removeItem("savedGroupName");
    setInside(false);
    setNameGroup("");
    window.location.reload(); 
  }

  const submitAnswer = (i) => {
    // Validar socket antes de emitir
    if (!socket || !isConnected) {
      alert('Sin conexión. Tu respuesta no se envió.');
      return;
    }

    socket.emit('submit_answer', { answer: i });
    setHasAnswered(true);
    setMyAnswer(i);
  }

  // Renderizado condicional
  const renderScreen = () => {
    if (isValidating) {
      return <ReconnectingScreen />;
    }

    if (gameState === 'GAME_OVER') {
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

    if (gameState === 'QUESTION_LOCKED') {
      return <WaitingScreen playerName={nameGroup} score={scoreGroup} />;
    }

    if (gameState === 'LOBBY') {
      return <LobbyScreen playerName={nameGroup} score={scoreGroup} />;
    }

    if (gameState === 'SHOW_ANSWER') {
      return (
        <AnswerRevealScreen
          playerName={nameGroup}
          score={scoreGroup}
          correctOption={correctOption}
        />
      );
    }

    if (gameState === 'QUESTION_ACTIVE') {
      return (
        <QuestionScreen 
          playerName={nameGroup}
          score={scoreGroup}
          timer={timer}
          optionsAnswers={optionsAnswers}
          hasAnswered={hasAnswered}
          myAnswer={myAnswer}
          onSubmitAnswer={submitAnswer}
        />
      );
    }

    // Fallback
    return (
      <div className="mobile-container">
        <div className="pulse-indicator"></div>
      </div>

    );
  };

  return (
    <>
      <ServerNotice message={notice} onClose={dismissNotice} />
      {renderScreen()}
      {/* Indicador de prueba del wake lock: solo en desarrollo */}
      {import.meta.env.DEV && <WakeLockBadge status={wakeLockStatus} />}
    </>
  );
}

export default App;