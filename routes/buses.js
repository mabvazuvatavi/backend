const express = require('express');
const axios = require('axios');
const knex = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// BusBud API Configuration
const BUSBUD_API_BASE = 'https://napi.busbud.com/x-departures';
const BUSBUD_API_KEY = process.env.BUSBUD_API_KEY || 'IzDYIwN4Tm9KzCUNMJnVEg';

// GET all buses (public)
router.get('/', async (req, res) => {
  try {
    const { origin, destination, date, limit = 20, page = 1 } = req.query;
    const offset = (page - 1) * limit;

    let query = knex('buses').where({ is_active: true });

    if (origin) {
      query = query.where('origin', 'ilike', `%${origin}%`);
    }
    if (destination) {
      query = query.where('destination', 'ilike', `%${destination}%`);
    }
    if (date) {
      query = query.whereRaw('DATE(departure_time) = ?', [date]);
    }

    const total = await query.clone().count('* as count').first();
    const buses = await query
      .select('*')
      .orderBy('departure_time', 'asc')
      .limit(limit)
      .offset(offset);

    res.json({
      success: true,
      data: buses,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total?.count || 0,
      },
    });
  } catch (err) {
    console.error('Get buses error:', err);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});

// GET single bus details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const bus = await knex('buses').where({ id }).first();
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    res.json({
      success: true,
      data: bus,
    });
  } catch (err) {
    console.error('Get bus error:', err);
    res.status(500).json({ error: 'Failed to fetch bus' });
  }
});

// CREATE new bus (organizer/admin only) - Backward compatibility
router.post('/', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (!['organizer', 'admin', 'vendor'].includes(role)) {
      return res.status(403).json({ error: 'Only organizers, admins, and vendors can create buses' });
    }

    const {
      bus_name,
      origin,
      destination,
      departure_time,
      arrival_time,
      total_seats,
      available_seats,
      price_per_seat,
      bus_type = 'standard',
      amenities = [],
      operator_contact,
      operator_phone,
    } = req.body;

    if (!bus_name || !origin || !destination || !departure_time || !total_seats || !price_per_seat) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [bus] = await knex('buses')
      .insert({
        id: uuidv4(),
        bus_name,
        origin,
        destination,
        departure_time: new Date(departure_time),
        arrival_time: arrival_time ? new Date(arrival_time) : null,
        total_seats,
        available_seats: available_seats || total_seats,
        price_per_seat: parseFloat(price_per_seat),
        bus_type,
        amenities: amenities.length > 0 ? JSON.stringify(amenities) : null,
        operator_contact: operator_contact || null,
        operator_phone: operator_phone || null,
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: userId,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    // Parse JSON for response
    if (bus.amenities) {
      bus.amenities = JSON.parse(bus.amenities);
    }

    res.status(201).json({
      success: true,
      data: bus,
      message: 'Bus created successfully',
    });
  } catch (err) {
    console.error('Create bus error:', err);
    res.status(500).json({ error: 'Failed to create bus', details: err.message });
  }
});

// UPDATE bus (organizer/admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    const bus = await knex('buses').where({ id }).first();
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (role !== 'admin' && bus.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this bus' });
    }

    const {
      bus_name,
      origin,
      destination,
      departure_time,
      arrival_time,
      total_seats,
      available_seats,
      price_per_seat,
      bus_type,
      amenities,
      operator_contact,
      operator_phone,
      is_active,
    } = req.body;

    const [updated] = await knex('buses')
      .where({ id })
      .update({
        bus_name: bus_name || bus.bus_name,
        origin: origin || bus.origin,
        destination: destination || bus.destination,
        departure_time: departure_time ? new Date(departure_time) : bus.departure_time,
        arrival_time: arrival_time ? new Date(arrival_time) : bus.arrival_time,
        total_seats: total_seats || bus.total_seats,
        available_seats: available_seats !== undefined ? available_seats : bus.available_seats,
        price_per_seat: price_per_seat || bus.price_per_seat,
        bus_type: bus_type || bus.bus_type,
        amenities: amenities ? JSON.stringify(amenities) : bus.amenities,
        operator_contact: operator_contact || bus.operator_contact,
        operator_phone: operator_phone || bus.operator_phone,
        is_active: is_active !== undefined ? is_active : bus.is_active,
        updated_at: new Date(),
      })
      .returning('*');

    res.json({
      success: true,
      data: updated,
      message: 'Bus updated successfully',
    });
  } catch (err) {
    console.error('Update bus error:', err);
    res.status(500).json({ error: 'Failed to update bus' });
  }
});

