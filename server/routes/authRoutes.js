const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { validatePassword, isUsingDefaultPassword } = require('../utils/passwordManager');
const { authenticateAdmin } = require('../middleware/auth');

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

// Aplicar rate limiter al endpoint de login
router.post('/login', loginLimiter, async (req, res) => {  // ← async
    const { password } = req.body;

    if (!password) {
        console.log('⛔ Intento de login sin contraseña');
        return res.status(400).json({ 
            success: false, 
            message: "Contraseña requerida" 
        });
    }

    // Validar contraseña contra BD
    const isValid = await validatePassword(password);
    
    if (isValid) {
        
        const token = jwt.sign(
            { role: 'admin', timestamp: Date.now() },
            process.env.JWT_SECRET || 'fallback-secret-key',
            { expiresIn: '24h' }
        );

        console.log('✅ Admin autenticado, token generado');
        
        // Verificar si está usando contraseña por defecto
        const usingDefault = await isUsingDefaultPassword();

        return res.json({ 
            success: true, 
            message: "Acceso concedido",
            token: token,
            isDefaultPassword: usingDefault
        });
    } else {
        console.log('⛔ Intento de login con contraseña incorrecta desde IP:', req.ip);
        
        return res.status(401).json({ 
            success: false, 
            message: "Contraseña incorrecta" 
        });
    }
});

router.post('/change-password', authenticateAdmin, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Se requiere contraseña actual y nueva contraseña'
        });
    }
    
    const { changePassword } = require('../utils/passwordManager');
    const result = await changePassword(currentPassword, newPassword);
    
    if (result.success) {
        return res.json(result);
    } else {
        return res.status(400).json(result);
    }
});

module.exports = router;