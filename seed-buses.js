const knex = require('./config/database');
const { v4: uuidv4 } = require('uuid');

const seedBuses = async () => {
  try {
    console.log('Starting bus seed...');

    // Clear existing buses
    await knex('buses').del();

    const buses = [
      // Nairobi to Mombasa
      {
        id: uuidv4(),
        bus_name: 'Easy Coach',
        origin: 'Nairobi',
        destination: 'Mombasa',
        departure_time: new Date(new Date().setHours(6, 0, 0)),
        arrival_time: new Date(new Date().setHours(10, 30, 0)),
        total_seats: 50,
        available_seats: 35,
        price_per_seat: 1200,
        bus_type: 'standard',
        amenities: JSON.stringify(['WiFi', 'AC', 'Charging', 'Water']),
        operator_contact: 'contact@easycoach.co.ke',
        operator_phone: '+254712345678',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        bus_name: 'Jatco',
        origin: 'Nairobi',
        destination: 'Mombasa',
        departure_time: new Date(new Date().setHours(8, 0, 0)),
        arrival_time: new Date(new Date().setHours(12, 30, 0)),
        total_seats: 60,
        available_seats: 28,
        price_per_seat: 1100,
        bus_type: 'deluxe',
        amenities: JSON.stringify(['WiFi', 'AC', 'Charging', 'Water', 'Washroom']),
        operator_contact: 'contact@jatco.co.ke',
        operator_phone: '+254712987654',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        bus_name: 'Coastal Bus',
        origin: 'Nairobi',
        destination: 'Mombasa',
        departure_time: new Date(new Date().setHours(10, 0, 0)),
        arrival_time: new Date(new Date().setHours(14, 30, 0)),
        total_seats: 45,
        available_seats: 15,
        price_per_seat: 1500,
        bus_type: 'vip',
        amenities: JSON.stringify(['WiFi', 'AC', 'Charging', 'Water', 'Washroom', 'Meal']),
        operator_contact: 'contact@coastalbus.co.ke',
        operator_phone: '+254713456789',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Nairobi to Kisumu
      {
        id: uuidv4(),
        bus_name: 'Mash East Africa',
        origin: 'Nairobi',
        destination: 'Kisumu',
        departure_time: new Date(new Date().setHours(5, 0, 0)),
        arrival_time: new Date(new Date().setHours(11, 0, 0)),
        total_seats: 55,
        available_seats: 42,
        price_per_seat: 1000,
        bus_type: 'standard',
        amenities: JSON.stringify(['AC', 'Charging', 'Water']),
        operator_contact: 'contact@masheast.co.ke',
        operator_phone: '+254714567890',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        bus_name: 'Kirinyaga Express',
        origin: 'Nairobi',
        destination: 'Kisumu',
        departure_time: new Date(new Date().setHours(7, 0, 0)),
        arrival_time: new Date(new Date().setHours(13, 0, 0)),
        total_seats: 65,
        available_seats: 38,
        price_per_seat: 950,
        bus_type: 'standard',
        amenities: JSON.stringify(['WiFi', 'AC', 'Water']),
        operator_contact: 'contact@kirinyaga.co.ke',
        operator_phone: '+254715678901',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      // Nairobi to Nakuru
      {
        id: uuidv4(),
        bus_name: 'Modern Coast',
        origin: 'Nairobi',
        destination: 'Nakuru',
        departure_time: new Date(new Date().setHours(9, 0, 0)),
        arrival_time: new Date(new Date().setHours(11, 30, 0)),
        total_seats: 50,
        available_seats: 22,
        price_per_seat: 600,
        bus_type: 'standard',
        amenities: JSON.stringify(['AC', 'Water', 'Charging']),
        operator_contact: 'contact@moderncoast.co.ke',
        operator_phone: '+254716789012',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        bus_name: 'Sunrays',
        origin: 'Nairobi',
        destination: 'Nakuru',
        departure_time: new Date(new Date().setHours(11, 0, 0)),
        arrival_time: new Date(new Date().setHours(13, 30, 0)),
        total_seats: 48,
        available_seats: 31,
        price_per_seat: 550,
        bus_type: 'standard',
        amenities: JSON.stringify(['AC', 'Water']),
        operator_contact: 'contact@sunrays.co.ke',
        operator_phone: '+254717890123',
        is_api_sourced: false,
        api_bus_id: null,
        api_provider: null,
        created_by: null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await knex('buses').insert(buses);
    console.log(`✅ Successfully seeded ${buses.length} buses`);

    // Show what was inserted
    const count = await knex('buses').count('* as count').first();
    console.log(`📊 Total buses in database: ${count.count}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
};

seedBuses();
