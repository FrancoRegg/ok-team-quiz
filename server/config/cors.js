const cors = require('cors');

const configureCORS = () => {
    
    const allowedOrigins = process.env.NODE_ENV === 'production'
        ? [  
            process.env.CLIENT_URL,
            process.env.RENDER_EXTERNAL_URL,
            process.env.RAILWAY_STATIC_URL, 
            'https://ok-team-quiz-production.up.railway.app',
        ].filter(Boolean)
        : [
            'http://localhost:5173',      // Vite en desarrollo
            'http://localhost:3000',      // Si frontend y backend en mismo puerto
            'https://localhost:5173',     // Vite con `npm run dev:https`
            process.env.LOCAL_IP ? `http://${process.env.LOCAL_IP}:5173` : null ,   // Tu red local
            process.env.LOCAL_IP ? `http://${process.env.LOCAL_IP}:3000` : null,
            process.env.LOCAL_IP ? `https://${process.env.LOCAL_IP}:5173` : null    // Celular con `npm run dev:https`
        ].filter(Boolean);

    // Se nombra aparte para poder probarla sin levantar Express
    const checkOrigin = (origin, callback) => {
        // Permitir requests sin origin
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }

        console.log('⚠️ Origen bloqueado por CORS:', origin);

        // Sin status, el manejador global lo tomaba por un fallo del servidor
        // y respondía 500 «Error interno»: el navegador mostraba «Server
        // Error» sin pista de que el problema es el origen. Con 403 se
        // distingue de una caída real del servidor
        const error = new Error('Origen no permitido por CORS');
        error.status = 403;
        callback(error);
    };

    const corsOptions = {
        origin: checkOrigin,
        credentials: true,
    };

    console.log('✅ CORS configurado para:', allowedOrigins);
    
    return { corsMiddleware: cors(corsOptions), allowedOrigins, checkOrigin };
}

module.exports = { configureCORS };
