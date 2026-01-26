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
const resetGame = () => {
    GAME_SESSION_ID = Date.now();
    
    // Limpiar timeouts
    for (const key in playerTimeouts) {
        clearTimeout(playerTimeouts[key]);
        delete playerTimeouts[key];
    }
    
    // Vaciar players
    for (const key in players) {
        delete players[key];
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