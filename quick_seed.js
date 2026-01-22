const knex = require('knex');
const knexConfig = require('./knexfile');
const bcrypt = require('bcryptjs');

async function quickSeed() {
  try {
    console.log('🌱 Quick seeding Kenya demo data...');
    
    const db = knex(knexConfig.development);
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');
    
    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db('events').del();
    await db('venues').del();
    await db('users').del();
    await db('payment_methods').del();
    console.log('✅ Data cleared');
    
    // Hash passwords
    const passwordHash1 = await bcrypt.hash('password123', 10);
    const passwordHash2 = await bcrypt.hash('password456', 10);
    const passwordHash3 = await bcrypt.hash('password789', 10);
    const passwordHash4 = await bcrypt.hash('password999', 10);
    const passwordHash5 = await bcrypt.hash('password000', 10);
    
    // Seed users
    console.log('👥 Seeding users...');
    const users = await db('users').insert([
      {
        first_name: 'James',
        last_name: 'Mwangi',
        email: 'james@example.com',
        phone: '+254712345678',
        password_hash: passwordHash1,
        role: 'customer',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00500'
      },
      {
        first_name: 'Grace',
        last_name: 'Wanjiru',
        email: 'grace@example.com',
        phone: '+254723456789',
        password_hash: passwordHash2,
        role: 'customer',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100'
      },
      {
        first_name: 'Events',
        last_name: 'Organizer',
        email: 'events@example.com',
        phone: '+254720123456',
        password_hash: passwordHash3,
        role: 'organizer',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00606'
      },
      {
        first_name: 'Venue',
        last_name: 'Manager',
        email: 'venue@example.com',
        phone: '+254711234567',
        password_hash: passwordHash2,
        role: 'venue_manager',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00300'
      },
      {
        first_name: 'Vendor',
        last_name: 'User',
        email: 'vendor@example.com',
        phone: '+254722234567',
        password_hash: passwordHash4,
        role: 'vendor',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00400'
      },
      {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@example.com',
        phone: '+254730987654',
        password_hash: passwordHash5,
        role: 'admin',
        is_active: true,
        email_verified: true,
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00502'
      }
    ], ['id']);
    console.log(`✅ Seeded ${users.length} users (Customer, Organizer, Venue Manager, Vendor, Admin)`);
    
    // Seed payment methods
    console.log('💳 Seeding payment methods...');
    await db('payment_methods').insert([
      {
        code: 'mpesa',
        name: 'M-Pesa',
        category: 'mobile_money',
        description: 'Kenya\'s most popular mobile money service',
        enabled: true,
        gateway_provider: 'safaricom',
        min_amount: 10.00,
        max_amount: 150000.00,
        currency: 'KES',
        config: {
          shortcode: '174379'
        },
        fees: {
          transaction_fee_percentage: 1.5,
          fixed_fee: 0.00
        },
        processing_time_minutes: 5
      },
      {
        code: 'card',
        name: 'Credit/Debit Card',
        category: 'payment_gateway',
        description: 'Card payments via Stripe',
        enabled: true,
        gateway_provider: 'stripe',
        min_amount: 1.00,
        max_amount: 1000000.00,
        currency: 'KES',
        config: {},
        fees: {
          transaction_fee_percentage: 2.9,
          fixed_fee: 0.30
        },
        processing_time_minutes: 15
      },
      {
        code: 'cash',
        name: 'Cash on Delivery',
        category: 'cash',
        description: 'Pay cash when collecting tickets at venue',
        enabled: true,
        gateway_provider: null,
        min_amount: 0.00,
        max_amount: 100000.00,
        currency: 'KES',
        config: {},
        fees: {
          transaction_fee_percentage: 0.0,
          fixed_fee: 0.00
        },
        processing_time_minutes: 0
      }
    ]);
    console.log('✅ Payment methods seeded');
    
    // Seed venues
    console.log('🏟️  Seeding venues...');
    const venues = await db('venues').insert([
      {
        name: 'Nairobi Safari Park',
        description: 'Premier entertainment and event venue in Nairobi',
        address: 'Langata Road, Nairobi',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00502',
        latitude: -1.3432,
        longitude: 36.7832,
        capacity: 5000,
        venue_type: 'arena',
        has_seating: true
      },
      {
        name: 'Mombasa Beach Arena',
        description: 'Beachfront event venue with ocean views',
        address: 'Beach Road, Mombasa',
        city: 'Mombasa',
        state: 'Coast County',
        country: 'Kenya',
        postal_code: '80100',
        latitude: -4.0435,
        longitude: 39.6682,
        capacity: 3000,
        venue_type: 'concert_hall',
        has_seating: true
      },
      {
        name: 'KICC - Nairobi',
        description: 'Kenya International Convention Centre',
        address: 'Harry Thuku Road, Nairobi',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        latitude: -1.2803,
        longitude: 36.8218,
        capacity: 8000,
        venue_type: 'conference_center',
        has_seating: true
      }
    ], ['id']);
    console.log(`✅ Seeded ${venues.length} venues`);
    
    // Seed events
    console.log('📅 Seeding events...');
    const eventDate1 = new Date();
    eventDate1.setDate(eventDate1.getDate() + 30);
    
    const eventDate2 = new Date();
    eventDate2.setDate(eventDate2.getDate() + 20);
    
    const eventDate3 = new Date();
    eventDate3.setDate(eventDate3.getDate() + 45);
    
    await db('events').insert([
      {
        title: 'Safari Sound Festival 2026',
        description: 'Annual music festival featuring local and international artists performing at the beautiful Mombasa Beach Arena',
        short_description: 'Annual music festival featuring local and international artists',
        event_type: 'festival',
        category: 'music',
        venue_id: venues[1].id,
        organizer_id: users[2].id,
        start_date: eventDate1,
        end_date: new Date(eventDate1.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: 'published',
        base_price: 2500,
        currency: 'KES',
        total_capacity: 5000,
        available_tickets: 5000,
        event_image_url: 'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tags: JSON.stringify(['music', 'festival', 'kenya', 'mombasa'])
      },
      {
        title: 'Nairobi Tech Summit 2026',
        description: 'Leading technology conference with talks from industry experts, networking opportunities, and latest tech innovations',
        short_description: 'Leading technology conference with talks from industry experts',
        event_type: 'conference',
        category: 'business',
        venue_id: venues[2].id,
        organizer_id: users[2].id,
        start_date: eventDate2,
        end_date: new Date(eventDate2.getTime() + 1 * 24 * 60 * 60 * 1000),
        status: 'published',
        base_price: 8500,
        currency: 'KES',
        total_capacity: 3000,
        available_tickets: 3000,
        event_image_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tags: JSON.stringify(['tech', 'conference', 'kenya', 'nairobi'])
      },
      {
        title: 'Kenya Fashion Week 2026',
        description: 'Showcasing Kenya\'s finest fashion designers and collections from established and emerging designers',
        short_description: 'Showcasing Kenya\'s finest fashion designers and collections',
        event_type: 'exhibition',
        category: 'arts',
        venue_id: venues[0].id,
        organizer_id: users[2].id,
        start_date: eventDate3,
        end_date: new Date(eventDate3.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: 'published',
        base_price: 3500,
        currency: 'KES',
        total_capacity: 2000,
        available_tickets: 2000,
        event_image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
        tags: JSON.stringify(['fashion', 'design', 'kenya', 'nairobi'])
      }
    ]);
    console.log('✅ Events seeded');
    
    console.log('🎉 Quick seed complete!');
    console.log('Sample logins:');
    console.log('  - Customer: james@example.com / password123');
    console.log('  - Organizer: events@example.com / password789');
    console.log('  - Admin: admin@example.com / password000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

quickSeed();
