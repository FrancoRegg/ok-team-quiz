const cors = require('cors');

function configureCORS() {
    const allowedOrigins = process.env.NODE_ENV === 'production' 
    ? [
        process.env.CLIENT_URL || 'https://ok-team-quiz-production.up.railway.app', // URL de producción
      ] 
    : [
        'http://localhost:5173',      // Vite en desarrollo
        'http://localhost:3000',      // Si frontend y backend en mismo puerto
        'http://192.168.1.13:5173',   // Tu red local    
        'http://192.168.1.13:3000'
      ];

    const corsOptions = {
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('No permitido por CORS'));
            }
        },
        credentials: true,
    };

    console.log('✅ CORS configurado para:', allowedOrigins);
    
    return { corsMiddleware: cors(corsOptions), allowedOrigins };
}

module.exports = { configureCORS };