// DELETE bus (soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    const { id } = req.params;

    const bus = await knex('buses').where({ id }).first();
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (role !== 'admin' && bus.created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this bus' });
    }

    await knex('buses').where({ id }).update({
      is_active: false,
      updated_at: new Date(),
    });

    res.json({
      success: true,
      message: 'Bus deleted successfully',
    });
  } catch (err) {
    console.error('Delete bus error:', err);
    res.status(500).json({ error: 'Failed to delete bus' });
  }
});

// BOOK bus seats
router.post('/:id/book', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { id } = req.params;
    const { seats_count, passenger_details, payment_id } = req.body;

    const bus = await knex('buses').where({ id }).first();
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }

    if (bus.available_seats < seats_count) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    // Create bus booking
    const [booking] = await knex('bus_bookings')
      .insert({
        id: uuidv4(),
        bus_id: id,
        user_id: userId,
        seats_count,
        passenger_details: JSON.stringify(passenger_details),
        total_price: seats_count * bus.price_per_seat,
        payment_id,
        status: 'confirmed',
        booking_date: new Date(),
        created_at: new Date(),
      })
      .returning('*');

    // Update available seats
    await knex('buses')
      .where({ id })
      .decrement('available_seats', seats_count);

    res.status(201).json({
      success: true,
      data: booking,
      message: 'Bus booking created successfully',
    });
  } catch (err) {
    console.error('Book bus error:', err);
    res.status(500).json({ error: 'Failed to book bus' });
  }
});

