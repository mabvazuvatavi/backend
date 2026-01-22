/**
 * Seed only users (skip payment methods seed that has schema issues)
 */
const knex = require('knex');
const knexfile = require('./knexfile');

const db = knex(knexfile.development);

async function seedUsers() {
  try {
    console.log('🌱 Starting user seed...');

    // Clear existing users
    await db('users').del();
    console.log('✅ Cleared existing users');

    // Import the users seed
    const usersSeed = require('./seeds/002_users_kenya');
    await usersSeed.seed(db);
    
    console.log('✅ Users seeded successfully');
    
    // Show count
    const count = await db('users').count('* as total').first();
    console.log(`📊 Total users in database: ${count.total}`);
    
    // Show sample users
    const users = await db('users').limit(5).select('id', 'email', 'first_name', 'role', 'is_active');
    console.log('\n📋 Sample users:');
    console.table(users);

  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    process.exit(1);
  } finally {
    await db.destroy();
    process.exit(0);
  }
}

seedUsers();
