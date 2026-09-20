const Question = require('../models/Questions');
const gameState = require('../utils/gameState');
const { sendNextQuestion } = require('../utils/gameLogics');
const { registerGameHandlers } = require('../sockets/gameHandlers');
const { createFakeIo, createFakeSocket, sentToRoom } = require('./helpers/sockets');
const { QUESTIONS, resetGameState, addPlayer, putQuestionInState } = require('./helpers/game');

const HOST_ID = 'socket-host';

// Question.findAll devuelve instancias de Sequelize; el código llama toJSON()
const stubQuestionsInDb = (questions = QUESTIONS) =>
    vi.spyOn(Question, 'findAll').mockResolvedValue(questions.map((q) => ({ toJSON: () => ({ ...q }) })));

beforeEach(() => {
    resetGameState();
    addPlayer(HOST_ID, { name: 'HOST' });
});

describe('getCurrentQuestion', () => {
    it('en el lobby todavía no hay pregunta en juego', () => {
        expect(gameState.getCurrentQuestion()).toBeNull();
    });

    it('devuelve la pregunta que el HOST puso en pantalla', async () => {
        stubQuestionsInDb();
        const io = createFakeIo();

        await sendNextQuestion(io);
        expect(gameState.getCurrentQuestion()).toMatchObject({ title: QUESTIONS[0].title });

        await sendNextQuestion(io);
        expect(gameState.getCurrentQuestion()).toMatchObject({ title: QUESTIONS[1].title });
    });

    it('si el índice quedó fuera de rango devuelve null en lugar de romper', () => {
        gameState.setCurrentQuestionIndex(99);

        expect(gameState.getCurrentQuestion()).toBeNull();
    });
});

describe('sendNextQuestion', () => {
    it('al empezar la partida recarga las preguntas desde la base', async () => {
        const findAll = stubQuestionsInDb();

        await sendNextQuestion(createFakeIo());

        expect(findAll).toHaveBeenCalledOnce();
    });

    it('sin preguntas cargadas avisa al HOST y no arranca', async () => {
        stubQuestionsInDb([]);
        const io = createFakeIo();

        await sendNextQuestion(io);

        expect(sentToRoom(io, HOST_ID, 'error_message')).toEqual([
            { message: 'No hay preguntas cargadas. Crea preguntas desde el panel de administración primero.' },
        ]);
        expect(gameState.getGameState()).toBe('LOBBY');
        expect(gameState.getCurrentQuestionIndex()).toBe(0);
    });

    it('bloquea la pregunta y se la muestra solo al HOST', async () => {
        stubQuestionsInDb();
        const io = createFakeIo();

        await sendNextQuestion(io);

        expect(gameState.getGameState()).toBe('QUESTION_LOCKED');
        expect(sentToRoom(io, 'game_room', 'game_state')).toEqual(['QUESTION_LOCKED']);
        expect(sentToRoom(io, HOST_ID, 'new_question')).toEqual([{
            title: QUESTIONS[0].title,
            options: QUESTIONS[0].options,
            type: QUESTIONS[0].type,
            mediaUrl: QUESTIONS[0].mediaUrl,
        }]);
        expect(sentToRoom(io, 'game_room', 'new_question')).toEqual([]);
    });

    it('nunca envía la respuesta correcta junto con la pregunta', async () => {
        stubQuestionsInDb();
        const io = createFakeIo();

        await sendNextQuestion(io);

        const [question] = sentToRoom(io, HOST_ID, 'new_question');
        expect(question).not.toHaveProperty('correctIndex');
    });

    it('reinicia quién respondió y quién acertó primero', async () => {
        stubQuestionsInDb();
        addPlayer('socket-1', { name: 'Equipo 1', hasAnswered: true });
        gameState.setFirstCorrectAnswer('socket-1');

        await sendNextQuestion(createFakeIo());

        expect(gameState.players['socket-1'].hasAnswered).toBe(false);
        expect(gameState.getFirstCorrectAnswer()).toBeNull();
    });

    it('avanza por las preguntas en orden sin volver a la base', async () => {
        const findAll = stubQuestionsInDb();
        const io = createFakeIo();

        await sendNextQuestion(io);
        await sendNextQuestion(io);

        expect(findAll).toHaveBeenCalledOnce();
        expect(sentToRoom(io, HOST_ID, 'new_question').map((q) => q.title)).toEqual([
            QUESTIONS[0].title,
            QUESTIONS[1].title,
        ]);
        expect(gameState.getCurrentQuestionIndex()).toBe(2);
    });

    it('después de la última pregunta termina la partida', async () => {
        stubQuestionsInDb();
        const io = createFakeIo();

        await sendNextQuestion(io);
        await sendNextQuestion(io);
        await sendNextQuestion(io);

        expect(gameState.getGameState()).toBe('GAME_OVER');
        expect(sentToRoom(io, 'game_room', 'game_state').at(-1)).toBe('GAME_OVER');
        expect(sentToRoom(io, 'game_room', 'update_players')).toHaveLength(1);
        expect(gameState.getCurrentQuestionIndex()).toBe(2);
    });
});

