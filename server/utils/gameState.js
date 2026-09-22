// Variables globales del juego
const SERVER_RUN_ID = Date.now();
let GAME_SESSION_ID = Date.now();
let questions = [];
const players = {};
const playerTimeouts = {};
let gameState = 'LOBBY';
let currentQuestionIndex = 0;
let firstCorrectAnswer = null;
let timerInterval = null;
let remainingTime = 0;

// Getters
const getServerRunId = () => {
    return SERVER_RUN_ID;
}

const getGameSessionId = () => {
    return GAME_SESSION_ID;
}

const getQuestions = () => {
    return questions;
}

const getPlayers = () => {
    return players;
}

const getPlayerTimeouts = () => {
    return playerTimeouts;
}

const getGameState = () => {
    return gameState;
}

const getCurrentQuestionIndex = () => {
    return currentQuestionIndex;
}

// La pregunta que está en pantalla. currentQuestionIndex apunta a la siguiente,
// porque sendNextQuestion lo incrementa después de enviarla: ese "- 1" estaba
// repetido en cada handler y es fácil de leer al revés.
// Devuelve null en el lobby, cuando todavía no se envió ninguna, y también si
// el índice quedó fuera de rango.
const getCurrentQuestion = () => {
    return questions[currentQuestionIndex - 1] || null;
}

const getFirstCorrectAnswer = () => {
    return firstCorrectAnswer;
}

const getTimerInterval = () => {
    return timerInterval;
}

const getRemainingTime = () => {
    return remainingTime;
}

// Setters
const setGameSessionId = (id) => {
    GAME_SESSION_ID = id;
}

const setQuestions = (newQuestions) => {
    questions = newQuestions;
}

const setGameState = (state) => {
    gameState = state;
}

const setCurrentQuestionIndex = (index) => {
    currentQuestionIndex = index;
}

const setFirstCorrectAnswer = (answer) => {
    firstCorrectAnswer = answer;
}

const setTimerInterval = (interval) => {
    timerInterval = interval;
}

const setRemainingTime = (time) => {
    remainingTime = time;
}

// Funciones de utilidad

// Vuelve la partida al lobby con una sesión nueva: sin pregunta en curso, sin
// temporizador y sin desconexiones pendientes. Los jugadores en memoria no se
// tocan: qué pasa con ellos depende de la opción de reinicio (adminHandlers).
const resetGame = () => {
    GAME_SESSION_ID = Date.now();

    // Limpiar timeouts
    for (const key in playerTimeouts) {
        clearTimeout(playerTimeouts[key]);
        delete playerTimeouts[key];
    }

    gameState = 'LOBBY';
    currentQuestionIndex = 0;
    firstCorrectAnswer = null;
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    remainingTime = 0;
}

module.exports = {
    // Getters
    getServerRunId,
    getGameSessionId,
    getQuestions,
    getPlayers,
    getPlayerTimeouts,
    getGameState,
    getCurrentQuestionIndex,
    getCurrentQuestion,
    getFirstCorrectAnswer,
    getTimerInterval,
    getRemainingTime,
    
    // Setters
    setGameSessionId,
    setQuestions,
    setGameState,
    setCurrentQuestionIndex,
    setFirstCorrectAnswer,
    setTimerInterval,
    setRemainingTime,
    
    // Utilidades
    resetGame,
    
    // Exportar referencias directas (para modificación)
    players,
    playerTimeouts
};