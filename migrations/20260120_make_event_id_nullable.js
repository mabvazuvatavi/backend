/**
 * Migration: Make event_id nullable in shopping_cart_items
 * 
 * This allows cart items to represent non-event products (flights, buses, hotels)
 * while maintaining backward compatibility with existing event cart items.
 */

exports.up = async function(knex) {
  // Drop the foreign key constraint first
  await knex.schema.alterTable('shopping_cart_items', table => {
    table.dropForeign('event_id');
  });

  // Alter the column to be nullable
  await knex.schema.raw(`
    ALTER TABLE shopping_cart_items 
    ALTER COLUMN event_id DROP NOT NULL
  `);

  // Re-add the foreign key constraint (now allowing NULL)
  await knex.schema.alterTable('shopping_cart_items', table => {
    table.foreign('event_id').references('events.id').onDelete('CASCADE');
  });
};

exports.down = async function(knex) {
  // Remove any non-event items first (they would have null event_id)
  await knex('shopping_cart_items').whereNull('event_id').del();

  // Drop the foreign key
  await knex.schema.alterTable('shopping_cart_items', table => {
    table.dropForeign('event_id');
  });

  // Make the column NOT NULL again
  await knex.schema.raw(`
    ALTER TABLE shopping_cart_items 
    ALTER COLUMN event_id SET NOT NULL
  `);

  // Re-add the foreign key constraint
  await knex.schema.alterTable('shopping_cart_items', table => {
    table.foreign('event_id').references('events.id').onDelete('CASCADE');
  });
};
