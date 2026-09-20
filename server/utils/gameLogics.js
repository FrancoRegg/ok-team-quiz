const Question = require('../models/Questions');
const gameState = require('./gameState');

const {
    getCurrentQuestionIndex,
    getCurrentQuestion,
    getQuestions,
    getGameState,
    setQuestions,
    setGameState,
    setCurrentQuestionIndex,
    setFirstCorrectAnswer,
    players
} = gameState;

// --- Cargar preguntas al inicio ---
const loadQuestions = async() => {
    try {
        const questionsFromDB = await Question.findAll();
        const loadedQuestions = questionsFromDB.map(q => q.toJSON());
        setQuestions(loadedQuestions);
        console.log(`✅ ${loadedQuestions.length} preguntas cargadas.`);
    } catch (error) {
        console.error("❌ Error al cargar preguntas:", error);
    }
}

// --- ENVIAR SIGUIENTE PREGUNTA ---
const sendNextQuestion = async (io) => {
    
    // Si es la primera pregunta, recaga desde BD
    if (getCurrentQuestionIndex() === 0) {
        await loadQuestions();
        console.log("🔄 Preguntas recargadas desde BD");
    

        // Validar que haya preguntas
        if (getQuestions().length === 0) {
            console.log('⚠️ No hay preguntas cargadas en BD');

            // Buscar socket del HOST para enviarle el error
            const hostSocket = Object.keys(players).find(id => players[id].name === 'HOST');
            
            if (hostSocket) {
                io.to(hostSocket).emit('error_message', {
                    message: 'No hay preguntas cargadas. Crea preguntas desde el panel de administración primero.'
                });
            } else {
                console.log('❌ HOST no encontrado en players');
            }
            return;
        }
    }

    // Si se acabaron las preguntas
    if (getCurrentQuestionIndex() >= getQuestions().length){
        console.log('⚠️ No hay más preguntas. GAME_OVER');
        setGameState('GAME_OVER');
        
        io.to('game_room').emit('game_state', getGameState());  
        io.to('game_room').emit('update_players', Object.values(players));
        return;
    }

    // Preparar nueva pregunta con estado bloqueado
    setGameState("QUESTION_LOCKED");

    // Avanzamos primero: desde acá la pregunta en juego es getCurrentQuestion()
    setCurrentQuestionIndex(getCurrentQuestionIndex() + 1);

    const fullQuestion = getCurrentQuestion();

    const questionToSend = {
        title: fullQuestion.title,
        options: fullQuestion.options,
        type: fullQuestion.type,      
        mediaUrl: fullQuestion.mediaUrl
    }

    // Resetear estado de respuesta de los jugadores
    for(const id in players){
        players[id].hasAnswered = false;
    };

    setFirstCorrectAnswer(null);

    // Enviar a todos
    io.to('game_room').emit('game_state', getGameState());

    // Envia la pregunta solo al HOST
    const hostSocket = Object.keys(players).find(id => players[id].name === 'HOST');
    if (hostSocket) {
        io.to(hostSocket).emit('new_question', questionToSend);
        console.log('   ✅ Pregunta enviada al HOST');
    } else {
        console.log('   ❌ HOST no encontrado');
    }
};

module.exports = {
    loadQuestions, 
    sendNextQuestion
}