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

    const corsOptions = {
        origin: (origin, callback) => {
            // Permitir requests sin origin
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log('⚠️ Origen bloqueado por CORS:', origin);
                callback(new Error('No permitido por CORS'));
            }
        },
        credentials: true,
    };

    console.log('✅ CORS configurado para:', allowedOrigins);
    
    return { corsMiddleware: cors(corsOptions), allowedOrigins };
}

module.exports = { configureCORS };
