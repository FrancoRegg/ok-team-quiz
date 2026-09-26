const Player = require('../models/Players');
const gameState = require('../utils/gameState');
const { registerPlayerHandlers } = require('../sockets/playerHandlers');
const { createFakeIo, createFakeSocket, sentToRoom, sentToSocket } = require('./helpers/sockets');
const { QUESTIONS, resetGameState, putQuestionInState } = require('./helpers/game');

let io;

const connect = (socketId) => {
    const socket = createFakeSocket(socketId);
    registerPlayerHandlers(io, socket);
    return socket;
};

// Registro de jugador como lo devuelve Sequelize
const dbRecord = ({ id = 'uuid-1', name = 'Equipo 1', score = 0 } = {}) => ({
    id, name, score, update: vi.fn().mockResolvedValue(),
});

// Simula la tabla de jugadores: busca por nombre entre los registros dados
const stubPlayersTable = (existing = []) => {
    vi.spyOn(Player, 'findOne').mockImplementation(async ({ where }) =>
        existing.find((p) => p.name === where.name) ?? null);
    const create = vi.spyOn(Player, 'create').mockImplementation(async (data) =>
        dbRecord({ id: `uuid-${data.name}`, name: data.name, score: data.score }));
    const update = vi.spyOn(Player, 'update').mockResolvedValue([1]);
    return { create, update };
};

const playersNamed = (name) => Object.values(gameState.players).filter((p) => p.name === name);

