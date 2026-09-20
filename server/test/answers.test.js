const Player = require('../models/Players');
const gameState = require('../utils/gameState');
const { registerAnswerHandlers } = require('../sockets/answerHandlers');
const { createFakeIo, createFakeSocket, sentToRoom, sentToSocket } = require('./helpers/sockets');
const { resetGameState, addPlayer, putQuestionInState } = require('./helpers/game');

// La primera pregunta de ejemplo tiene la respuesta correcta en el índice 2
const CORRECT = 2;
const WRONG = 0;

let io;
let savedScores;

// Cada jugador responde desde su propio socket
const connectPlayer = (socketId, player) => {
    addPlayer(socketId, player);
    const socket = createFakeSocket(socketId);
    registerAnswerHandlers(io, socket);
    return socket;
};

beforeEach(() => {
    resetGameState();
    addPlayer('socket-host', { name: 'HOST' });
    putQuestionInState(0, 'QUESTION_ACTIVE');
    io = createFakeIo();
    savedScores = vi.spyOn(Player, 'update').mockResolvedValue([1]);
});

describe('submit_answer: cuándo se acepta una respuesta', () => {
    it.each(['LOBBY', 'QUESTION_LOCKED', 'SHOW_ANSWER', 'GAME_OVER'])(
        'en %s se rechaza y se avisa al jugador',
        async (state) => {
            const socket = connectPlayer('s1', { name: 'Equipo 1' });
            gameState.setGameState(state);

            await socket.trigger('submit_answer', { answer: CORRECT });

            expect(sentToSocket(socket, 'error')).toEqual([{ message: 'Las respuestas aún no están activadas' }]);
            expect(gameState.players.s1).toMatchObject({ score: 0, hasAnswered: false });
            expect(savedScores).not.toHaveBeenCalled();
        }
    );

    it('se ignora si el socket no corresponde a un jugador de la partida', async () => {
        const stranger = createFakeSocket('desconocido');
        registerAnswerHandlers(io, stranger);

        await stranger.trigger('submit_answer', { answer: CORRECT });

        expect(stranger.emitted).toEqual([]);
        expect(io.emitted).toEqual([]);
    });

    it('sin respuesta en el mensaje avisa al jugador con un error', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });

        await socket.trigger('submit_answer', {});

        expect(sentToSocket(socket, 'error')).toEqual([{ message: 'Error al procesar tu respuesta. Intenta de nuevo.' }]);
        expect(gameState.players.s1.hasAnswered).toBe(false);
    });

    it('cada jugador responde una sola vez por pregunta', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });
        connectPlayer('s2', { name: 'Equipo 2' }); // así no responden todos con la primera

        await socket.trigger('submit_answer', { answer: WRONG });
        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1.score).toBe(0);
        expect(savedScores).toHaveBeenCalledOnce();
    });
});

describe('submit_answer: puntaje', () => {
    it('el primero en acertar suma 100', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1).toMatchObject({ score: 100, hasAnswered: true });
        expect(gameState.getFirstCorrectAnswer()).toBe('s1');
    });

    it('los siguientes en acertar suman 90', async () => {
        const first = connectPlayer('s1', { name: 'Equipo 1' });
        const second = connectPlayer('s2', { name: 'Equipo 2' });
        connectPlayer('s3', { name: 'Equipo 3' });

        await first.trigger('submit_answer', { answer: CORRECT });
        await second.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1.score).toBe(100);
        expect(gameState.players.s2.score).toBe(90);
    });

    it('una respuesta incorrecta no suma, pero cuenta como respondida', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });

        await socket.trigger('submit_answer', { answer: WRONG });

        expect(gameState.players.s1).toMatchObject({ score: 0, hasAnswered: true });
    });

    it('equivocarse antes no quita el bonus: los 100 son para el primero que acierta', async () => {
        const wrong = connectPlayer('s1', { name: 'Equipo 1' });
        const right = connectPlayer('s2', { name: 'Equipo 2' });

        await wrong.trigger('submit_answer', { answer: WRONG });
        await right.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1.score).toBe(0);
        expect(gameState.players.s2.score).toBe(100);
    });

    it('suma sobre el puntaje que el equipo ya tenía', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1', score: 250 });

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1.score).toBe(350);
    });

    it('guarda el puntaje en la base con el id del jugador', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1', score: 250, dbId: 'uuid-equipo-1' });

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(savedScores).toHaveBeenCalledWith({ score: 350 }, { where: { id: 'uuid-equipo-1' } });
    });

    it('actualiza la tabla de posiciones de la sala después de cada respuesta', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });

        await socket.trigger('submit_answer', { answer: CORRECT });

        const [players] = sentToRoom(io, 'game_room', 'update_players');
        expect(players.find((p) => p.id === 's1')).toMatchObject({ score: 100, hasAnswered: true });
    });
});

