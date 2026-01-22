/**
 * Create venue_sections table for venue section management
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('venue_sections', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable();
    table.uuid('seat_type_id').notNullable();
    table.string('name', 128).notNullable();
    table.integer('rows').notNullable();
    table.integer('seats_per_row').notNullable();
    table.decimal('price_override', 10, 2); // Optional override of seat type default price
    table.text('notes');
    table.integer('sort_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    // Foreign key and indexes
    table.foreign('venue_id').references('id').inTable('venues').onDelete('CASCADE');
    table.foreign('seat_type_id').references('id').inTable('venue_seat_types').onDelete('CASCADE');
    table.unique(['venue_id', 'name']);
    table.index(['venue_id', 'seat_type_id']);
    table.index(['venue_id', 'is_active']);
    table.index(['seat_type_id', 'is_active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('venue_sections');
};
