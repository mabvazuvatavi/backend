/**
 * Migration: Add item_type and item_ref_id to shopping_cart_items
 * 
 * This enables a unified cart system supporting multiple item types:
 * - event (existing)
 * - flight
 * - bus
 * - hotel
 * 
 * Option 2 approach: Use item_type + item_ref_id for cleaner auditing
 * instead of multiple nullable foreign keys.
 */

exports.up = async function(knex) {
  await knex.schema.alterTable('shopping_cart_items', table => {
    // Add item_type column: event, flight, bus, hotel
    table.string('item_type').defaultTo('event').index();
    
    // Add item_ref_id for non-event items (flight offerId, bus id, hotel code, etc.)
    table.string('item_ref_id').nullable().index();
    
    // Add item_title for display purposes (flight route, bus route, hotel name)
    table.string('item_title').nullable();
    
    // Make event_id nullable to support non-event items
    // Note: We can't easily change NOT NULL constraint, so we'll handle this in code
    // and use item_type to determine which field to use
  });

  // Update existing rows to have item_type = 'event'
  await knex('shopping_cart_items')
    .whereNull('item_type')
    .update({ item_type: 'event' });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('shopping_cart_items', table => {
    table.dropColumn('item_type');
    table.dropColumn('item_ref_id');
    table.dropColumn('item_title');
  });
};
