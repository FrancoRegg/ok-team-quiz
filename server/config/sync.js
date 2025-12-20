const { sequelize } = require('./db');
const { Question } = require('../models/Questions')

async function sincro (){
try{
    await sequelize.sync();
    console.log('Tablas sincronizadas correctamente');
}catch(error){
    console.error('Error al sincronizar las tablas', error);    
}};

module.exports = { sincro }; 