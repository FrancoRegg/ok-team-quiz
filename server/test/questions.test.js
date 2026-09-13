const Question = require('../models/Questions');
const {
    getQuestion,
    createQuestion,
    updateQuestion,
    deleteQuestion,
} = require('../controllers/question.controller');

// Respuesta de Express simulada: registra status y cuerpo
const fakeRes = () => {
    const res = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.end = vi.fn().mockReturnValue(res);
    return res;
};

const validQuestion = (overrides = {}) => ({
    title: '¿Cuál es el planeta más grande?',
    type: 'TEXT',
    options: ['Tierra', 'Júpiter'],
    correctIndex: 1,
    ...overrides,
});

// Ejecuta createQuestion y devuelve { status, body, created }
const create = async (body) => {
    const store = vi.spyOn(Question, 'create').mockImplementation(async (data) => ({ id: 'nueva', ...data }));
    const res = fakeRes();
    await createQuestion({ body }, res);
    return {
        status: res.status.mock.calls[0][0],
        body: res.json.mock.calls[0][0],
        created: store.mock.calls[0]?.[0],
    };
};

describe('createQuestion: validación', () => {
    it('guarda una pregunta válida y responde 201', async () => {
        const { status, created } = await create(validQuestion());

        expect(status).toBe(201);
        expect(created).toMatchObject({ title: '¿Cuál es el planeta más grande?', correctIndex: 1 });
    });

    it.each([
        ['sin título', { title: undefined }, 'El título es obligatorio'],
        ['título muy corto', { title: 'Hola' }, 'El título debe tener al menos 5 caracteres'],
        ['título demasiado largo', { title: 'x'.repeat(501) }, 'El título no puede superar 500 caracteres'],
        ['tipo inexistente', { type: 'AUDIO' }, 'El tipo debe ser TEXT, IMAGE o VIDEO'],
        ['sin opciones', { options: undefined }, 'Las opciones son obligatorias'],
        ['opciones que no son lista', { options: 'Tierra,Júpiter' }, 'Las opciones deben ser un array'],
        ['una sola opción', { options: ['Tierra'], correctIndex: 0 }, 'Debe haber al menos 2 opciones'],
        ['siete opciones', { options: ['1', '2', '3', '4', '5', '6', '7'] }, 'No puede haber más de 6 opciones'],
        ['opción vacía', { options: ['Tierra', '   '] }, 'La opción 2 no puede estar vacía'],
        ['opción que no es texto', { options: ['Tierra', 42] }, 'La opción 2 debe ser texto'],
        ['opción demasiado larga', { options: ['Tierra', 'x'.repeat(201)] }, 'La opción 2 no puede superar 200 caracteres'],
        ['sin respuesta correcta', { correctIndex: undefined }, 'Debe indicar cuál es la respuesta correcta'],
        ['respuesta correcta no numérica', { correctIndex: 'segunda' }, 'El índice de respuesta correcta debe ser un número'],
        ['respuesta correcta negativa', { correctIndex: -1 }, 'El índice de respuesta correcta no puede ser negativo'],
        ['respuesta correcta fuera de rango', { correctIndex: 2 }, 'El índice de respuesta correcta (2) está fuera de rango. Hay 2 opciones.'],
        ['imagen sin URL', { type: 'IMAGE' }, 'Debe proporcionar una URL para el tipo IMAGE'],
        ['video sin URL', { type: 'VIDEO' }, 'Debe proporcionar una URL para el tipo VIDEO'],
        ['URL con protocolo no permitido', { type: 'IMAGE', mediaUrl: 'javascript:alert(1)' }, 'La URL del archivo multimedia no es válida'],
        ['URL mal formada', { type: 'IMAGE', mediaUrl: 'no es una url' }, 'La URL del archivo multimedia no es válida'],
    ])('rechaza con 400: %s', async (_caso, overrides, message) => {
        const { status, body, created } = await create(validQuestion(overrides));

        expect(status).toBe(400);
        expect(body.message).toBe('Datos invalidos');
        expect(body.errors).toContain(message);
        expect(created).toBeUndefined();
    });

    it('devuelve todos los errores juntos, no solo el primero', async () => {
        const { body } = await create({ title: 'x', options: ['uno'], correctIndex: 5 });

        expect(body.errors).toEqual(expect.arrayContaining([
            'El título debe tener al menos 5 caracteres',
            'Debe haber al menos 2 opciones',
        ]));
        expect(body.errors.length).toBeGreaterThanOrEqual(3);
    });
});

