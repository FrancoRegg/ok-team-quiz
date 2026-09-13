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
            process.env.JWT_SECRET,
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

router.post('/recover-with-code', async (req, res) => {
    const { recoveryCode, newPassword } = req.body;
    
    if (!recoveryCode || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Se requiere código de recuperación y nueva contraseña'
        });
    }
    
    try {
        const { validateAdminPassword } = require('../utils/passwordValidator');
        const Password = require('../models/Password');
        const bcrypt = require('bcrypt');
        
        // Buscar código en BD
        const passwordRecord = await Password.findOne({
            where: { recoveryCode: recoveryCode.toUpperCase().trim() }
        });
        
        if (!passwordRecord) {
            console.log('⛔ Intento de recuperación con código inválido desde IP:', req.ip);
            return res.status(401).json({
                success: false,
                message: 'Código de recuperación inválido'
            });
        }
        
        // Validar que nueva contraseña sea fuerte
        const validation = validateAdminPassword(newPassword);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }
        
        // Verificar que no sea la contraseña por defecto
        if (newPassword === 'Admin2024!') {
            return res.status(400).json({
                success: false,
                message: 'No puedes usar la contraseña por defecto'
            });
        }
        
        // Generar nuevo código de recuperación
        const { generateUniqueRecoveryCode } = require('../utils/passwordManager');
        const newRecoveryCode = await generateUniqueRecoveryCode();
        
        // Hashear nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Actualizar en BD
        passwordRecord.passwordHash = newPasswordHash;
        passwordRecord.isDefault = false;
        passwordRecord.recoveryCode = newRecoveryCode;
        passwordRecord.updatedAt = new Date();
        await passwordRecord.save();
        
        // El código nunca va a los logs: con él se puede resetear la contraseña
        console.log('✅ Contraseña recuperada exitosamente, nuevo código de recuperación emitido');
        
        return res.json({
            success: true,
            message: 'Contraseña actualizada correctamente',
            recoveryCode: newRecoveryCode
        });
        
    } catch (error) {
        console.error('❌ Error en recuperación:', error.message);
        return res.status(500).json({
            success: false,
            message: 'Error al recuperar contraseña'
        });
    }
});

module.exports = router;