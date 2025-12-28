import { useEffect, useState } from 'react';
import io from 'socket.io-client';

// Conectar Backend
const socket = io('http://192.168.1.42:3000');

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [inside, setInside] = useState(false);
  const [nameGroup, setNameGroup] = useState("");
  const [gameState, setGameState] = useState("LOBBY");
  const [optionsAnswers, setOptionsAnswers] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerStatus, setAnswerStatus] = useState(null);
  const [myAnswer, setMyAnswer] = useState(null);       
  const [correctAnswer, setCorrectAnswer] = useState(null);
  const [scoreGroup, setScoreGroup] = useState(0)

  useEffect(() => {
    // Escuchar eventos de conexión del socket
    socket.on('connect', () => {
      setIsConnected(true);
      console.log("Conectado al servidor con ID:", socket.id);
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
    })

    socket.on('answer_result', (data) => {
      if(data.correct){
        setAnswerStatus('CORRECT')
      }else{
        setAnswerStatus('INCORRECT')
      }
      setCorrectAnswer(data.correctIndex)
    })

    socket.on('update_players', (data) =>{
        const myData = data.find(player => player.id === socket.id)
            if(myData){
                setScoreGroup(myData.score)
            }
        })

    // Limpieza al cerrar el componente
    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('game_state');
      socket.off('new_question');
      socket.off('update_players')
    };
  }, []);

  function enterGame(){
    
    socket.emit('join_game', { name: nameGroup })
    setInside(true);
  }

  function submitAnswer(i){
    socket.emit('submit_answer', { answer: i })
    setHasAnswered(true);
    setMyAnswer(i);
  } 

  const getButtonColor = (index) => {
    // 1. Si no hemos respondido, color normal (azul/gris)
    if (answerStatus === null) return 'blue'; 

    // 2. Si este botón es el CORRECTO, siempre verde
    if (index === correctAnswer) return 'green';

    // 3. Si este botón es el que yo toqué Y fallé, rojo
    if (index === myAnswer && answerStatus === 'INCORRECT') return 'red';

    // 4. El resto de botones se quedan grises o normales
    return 'gray';
  }

  if(gameState === 'GAME_OVER'){
    return(
      <div >
        <h1>¡Juego Terminado! 🏁</h1>
        <p>Mira la pantalla grande para ver al ganador.</p>
        <h3>Tu puntaje final: {scoreGroup}</h3>
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