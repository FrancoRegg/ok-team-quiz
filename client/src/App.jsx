import { useState } from 'react';

import { useSocket } from './hooks/useSocket';
import { useGameSession } from './hooks/useGameSession';
import { useGameSocket } from './hooks/useGameSocket';
import { useWakeLock } from './hooks/useWakeLock';

import GameOverScreen from './components/screens/GameOverScreen';
import LobbyScreen from './components/screens/LobbyScreen';
import LoginScreen from './components/screens/LoginScreen';
import QuestionScreen from './components/screens/QuestionScreen';
import WaitingScreen from './components/screens/WaitingScreen';

import './styles/App.css';

function App() {
  const { socket, isConnected } = useSocket();
  const { requestWakeLock, releaseWakeLock } = useWakeLock();

  // Estados
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

  // Hooks personalizados
  useGameSession(socket, setInside, setNameGroup);
  
  useGameSocket(socket, {
    setGameState,
    setOptionsAnswers,
    setHasAnswered,
    setAnswerStatus,
    setMyAnswer,
    setCorrectAnswer,
    setScoreGroup,
    setTimer
  });

  // Funciones
  const enterGame = () => {
    if (!nameGroup.trim()) { 
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

  const exitGame = () => {
    releaseWakeLock();
    localStorage.removeItem("savedGroupName");
    setInside(false);
    setNameGroup("");
    window.location.reload(); 
  }

  const submitAnswer = (i) => {
    socket.emit('submit_answer', { answer: i });
    setHasAnswered(true);
    setMyAnswer(i);
  }

  // Renderizado condicional
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

  if (gameState === 'QUESTION_ACTIVE') {
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