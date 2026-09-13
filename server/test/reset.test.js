const Player = require('../models/Players');
const Question = require('../models/Questions');
const gameState = require('../utils/gameState');
const { loadQuestions } = require('../utils/gameLogics');
const { registerAdminHandlers } = require('../sockets/adminHandlers');
const { createFakeIo, createFakeSocket, sentToRoom } = require('./helpers/sockets');
const { QUESTIONS, resetGameState, addPlayer, putQuestionInState } = require('./helpers/game');

let io;
let host;
let table;

beforeEach(() => {
    vi.useFakeTimers();
    resetGameState();
    io = createFakeIo();

    // Partida a mitad de camino: dos equipos con puntos, pregunta activa y temporizador
    addPlayer('proyector', { name: 'HOST' });
    addPlayer('s1', { name: 'Equipo 1', score: 190, hasAnswered: true });
    addPlayer('s2', { name: 'Equipo 2', score: 90, hasAnswered: true });
    putQuestionInState(1, 'QUESTION_ACTIVE');
    gameState.setFirstCorrectAnswer('s1');
    gameState.setRemainingTime(8);
    // Emite como el temporizador real, para poder comprobar que el reinicio lo corta
    gameState.setTimerInterval(setInterval(() => {
        io.to('game_room').emit('timer_update', { remainingTime: 0 });
    }, 1000));
    gameState.getPlayerTimeouts().s3 = setTimeout(() => {}, 30000);

    table = {
        destroy: vi.spyOn(Player, 'destroy').mockResolvedValue(2),
        update: vi.spyOn(Player, 'update').mockResolvedValue([2]),
    };
    vi.spyOn(Question, 'findAll').mockResolvedValue(QUESTIONS.map((q) => ({ toJSON: () => ({ ...q }) })));

    host = createFakeSocket('proyector');
    registerAdminHandlers(io, host, loadQuestions);
});

describe('reset_game: lo que se reinicia siempre', () => {
    it.each([
        ['conservando jugadores', { cleanPlayers: false }],
        ['limpiando jugadores', { cleanPlayers: true }],
    ])('%s: vuelve al lobby desde la primera pregunta', async (_caso, options) => {
        await host.trigger('reset_game', options);

        expect(gameState.getGameState()).toBe('LOBBY');
        expect(gameState.getCurrentQuestionIndex()).toBe(0);
        expect(gameState.getFirstCorrectAnswer()).toBeNull();
        expect(gameState.getTimerInterval()).toBeNull();
        expect(gameState.getRemainingTime()).toBe(0);
        expect(gameState.getPlayerTimeouts()).toEqual({});
        expect(sentToRoom(io, '*', 'game_state')).toEqual(['LOBBY']);
    });

    it('abre una sesión de partida nueva, que invalida los enlaces de la anterior', async () => {
        const previousSession = gameState.getGameSessionId();
        vi.setSystemTime(Date.now() + 60000);

        await host.trigger('reset_game', { cleanPlayers: false });

        expect(gameState.getGameSessionId()).not.toBe(previousSession);
    });

    it('recarga las preguntas desde la base', async () => {
        gameState.setQuestions([]);

        await host.trigger('reset_game', { cleanPlayers: false });

        expect(Question.findAll).toHaveBeenCalledOnce();
        expect(gameState.getQuestions()).toHaveLength(QUESTIONS.length);
    });

    it('el temporizador que estaba corriendo no vuelve a emitir', async () => {
        await host.trigger('reset_game', { cleanPlayers: false });
        await vi.advanceTimersByTimeAsync(60000);

        expect(sentToRoom(io, 'game_room', 'timer_update')).toEqual([]);
        expect(sentToRoom(io, 'game_room', 'timer_finished')).toEqual([]);
    });
});

describe('reset_game: conservando jugadores', () => {
    it('mantiene equipos y puntajes, listos para responder de nuevo', async () => {
        await host.trigger('reset_game', { cleanPlayers: false });

        expect(gameState.players.s1).toMatchObject({ name: 'Equipo 1', score: 190, hasAnswered: false });
        expect(gameState.players.s2).toMatchObject({ name: 'Equipo 2', score: 90, hasAnswered: false });
        expect(table.destroy).not.toHaveBeenCalled();
    });

    it('envía la lista de jugadores actual y no fuerza a nadie a recargar', async () => {
        await host.trigger('reset_game', { cleanPlayers: false });

        const [players] = sentToRoom(io, '*', 'update_players');
        expect(players.map((p) => p.name)).toEqual(['HOST', 'Equipo 1', 'Equipo 2']);
        expect(sentToRoom(io, '*', 'force_refresh')).toEqual([]);
    });

    it('marca a todos como desconectados en la base', async () => {
        await host.trigger('reset_game', { cleanPlayers: false });

        expect(table.update).toHaveBeenCalledWith({ isConnected: false }, { where: {} });
    });

    it('sin opciones se comporta como conservar jugadores', async () => {
        await host.trigger('reset_game');

        expect(table.destroy).not.toHaveBeenCalled();
        expect(gameState.players.s1).toBeDefined();
    });
});

describe('reset_game: limpiando jugadores', () => {
    it('borra a todos los equipos de la base y de la memoria, menos el HOST', async () => {
        await host.trigger('reset_game', { cleanPlayers: true });

        expect(table.destroy).toHaveBeenCalledWith({ where: {} });
        expect(Object.values(gameState.players).map((p) => p.name)).toEqual(['HOST']);
    });

    it('envía la lista vacía y obliga a todos a recargar', async () => {
        await host.trigger('reset_game', { cleanPlayers: true });

        expect(sentToRoom(io, '*', 'update_players')).toEqual([[]]);
        expect(sentToRoom(io, '*', 'force_refresh')).toHaveLength(1);
    });
});

describe('reset_game: errores', () => {
    it('si la base falla avisa a la sala', async () => {
        table.destroy.mockRejectedValue(new Error('sin conexión'));

        await host.trigger('reset_game', { cleanPlayers: true });

        expect(sentToRoom(io, 'game_room', 'error')).toEqual([{ message: 'Error al reiniciar el juego' }]);
    });
});
