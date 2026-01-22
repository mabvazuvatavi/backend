/**
 * Add venue_id to seat_pricing_tiers to support venue-defined pricing zones
 * This allows venue managers to define tier structures once for their venue
 * instead of recreating for every event
 */

exports.up = function(knex) {
  return knex.schema.alterTable('seat_pricing_tiers', function(table) {
    // Make event_id nullable (can be null if tier is venue-level)
    table.uuid('event_id').nullable().alter();
    
    // Add venue_id column
    table.uuid('venue_id').nullable();
    
    // Add is_venue_tier flag to distinguish venue-level vs event-level
    table.boolean('is_venue_tier').defaultTo(false);
    
    // Foreign key for venue
    table.foreign('venue_id').references('id').inTable('venues').onDelete('CASCADE');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('seat_pricing_tiers', function(table) {
    table.dropForeign(['venue_id']);
    table.dropColumn('venue_id');
    table.dropColumn('is_venue_tier');
    table.uuid('event_id').notNullable().alter();
  });
};
