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
            'http://192.168.1.12:5173',   // Tu red local    
            'http://192.168.1.12:3000'
        ];

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