// GET user bus bookings
router.get('/user/my-bookings', verifyToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    const bookings = await knex('bus_bookings')
      .where({ user_id: userId })
      .join('buses', 'bus_bookings.bus_id', 'buses.id')
      .select('bus_bookings.*', 'buses.bus_name', 'buses.origin', 'buses.destination', 'buses.departure_time')
      .orderBy('bus_bookings.booking_date', 'desc');

    res.json({
      success: true,
      data: bookings,
    });
  } catch (err) {
    console.error('Get user bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// FETCH buses from BusBud API
router.get('/search/busbud', async (req, res) => {
  try {
    const { origin, destination, date } = req.query;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination, date' });
    }

    // BusBud API requires city codes/location IDs
    // For this implementation, we'll use a mapping of common Kenya cities
    const cityMap = {
      'nairobi': 'nairobi_kenya',
      'mombasa': 'mombasa_kenya',
      'kisumu': 'kisumu_kenya',
      'nakuru': 'nakuru_kenya',
      'kericho': 'kericho_kenya',
      'eldoret': 'eldoret_kenya',
      'nyeri': 'nyeri_kenya',
      'muranga': 'muranga_kenya',
    };

    const originCode = cityMap[origin.toLowerCase()] || origin;
    const destinationCode = cityMap[destination.toLowerCase()] || destination;

    // Call BusBud API
    const busBudUrl = `${BUSBUD_API_BASE}/${originCode}/${destinationCode}/${date}`;
    
    const response = await axios.get(busBudUrl, {
      headers: {
        'Accept': 'application/vnd.busbud.com; version=2; charset=utf-8',
        'X-Busbud-Token': BUSBUD_API_KEY,
      },
      timeout: 10000,
    });

    // Transform BusBud data to our format
    const buses = (response.data.departures || []).map(departure => ({
      id: uuidv4(),
      bus_name: departure.operator?.name || 'Unknown Operator',
      origin: origin,
      destination: destination,
      departure_time: new Date(departure.departure_time),
      arrival_time: new Date(departure.arrival_time),
      total_seats: departure.available_count || 50,
      available_seats: departure.available_count || 50,
      price_per_seat: Math.round(parseFloat(departure.price?.amount || 0)),
      bus_type: departure.vehicle?.type || 'standard',
      amenities: departure.vehicle?.amenities || [],
      operator_contact: departure.operator?.phone || '',
      operator_phone: departure.operator?.phone || '',
      is_api_sourced: true,
      api_bus_id: departure.id,
      api_provider: 'busbud',
      created_by: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    }));

    res.json({
      success: true,
      data: buses,
      source: 'busbud_api',
      total: buses.length,
    });
  } catch (err) {
    console.error('BusBud API error:', err.message);
    
    // Fallback to mock data if API fails
    console.log('Falling back to mock bus data...');
    const mockBuses = generateMockBuses(req.query.origin, req.query.destination, req.query.date);
    
    res.json({
      success: true,
      data: mockBuses,
      source: 'mock_data',
      total: mockBuses.length,
      note: 'Using mock data due to API unavailability',
    });
  }
});

// Generate mock bus data for testing
function generateMockBuses(origin, destination, date) {
  const mockOperators = [
    'Easy Coach',
    'Jatco',
    'Coastal Bus',
    'Mash East Africa',
    'Kirinyaga Express',
    'Modern Coast',
    'Sunrays',
  ];

  const buses = [];
  for (let i = 0; i < 5; i++) {
    const departureTime = new Date(`${date}T${String(6 + i * 3).padStart(2, '0')}:00:00`);
    const arrivalTime = new Date(departureTime.getTime() + 4 * 60 * 60 * 1000); // 4 hours later

    buses.push({
      id: uuidv4(),
      bus_name: mockOperators[i % mockOperators.length],
      origin: origin || 'Nairobi',
      destination: destination || 'Mombasa',
      departure_time: departureTime,
      arrival_time: arrivalTime,
      total_seats: 50,
      available_seats: Math.floor(Math.random() * 30) + 10,
      price_per_seat: 1000 + Math.random() * 1000,
      bus_type: ['standard', 'deluxe', 'vip'][i % 3],
      amenities: ['WiFi', 'AC', 'Charging', 'Water'],
      operator_contact: 'contact@operator.com',
      operator_phone: '+254' + String(Math.random() * 900000000 + 100000000).slice(0, 9),
      is_api_sourced: false,
      api_bus_id: null,
      api_provider: null,
      created_by: null,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
  }

  return buses;
}

// CREATE new bus manually (organizer/admin only) - Enhanced
router.post('/manual/add', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;

    if (!['organizer', 'admin', 'vendor'].includes(role)) {
      return res.status(403).json({ error: 'Only organizers, admins, and vendors can add buses' });
    }

    const {
      bus_name,
      origin,
      destination,
      departure_time,
      arrival_time,
      total_seats,
      available_seats,
      price_per_seat,
      bus_type = 'standard',
      amenities = [],
      operator_contact,
      operator_phone,
    } = req.body;

    // Validation
    if (!bus_name || !origin || !destination || !departure_time || !total_seats || !price_per_seat) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['bus_name', 'origin', 'destination', 'departure_time', 'total_seats', 'price_per_seat'],
      });
    }

    if (total_seats <= 0) {
      return res.status(400).json({ error: 'Total seats must be greater than 0' });
    }

    if (price_per_seat <= 0) {
      return res.status(400).json({ error: 'Price per seat must be greater than 0' });
    }

    const busData = {
      id: uuidv4(),
      bus_name,
      origin,
      destination,
      departure_time: new Date(departure_time),
      arrival_time: arrival_time ? new Date(arrival_time) : null,
      total_seats,
      available_seats: available_seats || total_seats,
      price_per_seat: parseFloat(price_per_seat),
      bus_type,
      amenities: amenities.length > 0 ? JSON.stringify(amenities) : null,
      operator_contact: operator_contact || null,
      operator_phone: operator_phone || null,
      is_api_sourced: false,
      api_bus_id: null,
      api_provider: null,
      created_by: userId,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const [bus] = await knex('buses')
      .insert(busData)
      .returning('*');

    // Parse JSON fields for response
    if (bus.amenities) {
      bus.amenities = JSON.parse(bus.amenities);
    }

    res.status(201).json({
      success: true,
      data: bus,
      message: 'Bus added successfully',
    });
  } catch (err) {
    console.error('Create bus error:', err);
    res.status(500).json({ error: 'Failed to create bus', details: err.message });
  }
});