describe('submit_answer: si falla el guardado en la base', () => {
    const failOnce = () => savedScores.mockRejectedValueOnce(new Error('sin conexión'));

    it('no suma los puntos en memoria', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1', score: 250 });
        failOnce();

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1.score).toBe(250);
    });

    it('avisa al jugador y lo deja volver a responder', async () => {
        const socket = connectPlayer('s1', { name: 'Equipo 1' });
        connectPlayer('s2', { name: 'Equipo 2' }); // así no responden todos con la primera
        failOnce();

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(sentToSocket(socket, 'error')).toEqual([
            { message: 'No pudimos registrar tu respuesta. Intenta de nuevo.' }
        ]);
        expect(gameState.players.s1.hasAnswered).toBe(false);

        // El reintento sí se guarda y recién ahí suma
        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.players.s1).toMatchObject({ score: 100, hasAnswered: true });
        expect(savedScores).toHaveBeenCalledTimes(2);
    });

    it('libera el bonus del primer acierto para quien sí se guarde', async () => {
        const failing = connectPlayer('s1', { name: 'Equipo 1' });
        const other = connectPlayer('s2', { name: 'Equipo 2' });
        connectPlayer('s3', { name: 'Equipo 3' });
        failOnce();

        await failing.trigger('submit_answer', { answer: CORRECT });
        await other.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.getFirstCorrectAnswer()).toBe('s2');
        expect(gameState.players.s2.score).toBe(100);
    });

    it('no cuenta como respondida para detener el temporizador', async () => {
        vi.useFakeTimers();
        gameState.setRemainingTime(7);
        gameState.setTimerInterval(setInterval(() => {}, 1000));
        const socket = connectPlayer('s1', { name: 'Equipo 1' });
        failOnce();

        await socket.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.getTimerInterval()).not.toBeNull();
    });
});

describe('submit_answer: cuando responden todos', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // Temporizador en curso, como lo deja activate_answers
        gameState.setRemainingTime(7);
        gameState.setTimerInterval(setInterval(() => {}, 1000));
    });

    it('detiene el temporizador y avisa el fin del tiempo tras un segundo y medio', async () => {
        const a = connectPlayer('s1', { name: 'Equipo 1' });
        const b = connectPlayer('s2', { name: 'Equipo 2' });

        await a.trigger('submit_answer', { answer: CORRECT });
        await b.trigger('submit_answer', { answer: WRONG });

        expect(gameState.getTimerInterval()).toBeNull();
        expect(gameState.getRemainingTime()).toBe(0);

        vi.advanceTimersByTime(1499);
        expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(0);

        vi.advanceTimersByTime(1);
        expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(1);
    });

    it('mientras falte alguien, el temporizador sigue', async () => {
        const a = connectPlayer('s1', { name: 'Equipo 1' });
        connectPlayer('s2', { name: 'Equipo 2' });

        await a.trigger('submit_answer', { answer: CORRECT });
        vi.advanceTimersByTime(5000);

        expect(gameState.getTimerInterval()).not.toBeNull();
        expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(0);
    });

    it('el HOST no cuenta como jugador pendiente', async () => {
        const onlyPlayer = connectPlayer('s1', { name: 'Equipo 1' });

        await onlyPlayer.trigger('submit_answer', { answer: CORRECT });

        expect(gameState.getTimerInterval()).toBeNull();
    });

    it('no avanza solo a la siguiente pregunta: eso lo decide el HOST', async () => {
        const onlyPlayer = connectPlayer('s1', { name: 'Equipo 1' });

        await onlyPlayer.trigger('submit_answer', { answer: CORRECT });
        vi.advanceTimersByTime(10000);

        expect(gameState.getGameState()).toBe('QUESTION_ACTIVE');
        expect(gameState.getCurrentQuestionIndex()).toBe(1);
    });
});
