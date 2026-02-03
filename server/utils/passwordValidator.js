const validateAdminPassword = (password) => {
    if (!password) {
        return {
            valid: false,
            error: 'ADMIN_PASSWORD no está definida en .env'
        };
    }

    const errors = [];

    // Mínimo 8 caracteres
    if (password.length < 8) {
        errors.push('debe tener al menos 8 caracteres');
    }

    // Al menos una mayúscula
    if (!/[A-Z]/.test(password)) {
        errors.push('debe contener al menos una mayúscula');
    }

    // Al menos una minúscula
    if (!/[a-z]/.test(password)) {
        errors.push('debe contener al menos una minúscula');
    }

    // Al menos un número
    if (!/[0-9]/.test(password)) {
        errors.push('debe contener al menos un número');
    }

    // Contraseñas comunes prohibidas
    const commonPasswords = [
        'admin123', 'password', 'Password1', 'Admin123', 
        '12345678', 'Qwerty123', 'Password123'
    ];
    
    if (commonPasswords.includes(password)) {
        errors.push('es demasiado común y está prohibida');
    }

    if (errors.length > 0) {
        return {
            valid: false,
            error: `Contraseña débil: ${errors.join(', ')}`
        };
    }

    return { valid: true };
}

module.exports = { validateAdminPassword };