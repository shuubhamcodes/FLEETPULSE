const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Insert an alert into the alerts table
 * @param {string} vehicle_id - The ID of the vehicle
 * @param {'fuel'|'route'|'temp'} type - The type of alert
 * @param {'low'|'medium'|'high'} severity - The severity level
 * @param {string} message - Alert message
 * @returns {Promise<{data: any, error: any}>} Supabase response
 */
async function insertAlert(vehicle_id, type, severity, message) {
  try {
    const alert = {
      vehicle_id,
      type,
      severity,
      message,
      status: 'new'
    };

    const { data, error } = await supabase
      .from('alerts')
      .insert([alert]);

    if (error) {
      console.error('Error inserting alert:', error);
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Failed to insert alert:', error);
    return { data: null, error };
  }
}

/**
 * Get user role from Supabase
 * @param {string} userId - The user ID to check
 * @returns {Promise<string|null>} The user's role or null if not found
 */
async function getUserRole(userId) {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
}

module.exports = {
  supabase,
  insertAlert,
  getUserRole,
  default: supabase
};