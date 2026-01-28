const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
    const { password } = req.body; 

    if (password === process.env.ADMIN_PASSWORD) {

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
        return res.status(401).json({ 
            success: false, 
            message: "Contraseña incorrecta" 
        });
    }
});

module.exports = router;