beforeEach(() => {
    resetGameState();
    io = createFakeIo();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe('join_game: validación', () => {
    it('sin nombre avisa al jugador y no lo agrega', async () => {
        stubPlayersTable();
        const socket = connect('s1');

        await socket.trigger('join_game', { name: '   ' });

        expect(sentToSocket(socket, 'error')).toEqual([{ message: 'Debes proporcionar un nombre de equipo' }]);
        expect(gameState.players).toEqual({});
        expect(Player.findOne).not.toHaveBeenCalled();
    });

    it('sin datos responde con un error genérico', async () => {
        const socket = connect('s1');

        await socket.trigger('join_game', undefined);

        expect(sentToSocket(socket, 'error')).toEqual([{ message: 'Error al unirse al juego. Intenta recargar la página.' }]);
        expect(gameState.players).toEqual({});
    });

    it('si la base falla responde con un error y no lo agrega', async () => {
        vi.spyOn(Player, 'findOne').mockRejectedValue(new Error('sin conexión'));
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1' });

        expect(sentToSocket(socket, 'error')).toHaveLength(1);
        expect(gameState.players).toEqual({});
    });
});

describe('join_game: equipos', () => {
    it('un equipo nuevo se crea en la base con 0 puntos y entra a la sala', async () => {
        const { create } = stubPlayersTable();
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1' });

        expect(create).toHaveBeenCalledWith({ name: 'Equipo 1', score: 0, isConnected: true });
        expect(gameState.players.s1).toEqual({
            name: 'Equipo 1', score: 0, id: 's1', dbId: 'uuid-Equipo 1', hasAnswered: false,
        });
        expect(socket.rooms.has('game_room')).toBe(true);
        expect(sentToSocket(socket, 'game_state')).toEqual(['LOBBY']);
        expect(sentToRoom(io, 'game_room', 'update_players')).toHaveLength(1);
    });

    it('un equipo que ya existe recupera su puntaje y se marca conectado', async () => {
        const saved = dbRecord({ id: 'uuid-7', name: 'Equipo 1', score: 250 });
        const { create } = stubPlayersTable([saved]);
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1' });

        expect(create).not.toHaveBeenCalled();
        expect(saved.update).toHaveBeenCalledWith({ isConnected: true });
        expect(gameState.players.s1).toMatchObject({ score: 250, dbId: 'uuid-7' });
    });

    it('un nombre en uso se rechaza: nadie se queda con los puntos de otro', async () => {
        stubPlayersTable([dbRecord({ name: 'Equipo 1', score: 90 })]);

        await connect('celular-del-equipo').trigger('join_game', { name: 'Equipo 1' });
        const intruso = connect('otro-celular');
        await intruso.trigger('join_game', { name: 'Equipo 1' });

        expect(sentToSocket(intruso, 'error')).toEqual([
            { code: 'NAME_TAKEN', message: 'Ya hay un equipo con el nombre "Equipo 1". Elige otro.' },
        ]);
        expect(gameState.players['otro-celular']).toBeUndefined();
        // El equipo que ya estaba sigue en su lugar, con sus puntos
        expect(gameState.players['celular-del-equipo']).toMatchObject({ score: 90 });
    });

    it('el equipo desconectado vuelve con su nombre y su puntaje', async () => {
        vi.useFakeTimers();
        stubPlayersTable([dbRecord({ name: 'Equipo 1', score: 90 })]);

        const viejo = connect('celular-viejo');
        await viejo.trigger('join_game', { name: 'Equipo 1' });

        // Se le cayó el teléfono: quedan los 30s de gracia
        viejo.trigger('disconnect');

        const nuevo = connect('celular-nuevo');
        await nuevo.trigger('join_game', { name: 'Equipo 1' });

        expect(sentToSocket(nuevo, 'error')).toEqual([]);
        expect(playersNamed('Equipo 1')).toHaveLength(1);
        expect(gameState.players['celular-nuevo']).toMatchObject({ score: 90 });
        expect(gameState.players['celular-viejo']).toBeUndefined();
    });

    it('volver a mandar join_game desde el mismo socket no se rechaza', async () => {
        stubPlayersTable([dbRecord({ name: 'Equipo 1', score: 90 })]);
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1' });
        await socket.trigger('join_game', { name: 'Equipo 1' });

        expect(sentToSocket(socket, 'error')).toEqual([]);
        expect(gameState.players.s1).toMatchObject({ score: 90 });
    });
});

describe('join_game: HOST', () => {
    it('no se guarda en la base', async () => {
        const { create } = stubPlayersTable();

        await connect('proyector').trigger('join_game', { name: 'HOST' });

        expect(Player.findOne).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
        expect(gameState.players.proyector).toEqual({ name: 'HOST', score: 0, id: 'proyector', hasAnswered: false });
    });

    it('al recargar el proyector, la entrada nueva reemplaza a la anterior', async () => {
        stubPlayersTable();

        await connect('proyector-antes').trigger('join_game', { name: 'HOST' });
        await connect('proyector-despues').trigger('join_game', { name: 'HOST' });

        expect(playersNamed('HOST')).toEqual([expect.objectContaining({ id: 'proyector-despues' })]);
    });

    it('unirse dos veces desde el mismo socket deja una sola entrada', async () => {
        // La vista del Host emite join_game al montar y otra vez al recibir server_check
        stubPlayersTable();
        const projector = connect('proyector');

        await projector.trigger('join_game', { name: 'HOST' });
        await projector.trigger('join_game', { name: 'HOST', gameId: '123' });

        expect(playersNamed('HOST')).toHaveLength(1);
    });
});

describe('join_game: quien entra con la partida empezada', () => {
    beforeEach(() => stubPlayersTable());

    it('con respuestas abiertas recibe la pregunta y el tiempo restante', async () => {
        putQuestionInState(0, 'QUESTION_ACTIVE');
        gameState.setRemainingTime(9);
        const socket = connect('tarde');

        await socket.trigger('join_game', { name: 'Equipo tardío' });

        expect(sentToSocket(socket, 'new_question')).toEqual([{
            title: QUESTIONS[0].title,
            options: QUESTIONS[0].options,
            type: QUESTIONS[0].type,
            mediaUrl: QUESTIONS[0].mediaUrl,
        }]);
        expect(sentToSocket(socket, 'timer_update')).toEqual([{ remainingTime: 9 }]);
    });

    it('durante la revelación recibe la respuesta correcta', async () => {
        putQuestionInState(0, 'SHOW_ANSWER');
        const socket = connect('tarde');

        await socket.trigger('join_game', { name: 'Equipo tardío' });

        expect(sentToSocket(socket, 'show_correct_answer')).toEqual([{ correctIndex: 2, correctOption: 'Júpiter' }]);
        expect(sentToSocket(socket, 'new_question')).toEqual([]);
    });

    it('con la pregunta bloqueada no la recibe: en ese paso solo se ve en el proyector', async () => {
        putQuestionInState(0, 'QUESTION_LOCKED');
        const socket = connect('tarde');

        await socket.trigger('join_game', { name: 'Equipo tardío' });

        expect(sentToSocket(socket, 'game_state')).toEqual(['QUESTION_LOCKED']);
        expect(sentToSocket(socket, 'new_question')).toEqual([]);
        expect(sentToSocket(socket, 'show_correct_answer')).toEqual([]);
    });

    it('en el lobby no recibe preguntas', async () => {
        const socket = connect('temprano');

        await socket.trigger('join_game', { name: 'Equipo puntual' });

        expect(sentToSocket(socket, 'new_question')).toEqual([]);
        expect(sentToSocket(socket, 'timer_update')).toEqual([]);
    });
});

describe('join_game: sesión de partida en producción', () => {
    beforeEach(() => {
        stubPlayersTable();
        vi.stubEnv('NODE_ENV', 'production');
    });

    it('rechaza a un jugador con una sesión de una partida anterior', async () => {
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1', gameId: 'partida-vieja' });

        expect(sentToSocket(socket, 'session_expired')).toEqual([{
            message: 'La sesión ha expirado. Por favor, recarga la página.',
            currentGameId: gameState.getGameSessionId(),
        }]);
        expect(socket.disconnect).toHaveBeenCalledWith(true);
        expect(gameState.players).toEqual({});
        expect(Player.findOne).not.toHaveBeenCalled();
    });

    it('rechaza a un jugador sin sesión', async () => {
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1' });

        expect(socket.disconnect).toHaveBeenCalledWith(true);
    });

    it('acepta a un jugador con la sesión vigente', async () => {
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1', gameId: String(gameState.getGameSessionId()) });

        expect(socket.disconnect).not.toHaveBeenCalled();
        expect(gameState.players.s1).toBeDefined();
    });

    it('el HOST no necesita sesión', async () => {
        const socket = connect('proyector');

        await socket.trigger('join_game', { name: 'HOST' });

        expect(socket.disconnect).not.toHaveBeenCalled();
        expect(gameState.players.proyector).toBeDefined();
    });

    it('en desarrollo una sesión vieja se permite', async () => {
        vi.stubEnv('NODE_ENV', 'development');
        const socket = connect('s1');

        await socket.trigger('join_game', { name: 'Equipo 1', gameId: 'partida-vieja' });

        expect(socket.disconnect).not.toHaveBeenCalled();
        expect(gameState.players.s1).toBeDefined();
    });
});

describe('disconnect', () => {
    let table;

    beforeEach(() => {
        vi.useFakeTimers();
        table = stubPlayersTable();
    });

    it('un socket que no era jugador no hace nada', () => {
        connect('desconocido').trigger('disconnect');

        expect(gameState.getPlayerTimeouts()).toEqual({});
    });

    it('el HOST se conserva en memoria', async () => {
        const projector = connect('proyector');
        await projector.trigger('join_game', { name: 'HOST' });

        projector.trigger('disconnect');
        await vi.advanceTimersByTimeAsync(60000);

        expect(gameState.players.proyector).toBeDefined();
        expect(table.update).not.toHaveBeenCalled();
    });

    it('un jugador tiene 30 segundos para volver antes de salir de la partida', async () => {
        const socket = connect('s1');
        await socket.trigger('join_game', { name: 'Equipo 1' });

        socket.trigger('disconnect');
        await vi.advanceTimersByTimeAsync(29999);

        expect(gameState.players.s1).toBeDefined();
        expect(table.update).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(1);

        expect(gameState.players.s1).toBeUndefined();
        expect(table.update).toHaveBeenCalledWith({ isConnected: false }, { where: { name: 'Equipo 1' } });
        expect(sentToRoom(io, 'game_room', 'update_players').at(-1)).toEqual([]);
    });

    it('si vuelve dentro de los 30 segundos, conserva su lugar', async () => {
        const before = connect('s1');
        await before.trigger('join_game', { name: 'Equipo 1' });
        before.trigger('disconnect');
        await vi.advanceTimersByTimeAsync(10000);

        await connect('s1-reconectado').trigger('join_game', { name: 'Equipo 1' });
        await vi.advanceTimersByTimeAsync(60000);

        expect(playersNamed('Equipo 1')).toEqual([expect.objectContaining({ id: 's1-reconectado' })]);
        expect(table.update).not.toHaveBeenCalled();
        expect(gameState.getPlayerTimeouts()).toEqual({});
    });
});
