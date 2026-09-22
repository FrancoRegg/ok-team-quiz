const Player = require('../models/Players');
const gameState = require('../utils/gameState');
const playerController = require('../controllers/player.controller');
const { createFakeIo, sentToRoom } = require('./helpers/sockets');
const { resetGameState, addPlayer } = require('./helpers/game');

// Respuesta de Express mínima: guarda el status y el cuerpo enviados
const createFakeRes = () => {
    const res = { statusCode: 200, body: undefined };
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
};

// Registro de la base: el controller lee score y llama a update()
const stubPlayerInDb = (fields) => {
    const record = { ...fields };
    record.update = vi.fn(async (changes) => Object.assign(record, changes));
    vi.spyOn(Player, 'findByPk').mockResolvedValue(record);
    return record;
};

let io;

beforeEach(() => {
    resetGameState();
    io = createFakeIo();
    playerController.setSocketIO(io);
});

describe('updatePlayerScore', () => {
    it('guarda el nuevo puntaje en la base', async () => {
        const record = stubPlayerInDb({ id: 'uuid-1', name: 'Equipo 1', score: 100 });
        const res = createFakeRes();

        await playerController.updatePlayerScore({ params: { id: 'uuid-1' }, body: { scoreChange: 50 } }, res);

        expect(record.update).toHaveBeenCalledWith({ score: 150 });
        expect(res.body).toMatchObject({ success: true });
    });

    it('nunca deja un puntaje negativo', async () => {
        const record = stubPlayerInDb({ id: 'uuid-1', name: 'Equipo 1', score: 30 });

        await playerController.updatePlayerScore({ params: { id: 'uuid-1' }, body: { scoreChange: -100 } }, createFakeRes());

        expect(record.update).toHaveBeenCalledWith({ score: 0 });
    });

    it('si el equipo está en la partida, actualiza su puntaje en memoria y avisa a la sala', async () => {
        stubPlayerInDb({ id: 'uuid-1', name: 'Equipo 1', score: 100 });
        addPlayer('s1', { name: 'Equipo 1', score: 100, dbId: 'uuid-1' });

        await playerController.updatePlayerScore({ params: { id: 'uuid-1' }, body: { scoreChange: 50 } }, createFakeRes());

        expect(gameState.players.s1.score).toBe(150);
        const [players] = sentToRoom(io, 'game_room', 'update_players');
        expect(players.find((p) => p.id === 's1').score).toBe(150);
    });

    it('si el jugador no existe responde 404', async () => {
        vi.spyOn(Player, 'findByPk').mockResolvedValue(null);
        const res = createFakeRes();

        await playerController.updatePlayerScore({ params: { id: 'nadie' }, body: { scoreChange: 10 } }, res);

        expect(res.statusCode).toBe(404);
    });
});
