const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Password = sequelize.define('Password', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    passwordHash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        field: 'password_hash'
    },
    isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_default'
    },
    recoveryCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
        field: 'recovery_code'
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: 'updated_at'
    }
}, {
    tableName: 'passwords',
    timestamps: false
});

module.exports = Password;