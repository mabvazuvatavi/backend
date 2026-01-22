const knex = require('knex');
const knexConfig = require('./knexfile');

async function simpleSeed() {
  try {
    console.log('🌱 Running simple Kenyan seed...');
    
    const db = knex(knexConfig.development);
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');
    
    // Seed payment methods
    console.log('💳 Seeding payment methods...');
    await db('payment_methods').insert([
      {
        name: 'mpesa',
        display_name: 'M-Pesa (Safaricom)',
        description: 'Kenya\'s most popular mobile money service',
        gateway_type: 'mobile_money',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 1.5,
        fixed_fee: 0.00,
        min_amount: 10.00,
        max_amount: 150000.00,
        currency: 'KES',
        config: JSON.stringify({
          consumer_key: process.env.MPESA_CONSUMER_KEY || 'test_key',
          consumer_secret: process.env.MPESA_CONSUMER_SECRET || 'test_secret',
          passkey: process.env.MPESA_PASSKEY || 'test_passkey',
          shortcode: process.env.MPESA_SHORTCODE || '174379'
        }),
        supported_countries: JSON.stringify(['KE']),
        phone_validation_regex: '^(\+254|0)[7][0-9]{8}$',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'pesepal',
        display_name: 'Pesepal',
        description: 'Kenyan online payment gateway supporting cards and mobile money',
        gateway_type: 'payment_gateway',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 3.0,
        fixed_fee: 0.00,
        min_amount: 50.00,
        max_amount: 500000.00,
        currency: 'KES',
        config: JSON.stringify({
          consumer_key: process.env.PESEPAL_CONSUMER_KEY || 'test_key',
          consumer_secret: process.env.PESEPAL_CONSUMER_SECRET || 'test_secret'
        }),
        supported_countries: JSON.stringify(['KE', 'UG', 'TZ', 'RW', 'BI']),
        email_validation_regex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'equitel',
        display_name: 'Equitel Money',
        description: 'Equitel mobile money service from Equity Bank',
        gateway_type: 'mobile_money',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 2.0,
        fixed_fee: 0.00,
        min_amount: 10.00,
        max_amount: 100000.00,
        currency: 'KES',
        config: JSON.stringify({
          api_url: process.env.EQUITEL_API_URL || 'https://api.equitel.co.ke',
          merchant_code: process.env.EQUITEL_MERCHANT_CODE || 'test_merchant'
        }),
        supported_countries: JSON.stringify(['KE']),
        phone_validation_regex: '^(\+254|0)[7][0-9]{8}$',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'airtel_money',
        display_name: 'Airtel Money',
        description: 'Airtel mobile money service',
        gateway_type: 'mobile_money',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 2.5,
        fixed_fee: 0.00,
        min_amount: 10.00,
        max_amount: 80000.00,
        currency: 'KES',
        config: JSON.stringify({
          api_url: process.env.AIRTEL_MONEY_API_URL || 'https://api.airtel.com',
          client_id: process.env.AIRTEL_MONEY_CLIENT_ID || 'test_client'
        }),
        supported_countries: JSON.stringify(['KE']),
        phone_validation_regex: '^(\+254|0)[7][0-9]{8}$',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'tkash',
        display_name: 'T-Kash',
        description: 'T-Kash mobile money service from Telkom Kenya',
        gateway_type: 'mobile_money',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 2.0,
        fixed_fee: 0.00,
        min_amount: 10.00,
        max_amount: 70000.00,
        currency: 'KES',
        config: JSON.stringify({
          api_url: process.env.TKASH_API_URL || 'https://api.telkom.co.ke',
          merchant_id: process.env.TKASH_MERCHANT_ID || 'test_merchant'
        }),
        supported_countries: JSON.stringify(['KE']),
        phone_validation_regex: '^(\+254|0)[7][0-9]{8}$',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'stripe',
        display_name: 'Credit/Debit Card',
        description: 'International card payments via Stripe',
        gateway_type: 'payment_gateway',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 2.9,
        fixed_fee: 0.30,
        min_amount: 1.00,
        max_amount: 1000000.00,
        currency: 'KES',
        config: JSON.stringify({
          publishable_key: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test',
          secret_key: process.env.STRIPE_SECRET_KEY || 'sk_test'
        }),
        supported_countries: JSON.stringify(['KE', 'US', 'GB', 'EU', 'CA', 'AU']),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'paypal',
        display_name: 'PayPal',
        description: 'PayPal payments for international transactions',
        gateway_type: 'payment_gateway',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 3.4,
        fixed_fee: 0.30,
        min_amount: 1.00,
        max_amount: 1000000.00,
        currency: 'USD',
        config: JSON.stringify({
          client_id: process.env.PAYPAL_CLIENT_ID || 'test_client',
          client_secret: process.env.PAYPAL_CLIENT_SECRET || 'test_secret'
        }),
        supported_countries: JSON.stringify(['KE', 'US', 'GB', 'EU', 'CA', 'AU']),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'cash',
        display_name: 'Cash on Delivery',
        description: 'Pay cash when collecting tickets at venue',
        gateway_type: 'cash',
        is_active: true,
        supports_refunds: false,
        transaction_fee_percentage: 0.0,
        fixed_fee: 0.00,
        min_amount: 0.00,
        max_amount: 100000.00,
        currency: 'KES',
        config: JSON.stringify({}),
        supported_countries: JSON.stringify(['KE']),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'nfc',
        display_name: 'NFC/RFID Card',
        description: 'Pay using NFC or RFID card balance',
        gateway_type: 'nfc',
        is_active: true,
        supports_refunds: true,
        transaction_fee_percentage: 0.5,
        fixed_fee: 0.00,
        min_amount: 1.00,
        max_amount: 50000.00,
        currency: 'KES',
        config: JSON.stringify({
          card_issuer: 'ShashaPass',
          card_types: ['nfc', 'rfid', 'both']
        }),
        supported_countries: JSON.stringify(['KE']),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    
    console.log('✅ Payment methods seeded');
    
    // Seed users
    console.log('👥 Seeding users...');
    const users = await db('users').insert([
      {
        first_name: 'James',
        last_name: 'Mwangi',
        email: 'james.mwangi@example.com',
        phone: '+254712345678',
        password: '$2b$10$example_hash_password_1',
        role: 'user',
        is_active: true,
        email_verified: true,
        address: 'Mombasa Road, Industrial Area',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00500',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Grace',
        last_name: 'Wanjiru',
        email: 'grace.wanjiru@example.com',
        phone: '+254723456789',
        password: '$2b$10$example_hash_password_2',
        role: 'user',
        is_active: true,
        email_verified: true,
        address: 'Kenyatta Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Events',
        last_name: 'Team Kenya',
        email: 'events@kenyaconventions.co.ke',
        phone: '+254720123456',
        password: '$2b$10$example_hash_password_6',
        role: 'event_organizer',
        is_active: true,
        email_verified: true,
        address: 'Waiyaki Way',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00606',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Music',
        last_name: 'Festival Kenya',
        email: 'music@kenyafestivals.co.ke',
        phone: '+254730987654',
        password: '$2b$10$example_hash_password_7',
        role: 'event_organizer',
        is_active: true,
        email_verified: true,
        address: 'Langata Road',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00502',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'John',
        last_name: 'Kariuki',
        email: 'john.kariuki@kicc.co.ke',
        phone: '+254722111222',
        password: '$2b$10$example_hash_password_8',
        role: 'venue_manager',
        is_active: true,
        email_verified: true,
        address: 'Kenyatta Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@shashapass.co.ke',
        phone: '+254700000000',
        password: '$2b$10$example_hash_password_admin',
        role: 'admin',
        is_active: true,
        email_verified: true,
        address: 'Harambee Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).returning(['id', 'email']);
    
    console.log('✅ Users seeded');
    
    // Get venue manager IDs
    const kariuki = users.find(u => u.email === 'john.kariuki@kicc.co.ke');
    
    // Seed venues
    console.log('🏛️  Seeding venues...');
    const venues = await db('venues').insert([
      {
        name: 'Kenyatta International Convention Centre',
        description: 'Premier conference and exhibition venue in Nairobi, hosting major corporate events, concerts, and international conferences.',
        address: 'Kenyatta Avenue, Harambee Avenue',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        latitude: -1.286389,
        longitude: 36.817223,
        capacity: 6000,
        venue_type: 'conference_center',
        facilities: JSON.stringify([
          'WiFi', 'Parking', 'Catering', 'AV Equipment', 'Stage', 'Sound System',
          'Projectors', 'Microphones', 'Lighting', 'Restrooms', 'Security', 'Translation Services'
        ]),
        layout: JSON.stringify({
          main_hall: { capacity: 4000, type: 'theater' },
          breakout_rooms: { count: 15, capacity_each: 60 },
          exhibition_space: { area_sqm: 3000 }
        }),
        has_seating: true,
        is_active: true,
        manager_id: kariuki?.id,
        contact_phone: '+254-20-271-0000',
        contact_email: 'info@kicc.co.ke',
        operating_hours: 'Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 4:00 PM',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Kasarani Stadium (Moi International Sports Centre)',
        description: 'Modern sports complex in Nairobi, home to major football matches, athletics, and entertainment events.',
        address: 'Thika Road, Kasarani',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00501',
        latitude: -1.2217,
        longitude: 36.9256,
        capacity: 60000,
        venue_type: 'stadium',
        facilities: JSON.stringify([
          'Parking', 'VIP Boxes', 'Press Facilities', 'Changing Rooms', 'Medical Facilities',
          'Food Courts', 'Security', 'Lighting', 'Sound System', 'Scoreboards'
        ]),
        layout: JSON.stringify({
          main_stadium: { capacity: 60000, type: 'stadium' },
          indoor_arena: { capacity: 5000, type: 'arena' },
          warm_up_track: { type: 'athletics' }
        }),
        has_seating: true,
        is_active: true,
        contact_phone: '+254-20-866-0000',
        contact_email: 'info@kasarani.co.ke',
        operating_hours: 'Daily: 6:00 AM - 9:00 PM',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Nyayo National Stadium',
        description: 'Multi-purpose stadium in Nairobi, hosting football matches, athletics, and major concerts.',
        address: 'Jogoo Road, Nairobi West',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00500',
        latitude: -1.2992,
        longitude: 36.8219,
        capacity: 30000,
        venue_type: 'stadium',
        facilities: JSON.stringify([
          'Parking', 'VIP Boxes', 'Press Facilities', 'Changing Rooms', 'Medical Facilities',
          'Food Courts', 'Security', 'Lighting', 'Sound System'
        ]),
        layout: JSON.stringify({
          main_stadium: { capacity: 30000, type: 'stadium' },
          warm_up_area: { area_sqm: 500 }
        }),
        has_seating: true,
        is_active: true,
        contact_phone: '+254-20-271-4444',
        contact_email: 'info@nyayostadium.co.ke',
        operating_hours: 'Daily: 6:00 AM - 9:00 PM',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Kenya National Theatre',
        description: 'Cultural hub for performing arts in Nairobi, hosting theatrical performances, concerts, and cultural events.',
        address: 'Harry Thuku Road, Community Area',
        city: 'Nairobi',
        state: 'Nairobi County',
        country: 'Kenya',
        postal_code: '00100',
        latitude: -1.2633,
        longitude: 36.8115,
        capacity: 650,
        venue_type: 'theater',
        facilities: JSON.stringify([
          'WiFi', 'Parking', 'Bar', 'Restaurant', 'Sound System', 'Lighting',
          'Dressing Rooms', 'Rehearsal Studios', 'Gallery Space'
        ]),
        layout: JSON.stringify({
          main_theater: { capacity: 650, type: 'theater' },
          studio_theater: { capacity: 150, type: 'black_box' },
          gallery: { capacity: 100, type: 'exhibition' }
        }),
        has_seating: true,
        is_active: true,
        contact_phone: '+254-20-222-7777',
        contact_email: 'info@nationaltheatre.go.ke',
        operating_hours: 'Tuesday-Sunday: 9:00 AM - 9:00 PM',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Mombasa Beach Arena',
        description: 'Beachfront venue in Mombasa, perfect for concerts, festivals, and outdoor events with ocean views.',
        address: 'Diani Beach Road',
        city: 'Mombasa',
        state: 'Mombasa County',
        country: 'Kenya',
        postal_code: '80101',
        latitude: -4.2767,
        longitude: 39.5971,
        capacity: 5000,
        venue_type: 'outdoor_venue',
        facilities: JSON.stringify([
          'Beach Access', 'Parking', 'Outdoor Stage', 'Sound System', 'Lighting',
          'Food Courts', 'Security', 'Restrooms', 'VIP Areas'
        ]),
        layout: JSON.stringify({
          main_stage: { capacity: 5000, type: 'outdoor' },
          vip_lounge: { capacity: 200, type: 'covered' },
          beach_area: { capacity: 1000, type: 'open' }
        }),
        has_seating: false,
        is_active: true,
        contact_phone: '+254-41-222-0000',
        contact_email: 'events@mombasabeacharena.co.ke',
        operating_hours: 'Daily: 10:00 AM - 11:00 PM',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]).returning(['id', 'name']);
    
    console.log('✅ Venues seeded');
    
    // Get venue and organizer IDs for events
    const kicc = venues.find(v => v.name === 'Kenyatta International Convention Centre');
    const kasarani = venues.find(v => v.name === 'Kasarani Stadium (Moi International Sports Centre)');
    const nyayo = venues.find(v => v.name === 'Nyayo National Stadium');
    const nationalTheatre = venues.find(v => v.name === 'Kenya National Theatre');
    const mombasaBeach = venues.find(v => v.name === 'Mombasa Beach Arena');
    
    const eventOrganizer = users.find(u => u.email === 'events@kenyaconventions.co.ke');
    const musicOrganizer = users.find(u => u.email === 'music@kenyafestivals.co.ke');
    
    // Seed events
    console.log('🎉 Seeding events...');
    await db('events').insert([
      {
        title: 'Nairobi Tech Summit 2026',
        description: 'Annual technology conference featuring Kenya\'s leading tech innovators, entrepreneurs, and industry leaders. Topics include AI, blockchain, fintech, mobile money, and digital transformation.',
        short_description: 'Kenya\'s premier technology conference and networking event.',
        event_type: 'conference',
        category: 'business',
        venue_id: kicc?.id,
        organizer_id: eventOrganizer?.id,
        start_date: new Date('2026-03-15T09:00:00Z'),
        end_date: new Date('2026-03-16T17:00:00Z'),
        base_price: 8500.00,
        currency: 'KES',
        total_capacity: 1200,
        available_tickets: 1200,
        sold_tickets: 0,
        status: 'published',
        event_image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800',
        tags: JSON.stringify(['technology', 'innovation', 'networking', 'business', 'fintech']),
        terms_and_conditions: 'Standard conference terms apply. Refund policy: Full refund 30 days prior, 50% refund 14 days prior, no refunds within 7 days.',
        refund_policy: 'Flexible refund policy with processing fees waived for early cancellations.',
        is_featured: true,
        requires_approval: false,
        min_age: 18,
        has_seating: true,
        published_at: new Date(),
        sales_start_date: new Date('2026-01-01T00:00:00Z'),
        sales_end_date: new Date('2026-03-14T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Safari Sound Festival',
        description: 'Kenya\'s biggest music festival featuring top local and international artists across multiple genres including Afrobeats, Gengetone, Benga, and contemporary music.',
        short_description: 'Experience the best of Kenyan and African music in one electrifying festival.',
        event_type: 'festival',
        category: 'music',
        venue_id: mombasaBeach?.id,
        organizer_id: musicOrganizer?.id,
        start_date: new Date('2026-04-20T16:00:00Z'),
        end_date: new Date('2026-04-21T23:00:00Z'),
        base_price: 2500.00,
        currency: 'KES',
        total_capacity: 5000,
        available_tickets: 5000,
        sold_tickets: 0,
        status: 'published',
        event_image_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
        tags: JSON.stringify(['music', 'festival', 'afrobeats', 'gengetone', 'live_performance']),
        terms_and_conditions: 'Festival terms apply. No refunds within 7 days of event. Weather policy applies for outdoor events.',
        refund_policy: 'Full refund 14 days prior, 50% refund 7 days prior, no refunds within 7 days.',
        is_featured: true,
        requires_approval: false,
        min_age: 16,
        has_seating: false,
        published_at: new Date(),
        sales_start_date: new Date('2026-01-15T00:00:00Z'),
        sales_end_date: new Date('2026-04-19T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Kenya Premier League: Gor Mahia vs AFC Leopards',
        description: 'The biggest football derby in Kenya featuring the two most successful clubs in Kenyan football history. A must-see match for any football fan.',
        short_description: 'Kenya\'s most intense football rivalry at the national stadium.',
        event_type: 'sports',
        category: 'football',
        venue_id: nyayo?.id,
        organizer_id: eventOrganizer?.id,
        start_date: new Date('2026-02-28T15:00:00Z'),
        end_date: new Date('2026-02-28T18:00:00Z'),
        base_price: 500.00,
        currency: 'KES',
        total_capacity: 25000,
        available_tickets: 25000,
        sold_tickets: 0,
        status: 'published',
        event_image_url: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800',
        tags: JSON.stringify(['football', 'sports', 'kpl', 'derby', 'gor_mahia', 'afc_leopards']),
        terms_and_conditions: 'Standard stadium terms apply. No weapons, alcohol, or outside food allowed.',
        refund_policy: 'Full refund 48 hours before match, no refunds within 48 hours.',
        is_featured: false,
        requires_approval: false,
        min_age: 5,
        has_seating: true,
        published_at: new Date(),
        sales_start_date: new Date('2026-01-01T00:00:00Z'),
        sales_end_date: new Date('2026-02-27T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Kenya Fashion Week',
        description: 'Showcasing the best of Kenyan fashion design with runway shows, designer exhibitions, and networking opportunities for fashion professionals.',
        short_description: 'Celebrate Kenya\'s vibrant fashion industry and emerging designers.',
        event_type: 'fashion_show',
        category: 'fashion',
        venue_id: kicc?.id,
        organizer_id: eventOrganizer?.id,
        start_date: new Date('2026-05-10T18:00:00Z'),
        end_date: new Date('2026-05-12T21:00:00Z'),
        base_price: 3500.00,
        currency: 'KES',
        total_capacity: 2000,
        available_tickets: 2000,
        sold_tickets: 0,
        status: 'published',
        event_image_url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
        tags: JSON.stringify(['fashion', 'design', 'runway', 'kenyan_designers', 'style']),
        terms_and_conditions: 'Fashion week terms apply. Professional photography restrictions may apply.',
        refund_policy: 'Full refund 7 days prior, no refunds within 7 days.',
        is_featured: true,
        requires_approval: false,
        min_age: 16,
        has_seating: true,
        published_at: new Date(),
        sales_start_date: new Date('2026-02-01T00:00:00Z'),
        sales_end_date: new Date('2026-05-09T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        title: 'Nairobi Marathon 2026',
        description: 'Kenya\'s premier running event featuring full marathon, half marathon, 10km, and 5km races through the streets of Nairobi.',
        short_description: 'Run with champions in Kenya\'s capital city marathon.',
        event_type: 'sports',
        category: 'running',
        venue_id: nyayo?.id,
        organizer_id: eventOrganizer?.id,
        start_date: new Date('2026-10-26T06:00:00Z'),
        end_date: new Date('2026-10-26T14:00:00Z'),
        base_price: 2000.00,
        currency: 'KES',
        total_capacity: 20000,
        available_tickets: 20000,
        sold_tickets: 0,
        status: 'published',
        event_image_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
        tags: JSON.stringify(['marathon', 'running', 'sports', 'fitness', 'nairobi', 'athletics']),
        terms_and_conditions: 'Marathon terms apply. Medical certificate required for full marathon participants.',
        refund_policy: 'Full refund 30 days prior, 50% refund 14 days prior, no refunds within 14 days.',
        is_featured: true,
        requires_approval: false,
        min_age: 16,
        has_seating: false,
        published_at: new Date(),
        sales_start_date: new Date('2026-05-01T00:00:00Z'),
        sales_end_date: new Date('2026-10-25T23:59:59Z'),
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    
    console.log('✅ Events seeded');
    
    console.log('\n🎉 Kenyan seed data completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ 9 Kenyan payment methods (M-Pesa, Pesepal, Equitel, Airtel Money, T-Kash, etc.)');
    console.log('   ✅ 6 Kenyan users (regular users, organizers, venue managers, admin)');
    console.log('   ✅ 5 Kenyan venues (KICC, Kasarani Stadium, Nyayo, National Theatre, Mombasa Beach)');
    console.log('   ✅ 5 Kenyan events (Tech Summit, Safari Sound Festival, Football Derby, Fashion Week, Marathon)');
    console.log('\n🌍 Your application is now fully Kenyan!');
    
    await db.destroy();
    
  } catch (error) {
    console.error('\n💥 Seeding failed:', error.message);
    process.exit(1);
  }
}

simpleSeed();
