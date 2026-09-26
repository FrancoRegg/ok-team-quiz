const jwt = require('jsonwebtoken');
const Player = require('../models/Players');
const gameState = require('../utils/gameState');
const { authenticateSocket } = require('../middleware/socketAuth');
const { registerGameHandlers } = require('../sockets/gameHandlers');
const { registerAdminHandlers } = require('../sockets/adminHandlers');
const { createFakeIo, createFakeSocket, sentToSocket } = require('./helpers/sockets');
const { resetGameState, addPlayer, putQuestionInState } = require('./helpers/game');

// Los eventos que manejan la partida: los cuatro del proyector y el reinicio
const CONTROL_EVENTS = ['next_question', 'previous_question', 'activate_answers', 'show_answer'];

let io;
let sendNextQuestion;
let loadQuestions;

// Registra los handlers sobre un socket y devuelve el socket listo para disparar
const socketWithHandlers = (id) => {
    const socket = createFakeSocket(id);
    registerGameHandlers(io, socket, sendNextQuestion);
    registerAdminHandlers(io, socket, loadQuestions);
    return socket;
};

beforeEach(() => {
    resetGameState();
    io = createFakeIo();
    sendNextQuestion = vi.fn();
    loadQuestions = vi.fn();

    // Partida en curso con el proyector y un jugador conectados
    addPlayer('proyector', { name: 'HOST' });
    addPlayer('celular', { name: 'Equipo 1', score: 100 });
    putQuestionInState(1, 'QUESTION_LOCKED');
});

describe('quién puede controlar la partida', () => {
    it.each(CONTROL_EVENTS)('un jugador no puede disparar %s', async (event) => {
        const jugador = socketWithHandlers('celular');

        await jugador.trigger(event);

        expect(sentToSocket(jugador, 'error_message')).toEqual([
            { message: 'No tienes permiso para controlar la partida' },
        ]);
        expect(sendNextQuestion).not.toHaveBeenCalled();
        expect(gameState.getGameState()).toBe('QUESTION_LOCKED');
    });

    it('un socket desconocido tampoco puede disparar el reinicio', async () => {
        const destroy = vi.spyOn(Player, 'destroy');
        const intruso = socketWithHandlers('socket-sin-registrar');

        await intruso.trigger('reset_game', { cleanPlayers: true });

        expect(destroy).not.toHaveBeenCalled();
        expect(sentToSocket(intruso, 'error_message')).toHaveLength(1);
        expect(gameState.players.celular).toBeDefined();
    });

    it('el proyector sí avanza la pregunta', async () => {
        const proyector = socketWithHandlers('proyector');

        await proyector.trigger('next_question');

        expect(sendNextQuestion).toHaveBeenCalledOnce();
        expect(sentToSocket(proyector, 'error_message')).toEqual([]);
    });

    it('el panel admin autenticado sí reinicia la partida', async () => {
        vi.spyOn(Player, 'update').mockResolvedValue([1]);
        const panel = socketWithHandlers('panel');
        panel.data.isAdmin = true;

        await panel.trigger('reset_game', {});

        expect(sentToSocket(panel, 'error_message')).toEqual([]);
        expect(gameState.getGameState()).toBe('LOBBY');
    });

    it('el panel sin token válido no reinicia la partida', async () => {
        const update = vi.spyOn(Player, 'update');
        const panel = socketWithHandlers('panel');

        await panel.trigger('reset_game', {});

        expect(update).not.toHaveBeenCalled();
        expect(gameState.getGameState()).toBe('QUESTION_LOCKED');
    });
});

describe('el token del panel en el handshake', () => {
    const SECRET = 'secreto-de-prueba';

    // El socket que arma Socket.io antes de registrar los handlers
    const handshakeWith = (auth) => ({ data: {}, handshake: { auth } });

    beforeEach(() => {
        vi.stubEnv('JWT_SECRET', SECRET);
    });

    it('marca como admin al socket que manda un token válido', () => {
        const socket = handshakeWith({ token: jwt.sign({ role: 'admin' }, SECRET) });
        const next = vi.fn();

        authenticateSocket(socket, next);

        expect(socket.data.isAdmin).toBe(true);
        expect(next).toHaveBeenCalledOnce();
    });

    it('deja pasar sin marca al que no manda token (jugadores y proyector)', () => {
        const socket = handshakeWith({});
        const next = vi.fn();

        authenticateSocket(socket, next);

        expect(socket.data.isAdmin).toBe(false);
        expect(next).toHaveBeenCalledOnce();
    });

    it('no marca como admin a un token firmado con otra clave', () => {
        const socket = handshakeWith({ token: jwt.sign({ role: 'admin' }, 'otra-clave') });

        authenticateSocket(socket, vi.fn());

        expect(socket.data.isAdmin).toBe(false);
    });

    it('no marca como admin a un token vencido', () => {
        const vencido = jwt.sign({ role: 'admin' }, SECRET, { expiresIn: '-1s' });
        const socket = handshakeWith({ token: vencido });

        authenticateSocket(socket, vi.fn());

        expect(socket.data.isAdmin).toBe(false);
    });
});
