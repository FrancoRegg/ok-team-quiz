const Player = require('../models/Players');
const gameState = require('../utils/gameState');
const { isGameController, rejectUnauthorized } = require('./authorization');

const {
    resetGame,
    getGameState,
    players
} = gameState;

const registerAdminHandlers = (io, socket, loadQuestions) => {

    // --- RESET GAME ---
    socket.on('reset_game', async (data) => {
        try{
            if (!isGameController(socket)) {
                return rejectUnauthorized(socket, 'reset_game');
            }

            const cleanPlayers = data?.cleanPlayers || false;

            console.log(`🧹 Reiniciando juego - Limpiar jugadores: ${cleanPlayers}`);

            // Primero los jugadores, que es lo que depende de la opción elegida
            if (cleanPlayers) {
                // Borrar todos los jugadores de BD
                await Player.destroy({ where: {} });
                console.log('🧹 Jugadores eliminados de BD');

                // Vaciar players de memoria (EXCEPTO HOST)
                for (const key in players) {
                    if (players[key].name !== 'HOST') {
                        delete players[key];
                    }
                }
                console.log('🗑️ Jugadores eliminados de memoria');
            } else {
                // Solo marcar como desconectados en BD
                await Player.update(
                    { isConnected: false },
                    { where: {} }
                );
                console.log('🔄 Jugadores mantenidos en BD (marcados como desconectados)');

                // Mantener jugadores en memoria, solo resetear estado
                for (const key in players) {
                    if (players[key].name !== 'HOST') {
                        players[key].hasAnswered = false;
                        players[key].isConnected = true;
                    }
                }
                console.log('✅ Jugadores mantenidos en memoria (estado reseteado)');
            }

            // Después, la partida: lobby, sesión nueva, sin timer ni pregunta en curso
            resetGame();

            await loadQuestions();
            console.log("🔄 Preguntas recargadas");

            // Avisamos a todos
            io.emit('game_state', getGameState());

            // Enviar lista correcta de jugadores según si se limpió o no
            if (cleanPlayers) {
                io.emit('update_players', []);
            } else {
                io.emit('update_players', Object.values(players));
            }

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
