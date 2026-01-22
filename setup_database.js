const knex = require('knex');
const knexConfig = require('./knexfile');

async function setupDatabase() {
  try {
    console.log('🔧 Setting up database...');
    
    const db = knex(knexConfig.development);
    
    // Test connection
    await db.raw('SELECT 1');
    console.log('✅ Database connected');
    
    // Create basic tables manually if they don't exist
    console.log('📋 Creating basic tables...');
    
    // Users table
    await db.raw(`
      CREATE TABLE IF NOT EXISTS users (
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
    
    // Venues table
    await db.raw(`
      CREATE TABLE IF NOT EXISTS venues (
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
      CREATE TABLE IF NOT EXISTS events (
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
    
    // Payment methods table
    await db.raw(`
      CREATE TABLE IF NOT EXISTS payment_methods (
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
    
    console.log('✅ Basic tables created');
    
    // Move Kenyan seeds back
    console.log('📁 Moving Kenyan seeds back...');
    const fs = require('fs');
    const path = require('path');
    
    const kenyanSeeds = [
      '001_payment_methods_kenya.js',
      '002_users_kenya.js', 
      '003_venues_kenya.js',
      '004_events_kenya.js'
    ];
    
    for (const seed of kenyanSeeds) {
      const src = path.join('seeds', 'kenyan_backup', seed);
      const dest = path.join('seeds', seed);
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
        console.log(`✅ Moved ${seed}`);
      }
    }
    
    console.log('🎉 Database setup complete!');
    console.log('🌱 Now you can run: npx knex seed:run');
    
    await db.destroy();
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

setupDatabase();
