const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

// Rate Limiter
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    message: {
        success: false,
        message: 'Demasiados intentos de login. Por favor, espera 15 minutos e intenta de nuevo.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        console.log('🚫 Rate limit alcanzado para IP:', req.ip);
        res.status(429).json({
            success: false,
            message: 'Demasiados intentos de login. Espera 15 minutos.'
        });
    }
});

// Comparar strings de forma segura (prevenir timing attacks)
const secureCompare = (a, b) => {
    if (!a || !b || a.length !== b.length) {
        return false;
    }
    
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    return crypto.timingSafeEqual(bufA, bufB);
}

// Aplicar rate limiter al endpoint de login
router.post('/login', loginLimiter, (req, res) => {
    const { password } = req.body;

    if (!password) {
        console.log('⛔ Intento de login sin contraseña');
        return res.status(400).json({ 
            success: false, 
            message: "Contraseña requerida" 
        });
    }

    // Comparación segura contra timing attacks
    if (secureCompare(password, process.env.ADMIN_PASSWORD)) {
        
        // Genera JWT que expira en 24 horas
        const token = jwt.sign(
            { role: 'admin', timestamp: Date.now() },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        console.log('✅ Admin autenticado, token generado');

        return res.json({ 
            success: true, 
            message: "Acceso concedido",
            token: token
        });
    } else {
        console.log('⛔ Intento de login con contraseña incorrecta desde IP:', req.ip);
        
        return res.status(401).json({ 
            success: false, 
            message: "Contraseña incorrecta" 
        });
    }
});

module.exports = router;