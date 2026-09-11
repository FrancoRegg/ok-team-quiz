const gameState = require('../utils/gameState');

const {
    getGameState,
    getCurrentQuestionIndex,
    getQuestions,
    getTimerInterval,
    getRemainingTime,
    setGameState,
    setRemainingTime,
    setTimerInterval,
    players
} = gameState;

const registerGameHandlers = (io, socket, sendNextQuestion) => {

    // --- NEXT QUESTION --- 
    socket.on('next_question', async () => {
        try{
            console.log('➡️ Evento next_question recibido (avance manual)');
            await sendNextQuestion(io);
        } catch (error){
            console.error('❌ Error en next_question:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al avanzar pregunta'
            });
        }
    });


    // --- ACTIVATE ANSWERS ---
    socket.on('activate_answers', () => {
        try{
        console.log('🟢 Activando respuestas...');
        
        if (getGameState() !== 'QUESTION_LOCKED') {
            console.log('⚠️ Intento de activar respuestas en estado:', getGameState());
            return;
        }
        
        setGameState('QUESTION_ACTIVE');
        
        // Enviar la pregunta a TODOS los jugadores
        const currentQ = getQuestions()[getCurrentQuestionIndex() - 1];
        if (currentQ) {
            const questionToSend = {
                title: currentQ.title,
                options: currentQ.options,
                type: currentQ.type,
                mediaUrl: currentQ.mediaUrl
            };
            
            io.to('game_room').emit('new_question', questionToSend);
            
            // Iniciar timer
            setRemainingTime(currentQ.timeLimit || 10);
            
            // Emitir tiempo inicial a todos
            io.to('game_room').emit('timer_update', { remainingTime: getRemainingTime() });
            
            // Iniciar cuenta regresiva
            if (getTimerInterval()) {
                clearInterval(getTimerInterval());
            }
            
            const interval = setInterval(() => {
                setRemainingTime(getRemainingTime() - 1);
                
                // Emitir actualización a todos
                io.to('game_room').emit('timer_update', { remainingTime: getRemainingTime() });
                
                // Si llega a 0
                if (getRemainingTime() <= 0) {
                    clearInterval(interval);
                    setTimerInterval(null);
                    
                    console.log('⏰ Tiempo agotado!');
                    
                    // Asignar 0 puntos a quien no respondió
                    for (const id in players) {
                        if (players[id].name !== 'HOST' && !players[id].hasAnswered) {
                            console.log(`⏱️ ${players[id].name} no respondió a tiempo`);
                        }
                    }
                    
                    // Emitir que se acabó el tiempo
                    io.to('game_room').emit('timer_finished');
                }
            }, 1000);
            
            setTimerInterval(interval);
        }
        
        // Notificar cambio de estado
        io.to('game_room').emit('game_state', getGameState())
        
        console.log(`✅ Respuestas activadas con timer de ${getRemainingTime()}s`);
        } catch (error){
            console.error('❌ Error en activate_answers:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al activar respuestas'
            });
        }
    });

    // --- SHOW ANSWER ---
    socket.on('show_answer', () => {
        try{
            console.log('📺 Mostrando respuesta correcta...');

            if (getTimerInterval()) {
                clearInterval(getTimerInterval());
                setTimerInterval(null);
                console.log('⏰ Timer cancelado al mostrar respuesta');
            }
            
            if (getGameState() !== 'QUESTION_ACTIVE') {
                console.log('⚠️ Intento de mostrar respuesta en estado:', getGameState());
                return;
            }
            
            setGameState('SHOW_ANSWER');
            
            const currentQ = getQuestions()[getCurrentQuestionIndex() - 1];
            
            if (currentQ) {
                // Va a toda la sala: el HOST la muestra en el proyector y
                // cada jugador la ve en su móvil (solo la respuesta, sin la pregunta)
                io.to('game_room').emit('show_correct_answer', {
                    correctIndex: currentQ.correctIndex,
                    correctOption: currentQ.options[currentQ.correctIndex]
                });
            }
            
            io.to('game_room').emit('game_state', getGameState());
            console.log('✅ Respuesta correcta mostrada');
        } catch (error){
            console.error('❌ Error en show_answer:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al mostrar respuesta'
            });
        }
    });
}

module.exports = {registerGameHandlers};