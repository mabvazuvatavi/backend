/**
 * CORRECTED Seed: Create VENUE-LEVEL pricing tiers (zones)
 * 
 * KEY DIFFERENCE from previous seed:
 * - Venue managers define their own tier structures
 * - NOT hardcoded to Standard/Premium/VIP
 * - Different venues have different tier names (Bays, Suites, VVIP, etc.)
 * - Events inherit venue tiers, can customize prices for their event
 */

exports.seed = async function(knex) {
  try {
    console.log('🎭 Creating venue-level pricing tiers (zones)...');
    
    // Get all venues with seating enabled
    const venues = await knex('venues')
      .where('has_seating', true)
      .whereNull('deleted_at')
      .select('id', 'name', 'venue_type');

    if (venues.length === 0) {
      console.log('⚠️  No venues with seating found. Skipping venue tier seed.');
      return;
    }

    console.log(`📍 Found ${venues.length} venue(s) with seating`);

    for (const venue of venues) {
      // Check if venue already has tiers defined
      const existingTiers = await knex('seat_pricing_tiers')
        .where('venue_id', venue.id)
        .count('* as count')
        .first();

      if (existingTiers.count > 0) {
        console.log(`  ⏭️  Venue "${venue.name}" already has tiers. Skipping...`);
        continue;
      }

      console.log(`  ✅ Creating tiers for venue: ${venue.name} (${venue.venue_type})`);

      // Define tier structure based on venue type
      let tierStructure = [];
      
      if (venue.venue_type === 'stadium' || venue.venue_type === 'sports_complex') {
        // Stadium: General, Bays, Suites, VVIP
        tierStructure = [
          {
            name: 'General',
            description: 'General Admission',
            price: 50.00,
            color: '#2196F3',
            section: 'General'
          },
          {
            name: 'Bay',
            description: 'Bay Seating',
            price: 100.00,
            color: '#FFD700',
            section: 'Bay'
          },
          {
            name: 'Suite',
            description: 'Private Suite',
            price: 250.00,
            color: '#FF1493',
            section: 'Suite'
          },
          {
            name: 'VVIP',
            description: 'Very Important Person',
            price: 500.00,
            color: '#4CAF50',
            section: 'VVIP'
          }
        ];
      } else if (venue.venue_type === 'theater' || venue.venue_type === 'concert_hall') {
        // Theater: Stalls, Circle, Balcony, Box
        tierStructure = [
          {
            name: 'Stalls',
            description: 'Ground Floor',
            price: 75.00,
            color: '#2196F3',
            section: 'Stalls'
          },
          {
            name: 'Circle',
            description: 'First Balcony',
            price: 50.00,
            color: '#FFD700',
            section: 'Circle'
          },
          {
            name: 'Balcony',
            description: 'Upper Level',
            price: 30.00,
            color: '#FF9800',
            section: 'Balcony'
          },
          {
            name: 'Box',
            description: 'Private Box',
            price: 120.00,
            color: '#FF1493',
            section: 'Box'
          }
        ];
      } else if (venue.venue_type === 'arena') {
        // Arena: Floor, Lower Bowl, Upper Bowl, Club Level
        tierStructure = [
          {
            name: 'Floor',
            description: 'Floor Seating',
            price: 150.00,
            color: '#FF1493',
            section: 'Floor'
          },
          {
            name: 'Lower Bowl',
            description: 'Lower Level',
            price: 100.00,
            color: '#2196F3',
            section: 'Lower'
          },
          {
            name: 'Upper Bowl',
            description: 'Upper Level',
            price: 50.00,
            color: '#FFD700',
            section: 'Upper'
          },
          {
            name: 'Club Level',
            description: 'Premium Club Access',
            price: 250.00,
            color: '#4CAF50',
            section: 'Club'
          }
        ];
      } else {
        // Default: Standard, Premium, VIP
        tierStructure = [
          {
            name: 'Standard',
            description: 'Standard Seating',
            price: 50.00,
            color: '#2196F3',
            section: 'General'
          },
          {
            name: 'Premium',
            description: 'Premium Seating',
            price: 100.00,
            color: '#FFD700',
            section: 'Premium'
          },
          {
            name: 'VIP',
            description: 'Very Important Person',
            price: 200.00,
            color: '#FF1493',
            section: 'VIP'
          }
        ];
      }

      // Insert venue-level tiers
      const tiers = tierStructure.map(tier => ({
        id: require('uuid').v4(),
        venue_id: venue.id,
        event_id: null,  // NULL = venue-level tier
        name: tier.name,
        description: tier.description,
        price: tier.price,
        color: tier.color,
        section: tier.section,
        is_venue_tier: true,
        created_at: new Date()
      }));

      await knex('seat_pricing_tiers').insert(tiers);
      console.log(`     ✓ Created ${tiers.length} tiers for ${venue.name}`);
    }

    console.log('\n✅ All venue-level pricing tiers created successfully!');
    console.log('\n📝 IMPORTANT:');
    console.log('   - Venue managers can now update their venue\'s tier structure');
    console.log('   - When organizers create events at a venue, they inherit venue tiers');
    console.log('   - Organizers can customize prices for their specific event');
    console.log('   - Each venue type has appropriate tier names (Bays, Suites, etc.)');
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    throw error;
  }
};
