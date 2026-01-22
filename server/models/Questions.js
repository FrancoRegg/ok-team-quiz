const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db')

const Question = sequelize.define('Question', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },

    title: {
        type: DataTypes.TEXT, 
        allowNull: false
    },

    type: {
            type: DataTypes.ENUM('TEXT', 'IMAGE', 'VIDEO'),
            defaultValue: 'TEXT',
            allowNull: false
        },

    options: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false
    },
        
    mediaUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },

    correctIndex: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    timeLimit: {
        type: DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false,
        validate: {
            min: 5,
            max: 120
        }
    }
}, {
    tableName: 'questions',
    timestamps: true,
});


module.exports = Question