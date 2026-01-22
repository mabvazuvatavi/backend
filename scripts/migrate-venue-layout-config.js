#!/usr/bin/env node

/**
 * CLI script to migrate venue layout_config to new seat types structure
 * Usage: node scripts/migrate-venue-layout-config.js [--venue-id UUID] [--dry-run]
 */

require('dotenv').config();
const layoutConfigMigrationService = require('../services/layoutConfigMigrationService');
const db = require('../config/database');

// Simple audit logging function for migration
const logAuditAction = async (action) => {
  try {
    await db('audit_log').insert({
      user_id: action.userId || 'system',
      action: action.action,
      resource_type: action.resourceType,
      resource_id: action.resourceId,
      changes: JSON.stringify(action.changes || {}),
      ip_address: '127.0.0.1',
      user_agent: 'Migration Script',
      created_at: new Date()
    });
  } catch (error) {
    console.warn('Failed to log audit action:', error.message);
  }
};

async function main() {
  const args = process.argv.slice(2);
  const venueId = args.includes('--venue-id') ? args[args.indexOf('--venue-id') + 1] : null;
  const isDryRun = args.includes('--dry-run');
  const showHelp = args.includes('--help') || args.includes('-h');

  if (showHelp) {
    console.log(`
Venue Layout Config Migration Script

Usage:
  node scripts/migrate-venue-layout-config.js [options]

Options:
  --venue-id UUID    Migrate specific venue only
  --dry-run          Show what would be migrated without making changes
  --help, -h         Show this help message

Examples:
  # Migrate all venues
  node scripts/migrate-venue-layout-config.js

  # Migrate specific venue
  node scripts/migrate-venue-layout-config.js --venue-id 123e4567-e89b-12d3-a456-426614174000

  # Dry run to see what would be migrated
  node scripts/migrate-venue-layout-config.js --dry-run
`);
    process.exit(0);
  }

  try {
    console.log('🚀 Starting venue layout config migration...\n');

    // Show current status
    const status = await layoutConfigMigrationService.getMigrationStatus();
    console.log('📊 Current Status:');
    console.log(`  Total venues: ${status.total_venues}`);
    console.log(`  Venues with layout_config: ${status.venues_with_layout_config}`);
    console.log(`  Venues with seat_types: ${status.venues_with_seat_types}`);
    console.log(`  Venues needing migration: ${status.venues_need_migration}\n`);

    if (status.venues_need_migration === 0) {
      console.log('✅ All venues are already migrated!');
      process.exit(0);
    }

    if (isDryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
      
      if (venueId) {
        const needsMigration = await layoutConfigMigrationService.needsMigration(venueId);
        console.log(`Venue ${venueId} ${needsMigration ? 'NEEDS' : 'DOES NOT NEED'} migration`);
      } else {
        console.log('Venues that need migration will be listed above.');
      }
      
      console.log('\n💡 To run the actual migration, remove the --dry-run flag');
      process.exit(0);
    }

    // Perform migration
    let results;
    if (venueId) {
      console.log(`🎯 Migrating specific venue: ${venueId}`);
      
      const db = require('../config/database');
      const venue = await db('venues')
        .where('id', venueId)
        .where('deleted_at', null)
        .select('id', 'name', 'venue_type', 'layout_config')
        .first();

      if (!venue) {
        throw new Error(`Venue not found: ${venueId}`);
      }

      if (!venue.layout_config) {
        console.log('⚠️  This venue has no layout_config to migrate');
        process.exit(0);
      }

      const migratedSeatTypes = await layoutConfigMigrationService.migrateVenue(venue, 'system');
      
      results = {
        total: 1,
        successful: 1,
        failed: 0,
        errors: []
      };

      console.log(`✅ Successfully migrated venue: ${venue.name}`);
      console.log(`   Created ${migratedSeatTypes.length} seat types`);
      
      const totalSections = migratedSeatTypes.reduce((sum, st) => sum + st.sections.length, 0);
      console.log(`   Created ${totalSections} sections`);
    } else {
      console.log('🔄 Migrating all venues with layout_config...');
      results = await layoutConfigMigrationService.migrateAllVenues('system');
    }

    // Show results
    console.log('\n📈 Migration Results:');
    console.log(`  Total processed: ${results.total}`);
    console.log(`  Successful: ${results.successful}`);
    console.log(`  Failed: ${results.failed}`);

    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(error => {
        console.log(`  ${error.venueName} (${error.venueId}): ${error.error}`);
      });
    }

    // Log audit action
    await logAuditAction({
      userId: 'system',
      action: 'MIGRATE_VENUE_LAYOUT_CONFIG',
      resourceType: 'system',
      resourceId: null,
      changes: {
        total: results.total,
        successful: results.successful,
        failed: results.failed,
        venueId: venueId || 'all'
      }
    });

    console.log('\n🎉 Migration completed!');

    // Show final status
    const finalStatus = await layoutConfigMigrationService.getMigrationStatus();
    console.log('\n📊 Final Status:');
    console.log(`  Venues with layout_config: ${finalStatus.venues_with_layout_config}`);
    console.log(`  Venues with seat_types: ${finalStatus.venues_with_seat_types}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };
