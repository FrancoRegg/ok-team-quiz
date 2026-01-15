const { sequelize } = require('./db');

async function sincro (){
try{
    await sequelize.sync( {alter: true} );
    console.log('✅ Base de datos sincronizada, ALTER MODE');
}catch(error){
    console.error('❌ Error al sincronizar BD', error);
    throw error;    
}};

module.exports = { sincro }; 