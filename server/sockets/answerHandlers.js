const Player = require('../models/Players');
const gameState = require('../utils/gameState');

const {
    getGameState,
    getCurrentQuestion,
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

            const questionInPlay = getCurrentQuestion();

            if(!questionInPlay){
                throw new Error('No hay pregunta activa');
            }

            // Calcular puntaje
            const isCorrect = data.answer === questionInPlay.correctIndex;

            // Quedan marcados antes de guardar: así un doble toque no suma dos
            // veces y nadie más se queda con el bonus mientras escribimos.
            player.hasAnswered = true;

            const isFirstCorrect = isCorrect && getFirstCorrectAnswer() === null;
            if (isFirstCorrect) {
                setFirstCorrectAnswer(socket.id);
            }

            const points = isCorrect ? (isFirstCorrect ? 100 : 90) : 0;
            const newScore = player.score + points;

            // El puntaje en memoria sube solo si quedó guardado en la base. Si el
            // guardado falla, deshacemos la marca y el bonus: el jugador puede
            // volver a responder y el proyector no muestra puntos inexistentes.
            if (player.dbId) {
                try {
                    await Player.update(
                        { score: newScore },
                        { where: { id: player.dbId } }
                    );
                } catch (error) {
                    player.hasAnswered = false;
                    if (isFirstCorrect) {
                        setFirstCorrectAnswer(null);
                    }

                    console.error(`❌ No se pudo guardar el puntaje de ${player.name}:`, error.message);
                    socket.emit('error', {
                        message: 'No pudimos registrar tu respuesta. Intenta de nuevo.'
                    });
                    return;
                }
            }

            player.score = newScore;

            if (isCorrect) {
                console.log(isFirstCorrect
                    ? `🥇 ${player.name} respondió primero: +100 puntos`
                    : `✅ ${player.name} respondió correcto: +90 puntos`);
            }

            // El jugador no recibe si acertó: la respuesta correcta se revela
            // para todos a la vez cuando el HOST la muestra (show_correct_answer).

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

