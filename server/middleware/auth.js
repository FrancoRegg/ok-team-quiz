const jwt = require('jsonwebtoken')

const authenticateAdmin = (req, res, next) => {
    console.log('🔍 authenticateAdmin - Validando request a:', req.path);
    
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
        console.log('✅ JWT válido:', decoded);
        
        // Opcional: agregar info del token al request
        req.user = decoded;
        
        next();
    } catch (error) {
        console.log('⛔ JWT inválido o expirado:', error.message);
        return res.status(403).json({ 
            error: 'No autorizado - Token inválido o expirado',
            details: error.message
        });
    }
};

module.exports = {authenticateAdmin};