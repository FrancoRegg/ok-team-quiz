const bcrypt = require('bcrypt');
const Password = require('../models/Password');
const { validateAdminPassword } = require('./passwordValidator');

const DEFAULT_PASSWORD = 'Admin2024!';

const initializePassword = async() => {
    try {
        const count = await Password.count();
        
        if (count === 0) {
            console.log('🔐 Primera vez: Creando contraseña por defecto...');
            
            // Hashear contraseña por defecto
            const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
            
            // Guardar en BD
            await Password.create({ 
                passwordHash,
                isDefault: true
            });
            
            console.log('⚠️  CONTRASEÑA POR DEFECTO CREADA: "Admin2024!"');
            console.log('⚠️  DEBES CAMBIARLA AL PRIMER LOGIN');
        } else {
            console.log('✅ Contraseña configurada en BD');
        }
    } catch (error) {
        console.error('❌ Error al inicializar contraseña:', error.message);
        throw error;
    }
}

async function validatePassword(password) {
    try {
        const passwordRecord = await Password.findOne();
        
        if (!passwordRecord) {
            throw new Error('No hay contraseña configurada en BD');
        }
        
        return await bcrypt.compare(password, passwordRecord.passwordHash);
    } catch (error) {
        console.error('❌ Error al validar contraseña:', error.message);
        return false;
    }
}

async function isUsingDefaultPassword() {
    try {
        const passwordRecord = await Password.findOne();
        return passwordRecord?.isDefault === true;
    } catch (error) {
        console.error('❌ Error al verificar contraseña por defecto:', error.message);
        return false;
    }
}

async function changePassword(currentPassword, newPassword) {
    try {
        // Validar contraseña actual
        const isValid = await validatePassword(currentPassword);
        if (!isValid) {
            return {
                success: false,
                message: 'Contraseña actual incorrecta'
            };
        }
        
        // Validar que nueva contraseña sea fuerte
        const validation = validateAdminPassword(newPassword);
        if (!validation.valid) {
            return {
                success: false,
                message: validation.error
            };
        }
        
        // Verificar que no sea la contraseña por defecto
        if (newPassword === DEFAULT_PASSWORD) {
            return {
                success: false,
                message: 'No puedes usar la contraseña por defecto'
            };
        }
        
        // Hashear nueva contraseña
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Actualizar en BD
        const passwordRecord = await Password.findOne();
        if (!passwordRecord) {
            throw new Error('No hay contraseña en BD');
        }
        
        passwordRecord.passwordHash = newPasswordHash;
        passwordRecord.isDefault = false;
        passwordRecord.updatedAt = new Date();
        await passwordRecord.save();
        
        console.log('✅ Contraseña actualizada correctamente');
        
        return {
            success: true,
            message: 'Contraseña actualizada correctamente'
        };
        
    } catch (error) {
        console.error('❌ Error al cambiar contraseña:', error.message);
        return {
            success: false,
            message: 'Error al cambiar contraseña'
        };
    }
}

module.exports = {
    initializePassword,
    validatePassword,
    isUsingDefaultPassword,
    changePassword
};