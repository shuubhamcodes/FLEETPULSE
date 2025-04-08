const turf = require('@turf/turf');
const { insertAlert } = require('../supabaseClient');

/**
 * Check if a vehicle has deviated from its expected route
 * @param {Object} reading - Vehicle reading data
 * @param {number} reading.lat - Latitude
 * @param {number} reading.lon - Longitude
 * @param {string} reading.vehicle_id - Vehicle ID
 * @param {Object} expectedPathGeoJSON - GeoJSON LineString of expected route
 * @returns {Promise<boolean>} - True if vehicle has deviated from route
 */
async function checkRouteDeviation(reading, expectedPathGeoJSON) {
  try {
    // Create a point from the current reading
    const point = turf.point([reading.lon, reading.lat]);
    
    // Create a line from the expected path
    const line = turf.lineString(expectedPathGeoJSON.coordinates);
    
    // Calculate the distance from point to line (in meters)
    const distance = turf.pointToLineDistance(point, line, { units: 'meters' });
    
    // Check if distance exceeds threshold (100 meters)
    const hasDeviated = distance > 100;
    
    if (hasDeviated) {
      await insertAlert(
        reading.vehicle_id,
        'route',
        'high',
        'Vehicle deviated from expected route'
      );
    }
    
    return hasDeviated;
  } catch (error) {
    console.error('Error checking route deviation:', error);
    return false;
  } // ✅ <--- this was missing
}

module.exports = { checkRouteDeviation };