describe('createQuestion: normalización de datos', () => {
    it('quita scripts del título y de las opciones', async () => {
        const { created } = await create(validQuestion({
            title: '¿Planeta más grande?<script>alert(1)</script>',
            options: ['Tierra<script>robar()</script>', 'Júpiter'],
        }));

        expect(created.title).toBe('¿Planeta más grande?');
        expect(created.options).toEqual(['Tierra', 'Júpiter']);
    });

    it('recorta espacios al principio y al final', async () => {
        const { created } = await create(validQuestion({ title: '   ¿Planeta más grande?   ', options: [' Tierra ', 'Júpiter'] }));

        expect(created.title).toBe('¿Planeta más grande?');
        expect(created.options[0]).toBe('Tierra');
    });

    it('convierte el índice correcto a número', async () => {
        const { created } = await create(validQuestion({ correctIndex: '1' }));
        expect(created.correctIndex).toBe(1);
    });

    it('usa TEXT si no se indica el tipo', async () => {
        const { created } = await create(validQuestion({ type: undefined }));
        expect(created.type).toBe('TEXT');
    });

    it('descarta la URL multimedia en preguntas de solo texto', async () => {
        const { created } = await create(validQuestion({ type: 'TEXT', mediaUrl: 'https://example.com/foto.jpg' }));
        expect(created.mediaUrl).toBeNull();
    });

    it('conserva la URL en preguntas con imagen', async () => {
        const { status, created } = await create(validQuestion({ type: 'IMAGE', mediaUrl: 'https://example.com/foto.jpg' }));

        expect(status).toBe(201);
        expect(created.mediaUrl).toBe('https://example.com/foto.jpg');
    });
});

describe('createQuestion: errores de base de datos', () => {
    it('responde 500 con un mensaje genérico', async () => {
        vi.spyOn(Question, 'create').mockRejectedValue(new Error('sin conexión'));
        const res = fakeRes();

        await createQuestion({ body: validQuestion() }, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Error al crear preguntas' });
    });
});

describe('updateQuestion', () => {
    it('responde 404 si la pregunta no existe', async () => {
        vi.spyOn(Question, 'findByPk').mockResolvedValue(null);
        const res = fakeRes();

        await updateQuestion({ params: { id: 'no-existe' }, body: validQuestion() }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('valida igual que al crear y no guarda datos inválidos', async () => {
        const existing = { update: vi.fn() };
        vi.spyOn(Question, 'findByPk').mockResolvedValue(existing);
        const res = fakeRes();

        await updateQuestion({ params: { id: 'q1' }, body: validQuestion({ options: ['sola'] }) }, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(existing.update).not.toHaveBeenCalled();
    });

    it('guarda los datos normalizados y responde 200', async () => {
        const existing = { update: vi.fn().mockResolvedValue() };
        vi.spyOn(Question, 'findByPk').mockResolvedValue(existing);
        const res = fakeRes();

        await updateQuestion({ params: { id: 'q1' }, body: validQuestion({ correctIndex: '0' }) }, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ correctIndex: 0 }));
    });
});

describe('deleteQuestion', () => {
    it('responde 404 si la pregunta no existe', async () => {
        vi.spyOn(Question, 'findByPk').mockResolvedValue(null);
        const res = fakeRes();

        await deleteQuestion({ params: { id: 'no-existe' } }, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('borra la pregunta y responde 204 sin cuerpo', async () => {
        const existing = { destroy: vi.fn().mockResolvedValue() };
        vi.spyOn(Question, 'findByPk').mockResolvedValue(existing);
        const res = fakeRes();

        await deleteQuestion({ params: { id: 'q1' } }, res);

        expect(existing.destroy).toHaveBeenCalledOnce();
        expect(res.status).toHaveBeenCalledWith(204);
        expect(res.end).toHaveBeenCalled();
    });
});

describe('getQuestion', () => {
    it('devuelve todas las preguntas', async () => {
        vi.spyOn(Question, 'findAll').mockResolvedValue([{ id: 'q1' }, { id: 'q2' }]);
        const res = fakeRes();

        await getQuestion({}, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith([{ id: 'q1' }, { id: 'q2' }]);
    });
});
