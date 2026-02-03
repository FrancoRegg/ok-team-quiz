const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Comparar strings de forma segura (prevenir timing attacks)
const secureCompare = (a, b) => {
    if (!a || !b || a.length !== b.length) {
        return false;
    }
    
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    
    return crypto.timingSafeEqual(bufA, bufB);
}

router.post('/login', (req, res) => {
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
        console.log('⛔ Intento de login con contraseña incorrecta');
        
        // Delay aleatorio para evitar timing attacks
        setTimeout(() => {
            res.status(401).json({ 
                success: false, 
                message: "Contraseña incorrecta" 
            });
        }, Math.random() * 100 + 100);  // 100-200ms
    }
});

module.exports = router;