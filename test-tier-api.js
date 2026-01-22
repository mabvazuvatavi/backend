/**
 * Test script: Verify tier API returns venue tiers for events
 */

const API_BASE = 'http://localhost:3800/api';

async function testTierAPI() {
  try {
    console.log('📋 Testing Tier Architecture...\n');
    
    // 1. Get an event with seating
    console.log('1️⃣ Fetching event with seating...');
    const eventsRes = await fetch(`${API_BASE}/events?has_seating=true&limit=1`);
    const eventsData = await eventsRes.json();
    
    if (!eventsData.success || eventsData.data.events.length === 0) {
      console.error('❌ No events found with seating');
      return;
    }
    
    const event = eventsData.data.events[0];
    console.log(`✅ Event: ${event.title} (venue_id: ${event.venue_id})`);
    console.log(`   has_seating: ${event.has_seating}\n`);
    
    // 2. Fetch event pricing tiers (should return venue tiers)
    console.log('2️⃣ Fetching event pricing tiers...');
    const pricingRes = await fetch(`${API_BASE}/seats/event/${event.id}/pricing`);
    const pricingData = await pricingRes.json();
    
    if (!pricingData.success) {
      console.error('❌ Failed to fetch pricing tiers:', pricingData);
      return;
    }
    
    console.log(`✅ API Response:`, pricingData.data);
    
    if (pricingData.data.pricingTiers.length === 0) {
      console.error('⚠️  WARNING: Event has no pricing tiers!');
      console.log('   Expected: Venue tiers should be inherited\n');
    } else {
      console.log(`✅ Got ${pricingData.data.pricingTiers.length} pricing tiers:`);
      pricingData.data.pricingTiers.forEach(tier => {
        console.log(`   • ${tier.name}: KES ${tier.price} (${tier.color})`);
      });
      console.log(`\n✅ Source: ${pricingData.data.source} (venue or event)\n`);
    }
    
    // 3. Fetch venue tier structure directly
    console.log('3️⃣ Fetching venue tier structure...');
    const venueRes = await fetch(`${API_BASE}/seats/venue/${event.venue_id}/pricing-tiers`);
    const venueData = await venueRes.json();
    
    if (!venueData.success) {
      console.error('❌ Failed to fetch venue tiers:', venueData);
      return;
    }
    
    console.log(`✅ Venue: ${venueData.data.venue.name} (${venueData.data.venue.venue_type})`);
    console.log(`✅ Venue tiers (${venueData.data.pricingTiers.length}):`);
    venueData.data.pricingTiers.forEach(tier => {
      console.log(`   • ${tier.name}: KES ${tier.price} (${tier.color})`);
    });
    
    // 4. Verify they match
    console.log('\n4️⃣ Verification:');
    if (pricingData.data.source === 'venue' && 
        pricingData.data.pricingTiers.length === venueData.data.pricingTiers.length) {
      console.log('✅ SUCCESS: Event inherited venue tiers correctly!');
      console.log('✅ Tier architecture is working as expected.');
    } else {
      console.log('⚠️  Event tiers don\'t match venue tiers (event may have custom tiers)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTierAPI();
