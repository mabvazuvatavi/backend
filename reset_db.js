const knex = require('knex');
const config = require('./knexfile');

async function resetDatabase() {
  const db = knex(config.development);
  
  try {
    console.log('🗑️  Dropping public schema...');
    await db.raw('DROP SCHEMA public CASCADE');
    console.log('✅ Schema dropped');
    
    console.log('📋 Creating public schema...');
    await db.raw('CREATE SCHEMA public');
    console.log('✅ Schema created');
    
    console.log('✅ Database reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetDatabase();
