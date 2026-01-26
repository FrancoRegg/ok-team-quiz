const { sequelize } = require('./db');

async function dbSynchronization (){
    try{
        await sequelize.sync({ alter: true });
        console.log('✅ Base de datos sincronizada');
    }catch(error){
        console.error('❌ Error al sincronizar BD', error);
        throw error;    
    }
};

module.exports = { dbSynchronization }; 