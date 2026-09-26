const { configureCORS } = require('../config/cors');

// Arma la configuración como en el arranque del server y devuelve la función
// real que decide cada origen, sin levantar Express
const corsFor = (env, extraEnv = {}) => {
    vi.stubEnv('NODE_ENV', env);
    for (const [key, value] of Object.entries(extraEnv)) {
        vi.stubEnv(key, value);
    }

    return configureCORS();
};

// Lo que el middleware de cors recibe del checker
const decide = (checkOrigin, origin) =>
    new Promise((resolve) => {
        checkOrigin(origin, (error, allowed) => resolve({ error, allowed }));
    });

describe('la lista de orígenes', () => {
    it('en producción solo tiene los configurados por variables de entorno', () => {
        const { allowedOrigins } = corsFor('production', {
            CLIENT_URL: 'https://ok-team-quiz.onrender.com',
        });

        expect(allowedOrigins).toContain('https://ok-team-quiz.onrender.com');
        expect(allowedOrigins).not.toContain('http://localhost:5173');
    });

    it('en desarrollo tiene el Vite local', () => {
        const { allowedOrigins } = corsFor('development');

        expect(allowedOrigins).toContain('http://localhost:5173');
    });
});

describe('la decisión sobre cada origen', () => {
    it('acepta el origen configurado', async () => {
        const { checkOrigin } = corsFor('production', {
            CLIENT_URL: 'https://ok-team-quiz.onrender.com',
        });

        const { error, allowed } = await decide(checkOrigin, 'https://ok-team-quiz.onrender.com');

        expect(error).toBeNull();
        expect(allowed).toBe(true);
    });

    it('rechaza un origen ajeno con status 403, no con un 500', async () => {
        const { checkOrigin } = corsFor('production', {
            CLIENT_URL: 'https://ok-team-quiz.onrender.com',
        });

        const { error, allowed } = await decide(checkOrigin, 'https://sitio-ajeno.com');

        expect(allowed).toBeUndefined();
        expect(error).toBeInstanceOf(Error);
        // Sin esto, el manejador global responde «Error interno del servidor»
        expect(error.status).toBe(403);
    });

    it('deja pasar a los pedidos sin origen, como los health checks', async () => {
        const { checkOrigin } = corsFor('production', {
            CLIENT_URL: 'https://ok-team-quiz.onrender.com',
        });

        const { error, allowed } = await decide(checkOrigin, undefined);

        expect(error).toBeNull();
        expect(allowed).toBe(true);
    });
});
