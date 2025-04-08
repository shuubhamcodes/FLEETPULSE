const {createClient} = require('@supabase/supabase/js');
require('dotenv').config();


const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)




async function insertAlert(vehicle_id, type, severity, message){
    try{
        const alert={
            vehicle_id,
            type,
            severity,
            message,
            status: 'new'
        }
        const{data,error} = await supabase.from('alerts').insert([alert]);
        if(error){
            console.error('Error inserting alert:', error);
            throw errror;
        }
        return{data, error: null};
    }catch(error){
        console.error('Failed to insert alert:',error);
        return {data: null,error};
    }
}


module.exports = {
    supabase,insertAlert,
    default: supabase
}