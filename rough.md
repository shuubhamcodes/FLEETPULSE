-- /*
--   # Fleet Monitoring System Schema

--   1. New Tables
--     - `vehicles`: Core vehicle information
--     - `vehicle_readings`: Real-time telemetry data
--     - `alerts`: System alerts and warnings
--     - `maintenance_logs`: Vehicle maintenance records
--     - `user_roles`: User role assignments
--     - `routes`: Planned vehicle routes
--     - `geofences`: Geographic boundaries
--     - `notifications`: User notifications

--   2. Enums
--     - `alert_severity`: low, medium, high
--     - `alert_type`: fuel, route, temp
--     - `user_role`: admin, dispatcher, technician

--   3. Security
--     - Enable RLS on all tables
--     - Policies based on user roles
--     - Custom function for role checking
-- */

-- -- Create ENUMs
-- CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high');
-- CREATE TYPE alert_type AS ENUM ('fuel', 'route', 'temp');
-- CREATE TYPE user_role AS ENUM ('admin', 'dispatcher', 'technician');

-- -- Create tables
-- CREATE TABLE IF NOT EXISTS vehicles (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   plate_number text UNIQUE NOT NULL,
--   driver_name text NOT NULL,
--   model text NOT NULL,
--   status text NOT NULL DEFAULT 'active',
--   created_at timestamptz DEFAULT now(),
--   updated_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS vehicle_readings (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
--   lat decimal NOT NULL,
--   lon decimal NOT NULL,
--   speed decimal NOT NULL,
--   fuel decimal NOT NULL,
--   temp decimal NOT NULL,
--   timestamp timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS alerts (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
--   type alert_type NOT NULL,
--   severity alert_severity NOT NULL,
--   message text NOT NULL,
--   status text NOT NULL DEFAULT 'new',
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS maintenance_logs (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
--   issue text NOT NULL,
--   technician text NOT NULL,
--   resolved boolean DEFAULT false,
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS user_roles (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
--   role user_role NOT NULL,
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS routes (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
--   expected_path_geojson jsonb NOT NULL,
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS geofences (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   location_name text NOT NULL,
--   geojson_polygon jsonb NOT NULL,
--   alert_type alert_type NOT NULL,
--   created_at timestamptz DEFAULT now()
-- );

-- CREATE TABLE IF NOT EXISTS notifications (
--   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
--   type text NOT NULL,
--   message text NOT NULL,
--   read boolean DEFAULT false,
--   timestamp timestamptz DEFAULT now()
-- );

-- -- Create indexes
-- CREATE INDEX IF NOT EXISTS idx_vehicle_readings_vehicle_id ON vehicle_readings(vehicle_id);
-- CREATE INDEX IF NOT EXISTS idx_vehicle_readings_timestamp ON vehicle_readings(timestamp);
-- CREATE INDEX IF NOT EXISTS idx_alerts_vehicle_id ON alerts(vehicle_id);
-- CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
-- CREATE INDEX IF NOT EXISTS idx_maintenance_logs_vehicle_id ON maintenance_logs(vehicle_id);
-- CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
-- CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- -- Enable RLS
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE vehicle_readings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE geofences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- -- Create role check function
-- CREATE OR REPLACE FUNCTION get_user_role()
-- RETURNS user_role AS $$
-- BEGIN
--   RETURN (
--     SELECT role
--     FROM user_roles
--     WHERE user_id = auth.uid()
--     LIMIT 1
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- -- RLS Policies

-- -- Vehicles
-- CREATE POLICY "Allow admins full access to vehicles"
--   ON vehicles
--   USING (get_user_role() = 'admin')
--   WITH CHECK (get_user_role() = 'admin');

-- CREATE POLICY "Allow dispatchers to view vehicles"
--   ON vehicles
--   FOR SELECT
--   USING (get_user_role() = 'dispatcher');

-- CREATE POLICY "Allow technicians to view vehicles"
--   ON vehicles
--   FOR SELECT
--   USING (get_user_role() = 'technician');

-- -- Vehicle Readings
-- CREATE POLICY "Allow admins and dispatchers to view readings"
--   ON vehicle_readings
--   FOR SELECT
--   USING (get_user_role() IN ('admin', 'dispatcher'));

-- -- Alerts
-- CREATE POLICY "Allow admins full access to alerts"
--   ON alerts
--   USING (get_user_role() = 'admin')
--   WITH CHECK (get_user_role() = 'admin');

-- CREATE POLICY "Allow dispatchers to view and create alerts"
--   ON alerts
--   FOR SELECT
--   USING (get_user_role() = 'dispatcher');

-- -- Maintenance Logs
-- CREATE POLICY "Allow admins full access to maintenance logs"
--   ON maintenance_logs
--   USING (get_user_role() = 'admin')
--   WITH CHECK (get_user_role() = 'admin');

-- CREATE POLICY "Allow technicians to view and update maintenance logs"
--   ON maintenance_logs
--   FOR ALL
--   USING (get_user_role() = 'technician')
--   WITH CHECK (get_user_role() = 'technician');

-- -- User Roles
-- CREATE POLICY "Allow admins full access to user roles"
--   ON user_roles
--   USING (get_user_role() = 'admin')
--   WITH CHECK (get_user_role() = 'admin');

-- CREATE POLICY "Allow users to view their own role"
--   ON user_roles
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- -- Routes
-- CREATE POLICY "Allow admins and dispatchers full access to routes"
--   ON routes
--   USING (get_user_role() IN ('admin', 'dispatcher'))
--   WITH CHECK (get_user_role() IN ('admin', 'dispatcher'));

-- -- Geofences
-- CREATE POLICY "Allow admins full access to geofences"
--   ON geofences
--   USING (get_user_role() = 'admin')
--   WITH CHECK (get_user_role() = 'admin');

-- CREATE POLICY "Allow dispatchers to view geofences"
--   ON geofences
--   FOR SELECT
--   USING (get_user_role() = 'dispatcher');

-- -- Notifications
-- CREATE POLICY "Allow users to view their own notifications"
--   ON notifications
--   FOR SELECT
--   USING (auth.uid() = user_id);

-- CREATE POLICY "Allow users to update their own notifications"
--   ON notifications
--   FOR UPDATE
--   USING (auth.uid() = user_id)
--   WITH CHECK (auth.uid() = user_id);