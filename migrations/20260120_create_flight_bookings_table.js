/**
 * Migration: Create flight_bookings table
 * 
 * Stores flight booking records when users checkout with flight items.
 * Uses flight_offer_id (from Amadeus/mock) instead of a flight_id FK
 * since flights are external API data, not stored in our DB.
 */

exports.up = async function(knex) {
  await knex.schema.createTable('flight_bookings', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().index();
    table.foreign('user_id').references('users.id').onDelete('SET NULL');
    table.uuid('order_id').nullable().index();
    table.foreign('order_id').references('orders.id').onDelete('SET NULL');
    
    // Flight identification (external API reference)
    table.string('flight_offer_id').notNullable().index();
    table.string('booking_reference').nullable(); // PNR from Amadeus
    
    // Passenger info
    table.integer('passengers_count').defaultTo(1);
    table.json('passenger_details').nullable(); // Array of passenger objects
    table.json('contact_info').nullable(); // Contact person details
    
    // Flight details (cached from API at booking time)
    table.json('flight_details').nullable(); // Full flight offer data
    table.string('airline').nullable();
    table.string('departure_airport').nullable();
    table.string('arrival_airport').nullable();
    table.timestamp('departure_time').nullable();
    table.timestamp('arrival_time').nullable();
    
    // Pricing
    table.decimal('total_price', 12, 2).defaultTo(0);
    table.string('currency').defaultTo('KES');
    
    // Status
    table.string('status').defaultTo('pending').index(); // pending, confirmed, cancelled, completed
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index(['user_id', 'status']);
    table.index('booking_reference');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('flight_bookings');
};
