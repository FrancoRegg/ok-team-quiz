const Player = require('../models/Players');
const gameState = require('../utils/gameState');

const {
    getGameState,
    getCurrentQuestionIndex,
    getQuestions,
    getGameSessionId,
    getRemainingTime,
    players,
    playerTimeouts
} = gameState;

const registerPlayerHandlers = (io, socket) => {
    
    // --- JOIN GAME ---
    socket.on('join_game', async (data) => { 
        try{
            console.log("📥 Evento join_game recibido:", data);

            if(!data){
                throw new Error('Datos no proporcionados') 
            }

            const groupId = data.name 
            const clientGameId = data.gameId; 

            // Validar que ingrese nombre
            if (!groupId || groupId.trim() === "") {
                console.log(`⛔ Intento de conexión sin nombre`);
                socket.emit('error', { message: 'Debes proporcionar un nombre de equipo' });
                return;
            }

            if (groupId !== 'HOST') {
                if (process.env.NODE_ENV === 'production') {
                    if (!clientGameId || String(clientGameId) !== String(getGameSessionId())) {
                        console.log(`⛔ Bloqueado: ${groupId} - Ticket caducado`);
                        console.log(`   - Tiene: ${clientGameId}`);
                        console.log(`   - Esperado: ${getGameSessionId()}`);
                        
                        socket.emit('session_expired', { 
                            message: 'La sesión ha expirado. Por favor, recarga la página.',
                            currentGameId: getGameSessionId() 
                        });
                        
                        socket.disconnect(true); 
                        return;
                    }
                } else {
                    if (clientGameId && String(clientGameId) !== String(getGameSessionId())) {
                        console.log(`⚠️ [DEV] GameId diferente para ${groupId}: ${clientGameId} vs ${getGameSessionId()} (permitido en desarrollo)`);
                    }
                }
            }
            console.log(`✅ Validación pasada para: ${groupId}`);
            
            // Buscar o crear jugador en base de datos
            let dbPlayer;
            if (groupId !== 'HOST') {
                dbPlayer = await Player.findOne({ where: { name: groupId } });

                if (!dbPlayer) {
                    dbPlayer = await Player.create({
                        name: groupId,
                        score: 0,
                        isConnected: true
                    });
                    console.log(`📝 Nuevo jugador creado en BD: ${groupId}`);
                } else {
                    await dbPlayer.update({ isConnected: true });
                    console.log(`🔄 ${groupId} reconectado desde BD - Score: ${dbPlayer.score}`);
                }
            }

            // Buscar si ya existe en memoria
            const existingPlayerId = Object.keys(players).find(key => players[key].name === groupId);

            if (existingPlayerId) {
                console.log(`🔄 ${groupId} recuperado de memoria.`);
                
                if(playerTimeouts[existingPlayerId]){
                    clearTimeout(playerTimeouts[existingPlayerId]);
                    delete playerTimeouts[existingPlayerId];
                    console.log(`⏰ Timeout cancelado para ${groupId}`);
                }

                delete players[existingPlayerId]; 
            }

            // Agregar a memoria
            if (groupId === 'HOST') {
                players[socket.id] = {
                    name: groupId,
                    score: 0,
                    id: socket.id,
                    hasAnswered: false
                };
            } else {
                players[socket.id] = {
                    name: groupId,
                    score: dbPlayer.score,
                    id: socket.id,
                    dbId: dbPlayer.id,
                    hasAnswered: false
                };
            }

            socket.join('game_room')
            
            socket.emit('game_state', getGameState());
            io.to('game_room').emit('update_players', Object.values(players))

            // Poner al día a quien ingresa tarde o se reconecta
            if (getCurrentQuestionIndex() > 0) {
                const currentQ = getQuestions()[getCurrentQuestionIndex() - 1];

                if (currentQ && getGameState() === 'QUESTION_ACTIVE') {
                    socket.emit('new_question', {
                        title: currentQ.title,
                        options: currentQ.options,
                        type: currentQ.type,
                        mediaUrl: currentQ.mediaUrl
                    });
                    socket.emit('timer_update', { remainingTime: getRemainingTime() });
                    console.log(`📤 Pregunta en curso enviada a ${groupId}`);
                }

                if (currentQ && getGameState() === 'SHOW_ANSWER') {
                    socket.emit('show_correct_answer', {
                        correctIndex: currentQ.correctIndex,
                        correctOption: currentQ.options[currentQ.correctIndex]
                    });
                    console.log(`📤 Respuesta correcta enviada a ${groupId}`);
                }
            }
        } catch (error){
            console.error('❌ Error en join_game:', error.message)
            socket.emit('error', {
                message: 'Error al unirse al juego. Intenta recargar la página.'
            });
        }
    });

    // --- DISCONNECT ---
    socket.on('disconnect', () => {
        try{
            const player = players[socket.id]
            if(!player) return;

            if(player.name === 'HOST'){
                console.log(`🔌 HOST desconectado (mantenido en memoria)`);
                return;
            }

            console.log(`⏳ ${player.name} desconectado. Esperando 30s...`);
        
            playerTimeouts[socket.id] = setTimeout(async () => {
                console.log(`🗑️ ${player.name} desconectado definitivamente.`);
                
                await Player.update(
                    { isConnected: false },
                    { where: { name: player.name } }
                );
                
                delete players[socket.id];
                delete playerTimeouts[socket.id];
                
                io.to('game_room').emit('update_players', Object.values(players));
            }, 30000)
        } catch (error){
            console.error('❌ Error en disconnect:', error.message)
        }
    });
}

module.exports = { registerPlayerHandlers };