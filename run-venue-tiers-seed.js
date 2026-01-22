/**
 * Standalone script to seed venue-level pricing tiers
 * Bypasses knex seed runner to avoid errors from other seeds
 */

const db = require('./config/database');
const seedFunction = require('./seeds/08_venue_pricing_tiers');

async function runSeed() {
  try {
    console.log('🌱 Starting venue pricing tiers seed...');
    await seedFunction.seed(db);
    console.log('✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

runSeed();
