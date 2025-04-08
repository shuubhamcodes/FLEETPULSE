require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase, insertAlert } = require('./supabaseClient');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Validate JWT token
async function validateToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error('Invalid token');
  }

  return user;
}

// Validate payload
function validatePayload(reading) {
  if (!reading.vehicle_id || !reading.lat || !reading.lon || 
      reading.speed === undefined || reading.fuel === undefined || 
      reading.temp === undefined || !reading.timestamp) {
    throw new Error('Missing required fields');
  }

  if (reading.temp < -40 || reading.temp > 120) {
    throw new Error('Temperature out of valid range (-40°C to 120°C)');
  }

  if (reading.fuel < 0 || reading.fuel > 100) {
    throw new Error('Fuel must be between 0% and 100%');
  }

  if (reading.lat < -90 || reading.lat > 90 || reading.lon < -180 || reading.lon > 180) {
    throw new Error('Invalid coordinates');
  }

  if (reading.speed < 0) {
    throw new Error('Speed cannot be negative');
  }
}

// Check and trigger alerts
async function checkAndTriggerAlerts(reading) {
  try {
    if (reading.temp > 90) {
      await insertAlert(
        reading.vehicle_id,
        'temp',
        'high',
        'High engine temperature'
      );
    }

    if (reading.fuel < 20) {
      await insertAlert(
        reading.vehicle_id,
        'fuel',
        'medium',
        'Low fuel level'
      );
    }
  } catch (error) {
    console.error('Error triggering alerts:', error);
  }
}

// Ingest vehicle route
app.post('/api/ingest-vehicle', async (req, res) => {
  try {
    // Validate authentication
    await validateToken(req.headers.authorization);

    // Validate payload
    const reading = req.body;
    validatePayload(reading);

    // Insert reading
    const { error: insertError } = await supabase
      .from('vehicle_readings')
      .insert([reading]);

    if (insertError) {
      throw new Error(`Error inserting reading: ${insertError.message}`);
    }

    // Check for alerts
    await checkAndTriggerAlerts(reading);

    res.json({ success: true });

  } catch (error) {
    res.status(error.message.includes('auth') ? 401 : 400).json({
      error: error.message
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});