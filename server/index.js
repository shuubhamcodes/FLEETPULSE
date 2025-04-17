require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { supabase, insertAlert, getUserRole } = require('./supabaseClient');

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

// Middleware to check if user is a technician
async function checkTechnicianRole(req, res, next) {
  try {
    const user = await validateToken(req.headers.authorization);
    const role = await getUserRole(user.id);

    if (role !== 'technician') {
      return res.status(403).json({ error: 'Access denied. Technicians only.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
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

// Maintenance CRUD endpoints
app.get('/api/maintenance', checkTechnicianRole, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/maintenance', checkTechnicianRole, async (req, res) => {
  try {
    const { vehicle_id, issue } = req.body;

    if (!vehicle_id || !issue) {
      return res.status(400).json({ error: 'Vehicle ID and issue are required' });
    }

    const { data, error } = await supabase
      .from('maintenance_logs')
      .insert([{
        vehicle_id,
        issue,
        technician: req.user.email,
        resolved: false
      }])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/maintenance/:id', checkTechnicianRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('maintenance_logs')
      .update({ resolved: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Maintenance log not found' });
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/maintenance/:id', checkTechnicianRole, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('maintenance_logs')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});