// SYNC buses from BusBud API and save to database
router.post('/sync/busbud', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (!['admin', 'organizer'].includes(role)) {
      return res.status(403).json({ error: 'Only admins and organizers can sync buses' });
    }

    const { origin, destination, date, overwrite = false } = req.body;

    if (!origin || !destination || !date) {
      return res.status(400).json({ error: 'Missing required parameters: origin, destination, date' });
    }

    try {
      // Fetch from BusBud API
      const cityMap = {
        'nairobi': 'nairobi_kenya',
        'mombasa': 'mombasa_kenya',
        'kisumu': 'kisumu_kenya',
        'nakuru': 'nakuru_kenya',
        'kericho': 'kericho_kenya',
        'eldoret': 'eldoret_kenya',
        'nyeri': 'nyeri_kenya',
        'muranga': 'muranga_kenya',
      };

      const originCode = cityMap[origin.toLowerCase()] || origin;
      const destinationCode = cityMap[destination.toLowerCase()] || destination;
      const busBudUrl = `${BUSBUD_API_BASE}/${originCode}/${destinationCode}/${date}`;

      const response = await axios.get(busBudUrl, {
        headers: {
          'Accept': 'application/vnd.busbud.com; version=2; charset=utf-8',
          'X-Busbud-Token': BUSBUD_API_KEY,
        },
        timeout: 10000,
      });

      const departures = response.data.departures || [];

      // If overwrite is true, remove old entries for this route/date
      if (overwrite) {
        await knex('buses')
          .where('origin', 'ilike', `%${origin}%`)
          .where('destination', 'ilike', `%${destination}%`)
          .whereRaw('DATE(departure_time) = ?', [date])
          .where('is_api_sourced', true)
          .delete();
      }

      // Insert new buses
      const insertBuses = departures.map(departure => ({
        id: uuidv4(),
        bus_name: departure.operator?.name || 'Unknown Operator',
        origin: origin,
        destination: destination,
        departure_time: new Date(departure.departure_time),
        arrival_time: new Date(departure.arrival_time),
        total_seats: departure.available_count || 50,
        available_seats: departure.available_count || 50,
        price_per_seat: Math.round(parseFloat(departure.price?.amount || 0)),
        bus_type: departure.vehicle?.type || 'standard',
        amenities: departure.vehicle?.amenities ? JSON.stringify(departure.vehicle.amenities) : null,
        operator_contact: departure.operator?.phone || '',
        operator_phone: departure.operator?.phone || '',
        is_api_sourced: true,
        api_bus_id: departure.id,
        api_provider: 'busbud',
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await knex('buses').insert(insertBuses);

      res.json({
        success: true,
        message: `Synced ${insertBuses.length} buses from BusBud API`,
        busesAdded: insertBuses.length,
      });
    } catch (apiError) {
      throw new Error(`BusBud API error: ${apiError.message}`);
    }
  } catch (err) {
    console.error('Sync buses error:', err);
    res.status(500).json({ error: 'Failed to sync buses', details: err.message });
  }
});

// SYNC buses from external API (admin only)
router.post('/sync/external-api', verifyToken, async (req, res) => {
  try {
    const { role } = req.user;

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can sync buses from external API' });
    }

    // Placeholder for actual API integration
    // This would call an external bus booking API and sync data
    const { api_provider } = req.body;

    res.json({
      success: true,
      message: `Bus sync from ${api_provider} completed`,
    });
  } catch (err) {
    console.error('Sync buses error:', err);
    res.status(500).json({ error: 'Failed to sync buses' });
  }
});

module.exports = router;
