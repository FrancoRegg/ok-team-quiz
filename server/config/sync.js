const { sequelize } = require('./db');

async function sincro (){
    try{
        await sequelize.sync();
        console.log('✅ Base de datos sincronizada');
    }catch(error){
        console.error('❌ Error al sincronizar BD', error);
        throw error;    
    }
};

module.exports = { sincro }; 