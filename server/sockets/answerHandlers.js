const Player = require('../models/Players');
const gameState = require('../utils/gameState');

const {
    getGameState,
    getCurrentQuestionIndex,
    getQuestions,
    getFirstCorrectAnswer,
    getTimerInterval,
    setFirstCorrectAnswer,
    setTimerInterval,
    setRemainingTime,
    players
} = gameState;

const registerAnswerHandlers = (io, socket) => {

    // --- SUBMIT ANSWER ---
    socket.on('submit_answer', async (data) => {
        try{
            // Validacion de datos
            if(!data || data.answer === undefined){
                throw new Error('Respuesta no proporcionada.')
            }

            const player = players[socket.id]

            if (!player){
                console.log('⚠️ Intento de respuesta de jugador no registrado');
                return;
            }  

            if (getGameState() !== 'QUESTION_ACTIVE') {
                console.log(`⚠️ ${player.name} intentó responder pero el estado es: ${getGameState()}`);
                socket.emit('error', { 
                    message: 'Las respuestas aún no están activadas'
                });
                return;
            }

            if(player.hasAnswered){
                console.log(`⚠️ ${player.name} ya respondió esta pregunta`);
                return;
            }

            player.hasAnswered = true;
            const questionInPlay = getQuestions()[getCurrentQuestionIndex() - 1]; 

            if(!questionInPlay){
                throw new Error('No hay pregunta activa');
            }

            // Calcular puntaje
            const isCorrect = data.answer === questionInPlay.correctIndex;

            // Si responde correcto primero
            if (isCorrect) {
                if (getFirstCorrectAnswer() === null) {
                    setFirstCorrectAnswer(socket.id);
                    player.score += 100;
                    console.log(`🥇 ${player.name} respondió primero: +100 puntos`);
                } else {
                    // Respuestas correctas subsecuentes
                    player.score += 90;
                    console.log(`✅ ${player.name} respondió correcto: +90 puntos`);
                }
            }

            if (player.dbId) {
                await Player.update(
                    { score: player.score },
                    { where: { id: player.dbId } }
                );
            }

            const result = { 
                correct: isCorrect, 
                wasFirst: isCorrect && getFirstCorrectAnswer() === socket.id
            };

            if(isCorrect){
                result.correctIndex = questionInPlay.correctIndex;
            };

            // Enviar resultado individual
            //socket.emit('answer_result', result)
            
            // Actualizar Host
            io.to('game_room').emit('update_players', Object.values(players))

            // Cancelar timer cuando todos hayan respondido antes de acabar el tiempo.
            // La partida no avanza sola: la siguiente pregunta siempre la pide el HOST.
            const allPlayers = Object.values(players).filter(p => p.name !== 'HOST');
            const totalPlayers = allPlayers.length;
            const answersCount = allPlayers.filter(p => p.hasAnswered).length;

            if (totalPlayers > 0 && answersCount === totalPlayers) {
                console.log("✅ Todos respondieron. Cancelando timer...");
                
                // Cancelar el timer 
                if (getTimerInterval()) {
                    clearInterval(getTimerInterval());
                    setTimerInterval(null);
                    setRemainingTime(0);
                }
                
                setTimeout(() => {
                    // Notificar que el timer terminó
                    io.to('game_room').emit('timer_finished');
                    console.log("⏱️ Timer finished emitido después del delay");
                }, 1500);
            }
        } catch (error){
            console.error('❌ Error en submit_answer:', error.message);
            socket.emit('error', { 
                message: 'Error al procesar tu respuesta. Intenta de nuevo.' 
            });
        }
    })
};

module.exports = {registerAnswerHandlers};

