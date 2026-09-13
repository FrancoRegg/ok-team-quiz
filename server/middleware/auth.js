const jwt = require('jsonwebtoken')

const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        console.log('⛔ Request sin token de autorización');
        return res.status(401).json({ 
            error: 'No autorizado - Token requerido' 
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        console.log('⛔ Token vacío');
        return res.status(401).json({ 
            error: 'No autorizado - Token vacío' 
        });
    }
    
    // Verificar JWT
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        // Opcional: agregar info del token al request
        req.user = decoded;
        
        next();
    } catch (error) {
        console.log(`⛔ JWT inválido o expirado en ${req.method} ${req.originalUrl}:`, error.message);
        return res.status(403).json({ 
            error: 'No autorizado - Token inválido o expirado',
            details: error.message
        });
    }
};

module.exports = {authenticateAdmin};