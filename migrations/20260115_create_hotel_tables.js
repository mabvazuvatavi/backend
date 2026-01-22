/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    // Hotel bookings table
    .createTable('hotel_bookings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('booking_reference').unique().notNullable();
      table.string('hotel_code').notNullable();
      table.string('hotel_name').notNullable();
      table.json('holder_info').notNullable(); // name, email, phone
      table.json('rooms').notNullable(); // room details
      table.date('check_in').notNullable();
      table.date('check_out').notNullable();
      table.decimal('total_amount', 10, 2).notNullable();
      table.string('currency', 3).defaultTo('KES');
      table.string('status').defaultTo('pending'); // pending, confirmed, cancelled, completed
      table.text('cancellation_reason').nullable();
      table.json('cancellation_policies').nullable();
      table.text('remarks').nullable();
      table.json('payment_info').nullable(); // payment method, transaction details
      table.timestamp('booking_date').defaultTo(knex.fn.now());
      table.timestamp('confirmed_at').nullable();
      table.timestamp('cancelled_at').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
      
      // Indexes
      table.index(['user_id']);
      table.index(['booking_reference']);
      table.index(['hotel_code']);
      table.index(['status']);
      table.index(['check_in', 'check_out']);
    })
    
    // Hotel searches table (for tracking user searches)
    .createTable('hotel_searches', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('SET NULL').nullable();
      table.string('destination').notNullable();
      table.date('check_in').notNullable();
      table.date('check_out').notNullable();
      table.integer('rooms').defaultTo(1);
      table.integer('adults').defaultTo(2);
      table.integer('children').defaultTo(0);
      table.json('children_ages').nullable();
      table.json('search_results').nullable(); // store search results for analytics
      table.integer('total_results').defaultTo(0);
      table.timestamp('search_date').defaultTo(knex.fn.now());
      table.string('ip_address').nullable();
      table.string('user_agent').nullable();
      
      // Indexes
      table.index(['user_id']);
      table.index(['destination']);
      table.index(['search_date']);
    })
    
    // Hotel favorites table
    .createTable('hotel_favorites', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('hotel_code').notNullable();
      table.string('hotel_name').notNullable();
      table.json('hotel_details').nullable(); // cache hotel details
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('deleted_at').nullable();
      
      // Unique constraint to prevent duplicates
      table.unique(['user_id', 'hotel_code']);
      
      // Indexes
      table.index(['user_id']);
      table.index(['hotel_code']);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('hotel_favorites')
    .dropTableIfExists('hotel_searches')
    .dropTableIfExists('hotel_bookings');
};
