/**
 * Create venue_seat_types table for venue-level seat type management
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('venue_seat_types', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('venue_id').notNullable();
    table.string('name', 64).notNullable();
    table.string('type', 32).notNullable(); // standard, vip, premium, box, balcony, etc.
    table.text('description');
    table.decimal('default_price', 10, 2).notNullable();
    table.string('color', 16).defaultTo('#888').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
    table.timestamp('deleted_at');
    
    // Foreign key and indexes
    table.foreign('venue_id').references('id').inTable('venues').onDelete('CASCADE');
    table.unique(['venue_id', 'name']);
    table.index(['venue_id', 'is_active']);
    table.index(['venue_id', 'type']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('venue_seat_types');
};
