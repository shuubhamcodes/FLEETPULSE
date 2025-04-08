const turf = require('@turf/turf');
const{supabase} = require('../supabaseClient');




/**
 * Check if a point is inside a polygon and create notification
 * @param {Object} reading - Vehicle reading with lat/lon
 * @param {Object} geofence - Geofence data with polygon and metadata
 * @param {string} userId - User ID to notify
 * @returns {Promise<void>}
 */


async function createGeoFenceNotification(reading, geofence, userId){
    try{
        const{data:{user}} = await supabase.auth.admin.getUserById(userId);
        if(!user) return;
        await supabase.from('notifications').insert({
            user_id: userId,
            type:'geofence',
            message: `Vehicle ${reading.vehicle_id} has entered ${geofence.location_name}`,
            read:false
        })
        
    }catch(error){
        console.error('Error creating geeofence notification:', error);
    }
}



async function checkGeofences(reading){
    try{
        const {data: geofences, error} = await supabase.from('geofences').select('*');
        if(error) throw error;

        const point = turf.point([reading.lon, reading.lat]);

        for(const geofence of geofences){
            const polygoan = turf.polygon(geofence.geojson_ploygon.coordinates);
            const isInside = turf.booleanPointInPolygon(point,polygon);
            if(isInside){
                const {data:users} = await supabase
                .from('user_roles')
                .select('user_id')
                .in('role',['admin','dispatcher']);
              
                for(const user of(users || [])){
                    await createGeoFenceNotification(reading, geofence, user.user_id);
                }
                

            }
        }
    }catch(error){
        console.error('Error checking geofences:', error);
    }
}


module.exports ={
    checkGeooffences
}