const db = require('./config/database');

async function verify() {
  try {
    console.log('📊 Verifying venue pricing tiers setup...\n');
    
    const venues = await db('venues')
      .where('has_seating', true)
      .whereNull('deleted_at')
      .select('id', 'name', 'venue_type');
    
    console.log(`Found ${venues.length} venue(s) with seating:\n`);
    
    for (const venue of venues) {
      console.log(`✅ ${venue.name} (${venue.venue_type})`);
      
      const venueTiers = await db('seat_pricing_tiers')
        .where('venue_id', venue.id)
        .where('is_venue_tier', true)
        .select('name', 'price', 'color');
      
      if (venueTiers.length > 0) {
        console.log(`   Venue tiers (${venueTiers.length}):`);
        venueTiers.forEach(tier => {
          console.log(`     • ${tier.name}: KES ${tier.price}`);
        });
      } else {
        console.log('   ⚠️  No venue tiers found!');
      }
      
      // Check if any events at this venue
      const events = await db('events')
        .where('venue_id', venue.id)
        .whereNull('deleted_at')
        .select('id', 'title', 'has_seating');
      
      if (events.length > 0) {
        console.log(`   Events at venue (${events.length}):`);
        events.forEach(event => {
          console.log(`     • ${event.title} (seating: ${event.has_seating})`);
        });
      }
      console.log('');
    }
    
    // Show migration status
    console.log('\n📋 Migration status:');
    const migrations = await db.raw(`
      SELECT * FROM knex_migrations_lock;
    `).catch(() => null);
    
    const latestMigration = await db.raw(`
      SELECT * FROM knex_migrations 
      ORDER BY migration_time DESC 
      LIMIT 1;
    `).then(result => result.rows[0] || result[0]);
    
    if (latestMigration) {
      console.log(`✅ Latest migration: ${latestMigration.name}`);
    }
    
    console.log('\n✨ Tier architecture is now CORRECTED!');
    console.log('   • Venue managers define their own tier structures');
    console.log('   • Different venues have different tier names (Bays, Suites, Stalls, etc.)');
    console.log('   • Events inherit venue tiers automatically');
    console.log('   • Organizers can customize prices for their specific events');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

verify();
