const Player = require('../models/Players');
// Jugadores conectados a la partida en curso, para reflejar ahí los cambios de puntaje
const { players } = require('../utils/gameState');

let io = null;

exports.setSocketIO = (socketIO) => {
    io = socketIO;
};

// GET - Listar todos los jugadores
exports.getAllPlayers = async (req, res) => {
    try {
        const players = await Player.findAll({
            order: [['score', 'DESC']]
        });
        res.json(players);
    } catch (error) {
        console.error('❌ Error al obtener jugadores:', error);
        res.status(500).json({ error: 'Error al obtener jugadores' });
    }
};

// PUT - Editar puntos de un jugador
exports.updatePlayerScore = async (req, res) => {
    try {
        const { id } = req.params;
        const { scoreChange } = req.body;
        
        const player = await Player.findByPk(id);
        
        if (!player) {
            return res.status(404).json({ error: 'Jugador no encontrado' });
        }
        
        const newScore = Math.max(0, player.score + scoreChange);
        
        await player.update({ score: newScore });
        
        console.log(`✏️ ${player.name}: ${player.score - scoreChange} → ${newScore} (${scoreChange >= 0 ? '+' : ''}${scoreChange})`);
        
        // Actualizar jugador en memoria Y notificar via Socket.io
        if (io) {
            // Buscar jugador en memoria y actualizar
            const socketId = Object.keys(players).find(id => players[id].dbId === player.id);
            if (socketId) {
                players[socketId].score = newScore;
                console.log(`🔄 Memoria actualizada para ${player.name}`);
            }
            
            // Emitir actualización a todos los clientes
            io.to('game_room').emit('update_players', Object.values(players));
            console.log(`📡 Actualización enviada via Socket.io`);
        }
        
        res.json({ success: true, player });
    } catch (error) {
        console.error('❌ Error al editar jugador:', error);
        res.status(500).json({ error: 'Error al editar jugador' });
    }
};

// DELETE - Limpiar todos los jugadores
exports.cleanSeason = async (req, res) => {
    try {
        await Player.destroy({ where: {} });
        console.log('🧹 Temporada limpiada - Todos los jugadores eliminados');
        res.json({ success: true, message: 'Temporada limpiada correctamente' });
    } catch (error) {
        console.error('❌ Error al limpiar temporada:', error);
        res.status(500).json({ error: 'Error al limpiar temporada' });
    }
};