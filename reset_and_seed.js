const knex = require('knex');
const knexConfig = require('./knexfile');

async function resetAndSeed() {
  try {
    console.log('🔄 Resetting database and seeding Kenyan data...');
    
    const db = knex(knexConfig.development);
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');
    
    // Drop tables in correct order (reverse of foreign key dependencies)
    console.log('🗑️  Dropping existing tables...');
    const tables = [
      'events',
      'venues', 
      'users',
      'payment_methods'
    ];
    
    for (const table of tables) {
      try {
        await db.raw(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ Dropped ${table}`);
      } catch (error) {
        console.log(`⚠️  Could not drop ${table}: ${error.message}`);
      }
    }
    
    // Recreate tables
    console.log('📋 Creating tables...');
    
    // Users table
    await db.raw(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20),
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Kenya',
        postal_code VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Payment methods table
    await db.raw(`
      CREATE TABLE payment_methods (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        description TEXT,
        gateway_type VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        supports_refunds BOOLEAN DEFAULT true,
        transaction_fee_percentage DECIMAL(5, 2) DEFAULT 0,
        fixed_fee DECIMAL(10, 2) DEFAULT 0,
        min_amount DECIMAL(10, 2) DEFAULT 0,
        max_amount DECIMAL(10, 2),
        currency VARCHAR(3) DEFAULT 'KES',
        config JSONB,
        supported_countries JSONB,
        phone_validation_regex TEXT,
        email_validation_regex TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Venues table
    await db.raw(`
      CREATE TABLE venues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100) DEFAULT 'Kenya',
        postal_code VARCHAR(20),
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        capacity INTEGER,
        venue_type VARCHAR(100),
        facilities JSONB,
        layout JSONB,
        has_seating BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        manager_id UUID REFERENCES users(id),
        contact_phone VARCHAR(20),
        contact_email VARCHAR(255),
        operating_hours TEXT,
        event_image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Events table
    await db.raw(`
      CREATE TABLE events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        short_description TEXT,
        event_type VARCHAR(100),
        category VARCHAR(100),
        venue_id UUID REFERENCES venues(id),
        organizer_id UUID REFERENCES users(id),
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        base_price DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'KES',
        total_capacity INTEGER,
        available_tickets INTEGER,
        sold_tickets INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'draft',
        event_image_url TEXT,
        tags JSONB,
        terms_and_conditions TEXT,
        refund_policy TEXT,
        is_featured BOOLEAN DEFAULT false,
        requires_approval BOOLEAN DEFAULT false,
        min_age INTEGER,
        has_seating BOOLEAN DEFAULT true,
        published_at TIMESTAMP,
        sales_start_date TIMESTAMP,
        sales_end_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ Tables created successfully');
    
    // Now run the Kenyan seeds
    console.log('🌱 Running Kenyan seeds...');
    
    // Run payment methods seed
    console.log('💳 Seeding payment methods...');
    await db.raw(`
      INSERT INTO payment_methods (name, display_name, description, gateway_type, is_active, supports_refunds, transaction_fee_percentage, fixed_fee, min_amount, max_amount, currency, config, supported_countries, phone_validation_regex, created_at, updated_at) VALUES
      ('mpesa', 'M-Pesa (Safaricom)', 'Kenya''s most popular mobile money service', 'mobile_money', true, true, 1.5, 0.00, 10.00, 150000.00, 'KES', '{"consumer_key": "test_key", "consumer_secret": "test_secret", "passkey": "test_passkey", "shortcode": "174379"}', '["KE"]', '^(\+254|0)[7][0-9]{8}$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('pesepal', 'Pesepal', 'Kenyan online payment gateway supporting cards and mobile money', 'payment_gateway', true, true, 3.0, 0.00, 50.00, 500000.00, 'KES', '{"consumer_key": "test_key", "consumer_secret": "test_secret"}', '["KE", "UG", "TZ", "RW", "BI"]', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('equitel', 'Equitel Money', 'Equitel mobile money service from Equity Bank', 'mobile_money', true, true, 2.0, 0.00, 10.00, 100000.00, 'KES', '{"api_url": "https://api.equitel.co.ke", "merchant_code": "test_merchant"}', '["KE"]', '^(\+254|0)[7][0-9]{8}$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('airtel_money', 'Airtel Money', 'Airtel mobile money service', 'mobile_money', true, true, 2.5, 0.00, 10.00, 80000.00, 'KES', '{"api_url": "https://api.airtel.com", "client_id": "test_client"}', '["KE"]', '^(\+254|0)[7][0-9]{8}$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('tkash', 'T-Kash', 'T-Kash mobile money service from Telkom Kenya', 'mobile_money', true, true, 2.0, 0.00, 10.00, 70000.00, 'KES', '{"api_url": "https://api.telkom.co.ke", "merchant_id": "test_merchant"}', '["KE"]', '^(\+254|0)[7][0-9]{8}$', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('stripe', 'Credit/Debit Card', 'International card payments via Stripe', 'payment_gateway', true, true, 2.9, 0.30, 1.00, 1000000.00, 'KES', '{"publishable_key": "pk_test", "secret_key": "sk_test"}', '["KE", "US", "GB", "EU", "CA", "AU"]', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('paypal', 'PayPal', 'PayPal payments for international transactions', 'payment_gateway', true, true, 3.4, 0.30, 1.00, 1000000.00, 'USD', '{"client_id": "test_client", "client_secret": "test_secret"}', '["KE", "US", "GB", "EU", "CA", "AU"]', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('cash', 'Cash on Delivery', 'Pay cash when collecting tickets at venue', 'cash', true, false, 0.0, 0.00, 0.00, 100000.00, 'KES', '{}', '["KE"]', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('nfc', 'NFC/RFID Card', 'Pay using NFC or RFID card balance', 'nfc', true, true, 0.5, 0.00, 1.00, 50000.00, 'KES', '{"card_issuer": "ShashaPass", "card_types": ["nfc", "rfid", "both"]}', '["KE"]', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    // Run users seed
    console.log('👥 Seeding users...');
    await db.raw(`
      INSERT INTO users (first_name, last_name, email, phone, password, role, is_active, email_verified, address, city, state, country, postal_code, created_at, updated_at) VALUES
      ('James', 'Mwangi', 'james.mwangi@example.com', '+254712345678', '$2b$10$example_hash_password_1', 'user', true, true, 'Mombasa Road, Industrial Area', 'Nairobi', 'Nairobi County', 'Kenya', '00500', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Grace', 'Wanjiru', 'grace.wanjiru@example.com', '+254723456789', '$2b$10$example_hash_password_2', 'user', true, true, 'Kenyatta Avenue', 'Nairobi', 'Nairobi County', 'Kenya', '00100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('David', 'Ochieng', 'david.ochieng@example.com', '+254734567890', '$2b$10$example_hash_password_3', 'user', true, true, 'Moi Avenue', 'Mombasa', 'Mombasa County', 'Kenya', '80100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Sarah', 'Kiprono', 'sarah.kiprono@example.com', '+254745678901', '$2b$10$example_hash_password_4', 'user', true, true, 'Nandi Road', 'Eldoret', 'Uasin Gishu County', 'Kenya', '30100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Michael', 'Otieno', 'michael.otieno@example.com', '+254756789012', '$2b$10$example_hash_password_5', 'user', true, true, 'Oginga Odinga Street', 'Kisumu', 'Kisumu County', 'Kenya', '40100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Events', 'Team Kenya', 'events@kenyaconventions.co.ke', '+254720123456', '$2b$10$example_hash_password_6', 'event_organizer', true, true, 'Waiyaki Way', 'Nairobi', 'Nairobi County', 'Kenya', '00606', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Music', 'Festival Kenya', 'music@kenyafestivals.co.ke', '+254730987654', '$2b$10$example_hash_password_7', 'event_organizer', true, true, 'Langata Road', 'Nairobi', 'Nairobi County', 'Kenya', '00502', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('John', 'Kariuki', 'john.kariuki@kicc.co.ke', '+254722111222', '$2b$10$example_hash_password_8', 'venue_manager', true, true, 'Kenyatta Avenue', 'Nairobi', 'Nairobi County', 'Kenya', '00100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Mary', 'Atieno', 'mary.atieno@nyayostadium.co.ke', '+254733333444', '$2b$10$example_hash_password_9', 'venue_manager', true, true, 'Jogoo Road', 'Nairobi', 'Nairobi County', 'Kenya', '00500', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Peter', 'Musa', 'peter.musa@kasarani.co.ke', '+254744555666', '$2b$10$example_hash_password_10', 'venue_manager', true, true, 'Thika Road', 'Nairobi', 'Nairobi County', 'Kenya', '00501', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Admin', 'User', 'admin@shashapass.co.ke', '+254700000000', '$2b$10$example_hash_password_admin', 'admin', true, true, 'Harambee Avenue', 'Nairobi', 'Nairobi County', 'Kenya', '00100', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    
    // Get venue manager IDs
    const kariuki = await db('users').where('email', 'john.kariuki@kicc.co.ke').first();
    const atieno = await db('users').where('email', 'mary.atieno@nyayostadium.co.ke').first();
    const musa = await db('users').where('email', 'peter.musa@kasarani.co.ke').first();
    
    // Run venues seed
    console.log('🏛️  Seeding venues...');
    await db.raw(`
      INSERT INTO venues (name, description, address, city, state, country, postal_code, latitude, longitude, capacity, venue_type, facilities, layout, has_seating, is_active, manager_id, contact_phone, contact_email, operating_hours, created_at, updated_at) VALUES
      ('Kenyatta International Convention Centre', 'Premier conference and exhibition venue in Nairobi, hosting major corporate events, concerts, and international conferences.', 'Kenyatta Avenue, Harambee Avenue', 'Nairobi', 'Nairobi County', 'Kenya', '00100', -1.286389, 36.817223, 6000, 'conference_center', '["WiFi", "Parking", "Catering", "AV Equipment", "Stage", "Sound System", "Projectors", "Microphones", "Lighting", "Restrooms", "Security", "Translation Services"]', '{"main_hall": {"capacity": 4000, "type": "theater"}, "breakout_rooms": {"count": 15, "capacity_each": 60}, "exhibition_space": {"area_sqm": 3000}}', true, true, ?, '+254-20-271-0000', 'info@kicc.co.ke', 'Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 4:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kasarani Stadium (Moi International Sports Centre)', 'Modern sports complex in Nairobi, home to major football matches, athletics, and entertainment events.', 'Thika Road, Kasarani', 'Nairobi', 'Nairobi County', 'Kenya', '00501', -1.2217, 36.9256, 60000, 'stadium', '["Parking", "VIP Boxes", "Press Facilities", "Changing Rooms", "Medical Facilities", "Food Courts", "Security", "Lighting", "Sound System", "Scoreboards"]', '{"main_stadium": {"capacity": 60000, "type": "stadium"}, "indoor_arena": {"capacity": 5000, "type": "arena"}, "warm_up_track": {"type": "athletics"}}', true, true, ?, '+254-20-866-0000', 'info@kasarani.co.ke', 'Daily: 6:00 AM - 9:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Nyayo National Stadium', 'Multi-purpose stadium in Nairobi, hosting football matches, athletics, and major concerts.', 'Jogoo Road, Nairobi West', 'Nairobi', 'Nairobi County', 'Kenya', '00500', -1.2992, 36.8219, 30000, 'stadium', '["Parking", "VIP Boxes", "Press Facilities", "Changing Rooms", "Medical Facilities", "Food Courts", "Security", "Lighting", "Sound System"]', '{"main_stadium": {"capacity": 30000, "type": "stadium"}, "warm_up_area": {"area_sqm": 500}}', true, true, ?, '+254-20-271-4444', 'info@nyayostadium.co.ke', 'Daily: 6:00 AM - 9:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kenya National Theatre', 'Cultural hub for performing arts in Nairobi, hosting theatrical performances, concerts, and cultural events.', 'Harry Thuku Road, Community Area', 'Nairobi', 'Nairobi County', 'Kenya', '00100', -1.2633, 36.8115, 650, 'theater', '["WiFi", "Parking", "Bar", "Restaurant", "Sound System", "Lighting", "Dressing Rooms", "Rehearsal Studios", "Gallery Space"]', '{"main_theater": {"capacity": 650, "type": "theater"}, "studio_theater": {"capacity": 150, "type": "black_box"}, "gallery": {"capacity": 100, "type": "exhibition"}}', true, true, NULL, '+254-20-222-7777', 'info@nationaltheatre.go.ke', 'Tuesday-Sunday: 9:00 AM - 9:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Sarit Centre Expo Centre', 'Modern exhibition and conference facility in Westlands, perfect for trade shows, product launches, and corporate events.', 'Sarit Centre, Westlands', 'Nairobi', 'Nairobi County', 'Kenya', '00800', -1.2655, 36.8019, 2000, 'exhibition_center', '["WiFi", "Parking", "Catering", "AV Equipment", "Exhibition Halls", "Meeting Rooms", "Loading Bay", "Security", "Climate Control"]', '{"main_hall": {"capacity": 1500, "type": "exhibition"}, "conference_rooms": {"count": 8, "capacity_each": 50}, "outdoor_pavilion": {"capacity": 500, "type": "open_air"}}', true, true, NULL, '+254-20-374-0000', 'events@saritcentre.co.ke', 'Monday-Saturday: 8:00 AM - 8:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Mombasa Beach Arena', 'Beachfront venue in Mombasa, perfect for concerts, festivals, and outdoor events with ocean views.', 'Diani Beach Road', 'Mombasa', 'Mombasa County', 'Kenya', '80101', -4.2767, 39.5971, 5000, 'outdoor_venue', '["Beach Access", "Parking", "Outdoor Stage", "Sound System", "Lighting", "Food Courts", "Security", "Restrooms", "VIP Areas"]', '{"main_stage": {"capacity": 5000, "type": "outdoor"}, "vip_lounge": {"capacity": 200, "type": "covered"}, "beach_area": {"capacity": 1000, "type": "open"}}', false, true, NULL, '+254-41-222-0000', 'events@mombasabeacharena.co.ke', 'Daily: 10:00 AM - 11:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Eldoret Sports Club', 'Premier sports facility in Eldoret, hosting athletics meets, football matches, and community events.', 'Kipchoge Keino Road', 'Eldoret', 'Uasin Gishu County', 'Kenya', '30100', 0.5143, 35.2698, 15000, 'sports_complex', '["Athletics Track", "Football Pitch", "Training Facilities", "Gym", "Parking", "Changing Rooms", "Medical Center", "Security"]', '{"main_stadium": {"capacity": 15000, "type": "multi_purpose"}, "training_grounds": {"count": 4, "type": "practice"}, "athletics_track": {"type": "standard_400m"}}', true, true, NULL, '+254-53-300-0000', 'info@eldoretsports.co.ke', 'Daily: 6:00 AM - 8:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kisumu Cultural Centre', 'Cultural venue in Kisumu celebrating Luo heritage and hosting traditional performances, conferences, and community events.', 'Oginga Odinga Street', 'Kisumu', 'Kisumu County', 'Kenya', '40100', -0.0917, 34.7678, 800, 'cultural_center', '["Performance Hall", "Exhibition Space", "Meeting Rooms", "Cultural Museum", "Parking", "Catering", "Sound System", "Traditional Instruments"]', '{"main_hall": {"capacity": 600, "type": "theater"}, "cultural_museum": {"capacity": 100, "type": "exhibition"}, "outdoor_amphitheater": {"capacity": 200, "type": "open_air"}}', true, true, NULL, '+254-57-200-0000', 'info@kisumucultural.co.ke', 'Monday-Saturday: 9:00 AM - 6:00 PM', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [kariuki?.id, musa?.id, atieno?.id]);
    
    // Get venue and organizer IDs for events
    const kicc = await db('venues').where('name', 'Kenyatta International Convention Centre').first();
    const kasarani = await db('venues').where('name', 'Kasarani Stadium (Moi International Sports Centre)').first();
    const nyayo = await db('venues').where('name', 'Nyayo National Stadium').first();
    const nationalTheatre = await db('venues').where('name', 'Kenya National Theatre').first();
    const saritCentre = await db('venues').where('name', 'Sarit Centre Expo Centre').first();
    const mombasaBeach = await db('venues').where('name', 'Mombasa Beach Arena').first();
    
    const eventOrganizer = await db('users').where('email', 'events@kenyaconventions.co.ke').first();
    const musicOrganizer = await db('users').where('email', 'music@kenyafestivals.co.ke').first();
    
    // Run events seed
    console.log('🎉 Seeding events...');
    await db.raw(`
      INSERT INTO events (title, description, short_description, event_type, category, venue_id, organizer_id, start_date, end_date, base_price, currency, total_capacity, available_tickets, sold_tickets, status, event_image_url, tags, terms_and_conditions, refund_policy, is_featured, requires_approval, min_age, has_seating, published_at, sales_start_date, sales_end_date, created_at, updated_at) VALUES
      ('Nairobi Tech Summit 2026', 'Annual technology conference featuring Kenya''s leading tech innovators, entrepreneurs, and industry leaders. Topics include AI, blockchain, fintech, mobile money, and digital transformation.', 'Kenya''s premier technology conference and networking event.', 'conference', 'business', $1, $7, '2026-03-15T09:00:00Z', '2026-03-16T17:00:00Z', 8500.00, 'KES', 1200, 1200, 0, 'published', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800', '["technology", "innovation", "networking", "business", "fintech"]', 'Standard conference terms apply. Refund policy: Full refund 30 days prior, 50% refund 14 days prior, no refunds within 7 days.', 'Flexible refund policy with processing fees waived for early cancellations.', true, false, 18, true, CURRENT_TIMESTAMP, '2026-01-01T00:00:00Z', '2026-03-14T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Safari Sound Festival', 'Kenya''s biggest music festival featuring top local and international artists across multiple genres including Afrobeats, Gengetone, Benga, and contemporary music.', 'Experience the best of Kenyan and African music in one electrifying festival.', 'festival', 'music', $6, $8, '2026-04-20T16:00:00Z', '2026-04-21T23:00:00Z', 2500.00, 'KES', 5000, 5000, 0, 'published', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800', '["music", "festival", "afrobeats", "gengetone", "live_performance"]', 'Festival terms apply. No refunds within 7 days of event. Weather policy applies for outdoor events.', 'Full refund 14 days prior, 50% refund 7 days prior, no refunds within 7 days.', true, false, 16, false, CURRENT_TIMESTAMP, '2026-01-15T00:00:00Z', '2026-04-19T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kenya Premier League: Gor Mahia vs AFC Leopards', 'The biggest football derby in Kenya featuring the two most successful clubs in Kenyan football history. A must-see match for any football fan.', "Kenya's most intense football rivalry at the national stadium.", 'sports', 'football', $3, $7, '2026-02-28T15:00:00Z', '2026-02-28T18:00:00Z', 500.00, 'KES', 25000, 25000, 0, 'published', 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800', '["football", "sports", "kpl", "derby", "gor_mahia", "afc_leopards"]', 'Standard stadium terms apply. No weapons, alcohol, or outside food allowed.', 'Full refund 48 hours before match, no refunds within 48 hours.', false, false, 5, true, CURRENT_TIMESTAMP, '2026-01-01T00:00:00Z', '2026-02-27T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kenya Fashion Week', 'Showcasing the best of Kenyan fashion design with runway shows, designer exhibitions, and networking opportunities for fashion professionals.', 'Celebrate Kenya''s vibrant fashion industry and emerging designers.', 'fashion_show', 'fashion', $1, $7, '2026-05-10T18:00:00Z', '2026-05-12T21:00:00Z', 3500.00, 'KES', 2000, 2000, 0, 'published', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800', '["fashion", "design", "runway", "kenyan_designers", "style"]', 'Fashion week terms apply. Professional photography restrictions may apply.', 'Full refund 7 days prior, no refunds within 7 days.', true, false, 16, true, CURRENT_TIMESTAMP, '2026-02-01T00:00:00Z', '2026-05-09T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('M-Pesa Mobile Money Conference', 'Exploring the future of mobile money and digital payments in Kenya and across Africa. Features industry leaders from M-Pesa, banks, and fintech startups.', 'The premier event for mobile money and digital payment professionals.', 'conference', 'business', $5, $7, '2026-06-05T09:00:00Z', '2026-06-05T17:00:00Z', 4500.00, 'KES', 500, 500, 0, 'published', 'https://images.unsplash.com/photo-1563986768494-47dee0e271e3?w=800', '["mobile_money", "fintech", "mpesa", "digital_payments", "banking"]', 'Conference terms apply. Networking sessions included.', 'Full refund 14 days prior, 50% refund 7 days prior, no refunds within 7 days.', false, false, 18, true, CURRENT_TIMESTAMP, '2026-03-01T00:00:00Z', '2026-06-04T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kenya International Comedy Festival', 'Featuring top comedians from Kenya and across Africa, including stand-up, improv, and sketch comedy performances.', 'Laugh out loud with Africa''s best comedians in Nairobi.', 'comedy', 'entertainment', $4, $8, '2026-07-15T19:00:00Z', '2026-07-17T22:00:00Z', 1500.00, 'KES', 600, 600, 0, 'published', 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800', '["comedy", "stand_up", "entertainment", "african_comedy", "live_performance"]', 'Comedy show terms apply. Age restrictions may apply for certain performances.', 'Full refund 7 days prior, no refunds within 7 days.', false, false, 18, true, CURRENT_TIMESTAMP, '2026-04-01T00:00:00Z', '2026-07-14T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Nairobi Marathon 2026', 'Kenya''s premier running event featuring full marathon, half marathon, 10km, and 5km races through the streets of Nairobi.', 'Run with champions in Kenya''s capital city marathon.', 'sports', 'running', $3, $7, '2026-10-26T06:00:00Z', '2026-10-26T14:00:00Z', 2000.00, 'KES', 20000, 20000, 0, 'published', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', '["marathon", "running", "sports", "fitness", "nairobi", "athletics"]', 'Marathon terms apply. Medical certificate required for full marathon participants.', 'Full refund 30 days prior, 50% refund 14 days prior, no refunds within 14 days.', true, false, 16, false, CURRENT_TIMESTAMP, '2026-05-01T00:00:00Z', '2026-10-25T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
      ('Kenyan Food & Wine Festival', 'Celebrate Kenya''s diverse culinary scene with traditional dishes, modern fusion cuisine, local wines, and international flavors.', 'Taste the best of Kenyan cuisine and beverages at this food lover''s paradise.', 'festival', 'food', $6, $8, '2026-08-10T12:00:00Z', '2026-08-11T22:00:00Z', 1800.00, 'KES', 3000, 3000, 0, 'published', 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800', '["food", "wine", "kenyan_cuisine", "festival", "culinary", "tasting"]', 'Food festival terms apply. Allergen information available at venue.', 'Full refund 7 days prior, no refunds within 7 days.', false, false, 18, false, CURRENT_TIMESTAMP, '2026-05-15T00:00:00Z', '2026-08-09T23:59:59Z', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [kicc?.id, kasarani?.id, nyayo?.id, nationalTheatre?.id, saritCentre?.id, mombasaBeach?.id, eventOrganizer?.id, musicOrganizer?.id]);
    
    console.log('\n🎉 Kenyan seed data migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Kenyan payment methods (M-Pesa, Pesepal, Equitel, Airtel Money, T-Kash)');
    console.log('   ✅ Kenyan users (regular users, organizers, venue managers)');
    console.log('   ✅ Kenyan venues (KICC, Kasarani Stadium, Nyayo, etc.)');
    console.log('   ✅ Kenyan events (Tech Summit, Safari Sound Festival, etc.)');
    console.log('\n🌍 Your application is now fully Kenyan!');
    
    await db.destroy();
    
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  }
}

resetAndSeed();