describe('eventos del HOST', () => {
    let io;
    let host;

    beforeEach(() => {
        io = createFakeIo();
        host = createFakeSocket(HOST_ID);
    });

    describe('next_question', () => {
        it('delega en sendNextQuestion', async () => {
            const next = vi.fn().mockResolvedValue();
            registerGameHandlers(io, host, next);

            await host.trigger('next_question');

            expect(next).toHaveBeenCalledWith(io);
        });

        it('si falla, avisa a la sala', async () => {
            registerGameHandlers(io, host, vi.fn().mockRejectedValue(new Error('sin conexión')));

            await host.trigger('next_question');

            expect(sentToRoom(io, 'game_room', 'error')).toEqual([{ message: 'Error al avanzar pregunta' }]);
        });
    });

    describe('activate_answers', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            registerGameHandlers(io, host, sendNextQuestion);
        });

        it.each(['LOBBY', 'QUESTION_ACTIVE', 'SHOW_ANSWER', 'GAME_OVER'])(
            'se ignora si la partida está en %s',
            (state) => {
                putQuestionInState(0, state);

                host.trigger('activate_answers');

                expect(gameState.getGameState()).toBe(state);
                expect(io.emitted).toEqual([]);
            }
        );

        it('habilita las respuestas y envía la pregunta a toda la sala', () => {
            putQuestionInState(0, 'QUESTION_LOCKED');

            host.trigger('activate_answers');

            expect(gameState.getGameState()).toBe('QUESTION_ACTIVE');
            expect(sentToRoom(io, 'game_room', 'game_state')).toEqual(['QUESTION_ACTIVE']);
            const [question] = sentToRoom(io, 'game_room', 'new_question');
            expect(question).toEqual({
                title: QUESTIONS[0].title,
                options: QUESTIONS[0].options,
                type: QUESTIONS[0].type,
                mediaUrl: QUESTIONS[0].mediaUrl,
            });
            expect(question).not.toHaveProperty('correctIndex');
        });

        it('arranca el temporizador con el tiempo de la pregunta', () => {
            putQuestionInState(1, 'QUESTION_LOCKED');

            host.trigger('activate_answers');

            expect(sentToRoom(io, 'game_room', 'timer_update')).toEqual([{ remainingTime: 20 }]);
        });

        it('usa 10 segundos si la pregunta no define tiempo', () => {
            gameState.setQuestions([{ ...QUESTIONS[0], timeLimit: undefined }]);
            putQuestionInState(0, 'QUESTION_LOCKED');

            host.trigger('activate_answers');

            expect(sentToRoom(io, 'game_room', 'timer_update')).toEqual([{ remainingTime: 10 }]);
        });

        it('descuenta un segundo por vez y avisa cuando se acaba el tiempo', () => {
            putQuestionInState(0, 'QUESTION_LOCKED'); // 15 segundos

            host.trigger('activate_answers');
            vi.advanceTimersByTime(14000);

            expect(sentToRoom(io, 'game_room', 'timer_update').at(-1)).toEqual({ remainingTime: 1 });
            expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(0);

            vi.advanceTimersByTime(1000);

            expect(sentToRoom(io, 'game_room', 'timer_update').at(-1)).toEqual({ remainingTime: 0 });
            expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(1);
        });

        it('el temporizador se detiene al llegar a cero', () => {
            putQuestionInState(0, 'QUESTION_LOCKED');

            host.trigger('activate_answers');
            vi.advanceTimersByTime(15000);
            const updatesAtZero = sentToRoom(io, 'game_room', 'timer_update').length;
            vi.advanceTimersByTime(10000);

            expect(sentToRoom(io, 'game_room', 'timer_update')).toHaveLength(updatesAtZero);
            expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(1);
            expect(gameState.getTimerInterval()).toBeNull();
        });
    });

    describe('show_answer', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            registerGameHandlers(io, host, sendNextQuestion);
        });

        it.each(['LOBBY', 'QUESTION_LOCKED', 'SHOW_ANSWER', 'GAME_OVER'])(
            'se ignora si la partida está en %s',
            (state) => {
                putQuestionInState(0, state);

                host.trigger('show_answer');

                expect(gameState.getGameState()).toBe(state);
                expect(io.emitted).toEqual([]);
            }
        );

        it('revela la respuesta correcta a toda la sala, no solo al HOST', () => {
            putQuestionInState(0, 'QUESTION_ACTIVE');

            host.trigger('show_answer');

            expect(gameState.getGameState()).toBe('SHOW_ANSWER');
            expect(sentToRoom(io, 'game_room', 'show_correct_answer')).toEqual([
                { correctIndex: 2, correctOption: 'Júpiter' },
            ]);
            expect(sentToRoom(io, 'game_room', 'game_state')).toEqual(['SHOW_ANSWER']);
        });

        it('la revelación trae solo la respuesta, sin el texto de la pregunta', () => {
            putQuestionInState(0, 'QUESTION_ACTIVE');

            host.trigger('show_answer');

            const [reveal] = sentToRoom(io, 'game_room', 'show_correct_answer');
            expect(Object.keys(reveal).sort()).toEqual(['correctIndex', 'correctOption']);
        });

        it('detiene el temporizador en curso', () => {
            putQuestionInState(0, 'QUESTION_LOCKED');
            host.trigger('activate_answers');
            vi.advanceTimersByTime(3000);

            host.trigger('show_answer');
            const updatesAtReveal = sentToRoom(io, 'game_room', 'timer_update').length;
            vi.advanceTimersByTime(20000);

            expect(sentToRoom(io, 'game_room', 'timer_update')).toHaveLength(updatesAtReveal);
            expect(sentToRoom(io, 'game_room', 'timer_finished')).toHaveLength(0);
            expect(gameState.getTimerInterval()).toBeNull();
        });
    });
});
