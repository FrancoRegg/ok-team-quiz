const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Player = sequelize.define('Player', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            notEmpty: true
        }
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        }
    },
    isConnected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_connected'
    }
}, {
    tableName: 'players',
    timestamps: true,
    underscored: true
});

module.exports = Player;