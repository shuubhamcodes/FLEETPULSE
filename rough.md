const turf = require('@turf/turf');
const { supabase } = require('../supabaseClient');

/**
 * Check if a point is inside a polygon and create notification
 * @param {Object} reading - Vehicle reading with lat/lon
 * @param {Object} geofence - Geofence data with polygon and metadata
 * @param {string} userId - User ID to notify
 * @returns {Promise<void>}
 */
async function createGeofenceNotification(reading, geofence, userId) {
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    if (!user) return;

    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'geofence',
      message: `Vehicle ${reading.vehicle_id} has entered ${geofence.location_name}`,
      read: false
    });
  } catch (error) {
    console.error('Error creating geofence notification:', error);
  }
}

/**
 * Check if a vehicle reading triggers any geofence alerts
 * @param {Object} reading - Vehicle reading data
 * @returns {Promise<void>}
 */
async function checkGeofences(reading) {
  try {
    // Get all geofences
    const { data: geofences, error } = await supabase
      .from('geofences')
      .select('*');

    if (error) throw error;

    // Create point from reading
    const point = turf.point([reading.lon, reading.lat]);

    // Check each geofence
    for (const geofence of geofences) {
      const polygon = turf.polygon(geofence.geojson_polygon.coordinates);
      const isInside = turf.booleanPointInPolygon(point, polygon);

      if (isInside) {
        // Get all users with dispatcher or admin roles
        const { data: users } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'dispatcher']);

        // Create notifications for each relevant user
        for (const user of (users || [])) {
          await createGeofenceNotification(reading, geofence, user.user_id);
        }
      }
    }
  } catch (error) {
    console.error('Error checking geofences:', error);
  }
}

module.exports = {
  checkGeofences
};