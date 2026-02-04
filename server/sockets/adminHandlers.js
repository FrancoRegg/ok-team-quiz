const Player = require('../models/Players');
const gameState = require('../utils/gameState');

const {
    getTimerInterval,
    setGameSessionId,
    setGameState,
    setCurrentQuestionIndex,
    setFirstCorrectAnswer,
    setTimerInterval,
    setRemainingTime,
    getGameState,
    players,
    playerTimeouts
} = gameState;

const registerAdminHandlers = (io, socket, loadQuestions) => {

    // --- RESET GAME ---
    socket.on('reset_game', async (data) => { 
        try{
        const cleanPlayers = data?.cleanPlayers || false;
        
        console.log(`🧹 Reiniciando juego - Limpiar jugadores: ${cleanPlayers}`);
        
        setGameSessionId(Date.now());

        // Limpiar todos los timeouts pendientes
        for (const key in playerTimeouts){
            clearTimeout(playerTimeouts[key]);
            delete playerTimeouts[key];
        }

        if (cleanPlayers) {
            // Borrar todos los jugadores de BD
            await Player.destroy({ where: {} });
            console.log('🧹 Jugadores eliminados de BD');
        } else {
            // Solo marcar como desconectados
            await Player.update(
                { isConnected: false },
                { where: {} }
            );
            console.log('🔄 Jugadores mantenidos en BD (marcados como desconectados)');
        }

        // Vaciamos players de memoria
        for (const key in players) {
            if (players[key].name !== 'HOST'){
                delete players[key];
            }
        }

        // Reiniciamos variables
        setGameState("LOBBY");
        
        setCurrentQuestionIndex(0);
        
        setFirstCorrectAnswer(null);

        // Limpiar timer
        if (getTimerInterval()) {
            clearInterval(getTimerInterval());
            setTimerInterval(null);
        }
        
        setRemainingTime(0);

        await loadQuestions();
        console.log("🔄 Preguntas recargadas");

        // Avisamos a todos
        io.emit('game_state', getGameState());
        io.emit('update_players', []); 
        
        if (cleanPlayers) {
            console.log('📢 Emitiendo force_refresh (limpiar todo)');
            io.emit('force_refresh');
        } else {
            console.log('ℹ️ No se emite force_refresh (mantener jugadores)');
            // Los jugadores recibirán game_state y volverán al lobby automáticamente
        } 

        } catch (error){
            console.error('❌ Error en reset_game:', error.message);
            io.to('game_room').emit('error', { 
                message: 'Error al reiniciar el juego' 
            });
        }
    });
};

module.exports = {registerAdminHandlers}