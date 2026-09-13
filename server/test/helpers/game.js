// Utilidades para dejar el estado de la partida en una situación conocida.
//
// El estado del juego vive en variables de módulo (utils/gameState.js), así
// que persiste entre tests del mismo archivo si no se limpia.

const gameState = require('../../utils/gameState');

const QUESTIONS = [
    {
        id: 'q1',
        title: '¿Cuál es el planeta más grande del sistema solar?',
        type: 'TEXT',
        mediaUrl: null,
        options: ['Tierra', 'Marte', 'Júpiter', 'Saturno'],
        correctIndex: 2,
        timeLimit: 15,
    },
    {
        id: 'q2',
        title: '¿Cuántas patas tiene una araña?',
        type: 'IMAGE',
        mediaUrl: 'https://example.com/arana.jpg',
        options: ['6', '8'],
        correctIndex: 1,
        timeLimit: 20,
    },
];

// Partida en el lobby, sin jugadores ni timers, con las preguntas de ejemplo
const resetGameState = (questions = QUESTIONS) => {
    gameState.resetGame();
    gameState.setQuestions(questions.map((q) => ({ ...q, options: [...q.options] })));
};

// Agrega un jugador directamente a la memoria, sin pasar por join_game
const addPlayer = (socketId, { name, score = 0, dbId = `db-${socketId}`, hasAnswered = false } = {}) => {
    const player = name === 'HOST'
        ? { name, score: 0, id: socketId, hasAnswered: false }
        : { name, score, id: socketId, dbId, hasAnswered };
    gameState.players[socketId] = player;
    return player;
};

// Deja la partida con la pregunta `index` (base 0) en el estado indicado,
// como si el HOST hubiera avanzado hasta ahí
const putQuestionInState = (index, state) => {
    gameState.setCurrentQuestionIndex(index + 1);
    gameState.setGameState(state);
    gameState.setFirstCorrectAnswer(null);
};

module.exports = { QUESTIONS, resetGameState, addPlayer, putQuestionInState };
