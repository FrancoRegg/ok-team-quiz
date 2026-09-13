// Se ejecuta antes de cada archivo de test (vitest.config.mjs → setupFiles).

// Barrera de seguridad: los tests nunca tocan una base de datos real. Toda
// operación de Sequelize pide una conexión; acá la reemplazamos por un error.
// Sin esto, una llamada que un test olvidó simular escribiría en la base del
// .env local del desarrollador.
const { sequelize } = require('../config/db');

sequelize.connectionManager.getConnection = async () => {
    throw new Error(
        'Un test intentó acceder a la base de datos real. ' +
        'Simulá la llamada al modelo con vi.spyOn(Modelo, "metodo").'
    );
};

afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
});
