// Dobles de Socket.io: permiten ejercitar los handlers sin red.
//
// Cada doble registra lo que se emite, para que el test pueda preguntar
// "¿qué recibió la sala?" o "¿qué le llegó a este socket?".

const createFakeIo = () => {
    const emitted = [];

    return {
        emitted,
        to: (room) => ({
            emit: (event, data) => emitted.push({ room, event, data }),
        }),
        emit: (event, data) => emitted.push({ room: '*', event, data }),
    };
};

const createFakeSocket = (id) => {
    const handlers = {};
    const emitted = [];
    const rooms = new Set();

    return {
        id,
        emitted,
        rooms,
        // socket.data: donde el server marca al panel admin autenticado
        data: {},
        on: (event, handler) => { handlers[event] = handler; },
        emit: (event, data) => emitted.push({ event, data }),
        join: (room) => rooms.add(room),
        disconnect: vi.fn(),
        // Dispara un evento como si llegara del cliente. Devuelve la promesa
        // del handler, así los tests pueden esperar a los handlers async.
        trigger: (event, data) => {
            if (!handlers[event]) throw new Error(`El socket no registró el evento "${event}"`);
            return handlers[event](data);
        },
    };
};

// Lo que recibió una sala (o '*' para io.emit global) de un evento dado
const sentToRoom = (io, room, event) =>
    io.emitted.filter((e) => e.room === room && e.event === event).map((e) => e.data);

// Lo que recibió un socket puntual de un evento dado
const sentToSocket = (socket, event) =>
    socket.emitted.filter((e) => e.event === event).map((e) => e.data);

module.exports = { createFakeIo, createFakeSocket, sentToRoom, sentToSocket };
