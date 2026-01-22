exports.up = function(knex) {
  return knex.schema
    .createTable('buses', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('bus_name', 255).notNullable();
      table.string('origin', 255).notNullable();
      table.string('destination', 255).notNullable();
      table.timestamp('departure_time').notNullable();
      table.timestamp('arrival_time');
      table.integer('total_seats').notNullable();
      table.integer('available_seats').notNullable();
      table.decimal('price_per_seat', 10, 2).notNullable();
      table.enum('bus_type', ['standard', 'deluxe', 'vip', 'sleeper']).defaultTo('standard');
      table.json('amenities'); // e.g., WiFi, AC, Charging ports, etc.
      table.string('operator_contact', 255);
      table.string('operator_phone', 20);
      table.boolean('is_api_sourced').defaultTo(false);
      table.string('api_bus_id', 255); // ID from external API
      table.string('api_provider', 100); // e.g., 'easybuses', 'safeboda', 'uber'
      table.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
      table.boolean('is_active').defaultTo(true);
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    })
    .createTable('bus_bookings', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('bus_id').notNullable().references('id').inTable('buses').onDelete('CASCADE');
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.integer('seats_count').notNullable();
      table.json('passenger_details').notNullable();
      table.decimal('total_price', 10, 2).notNullable();
      table.string('payment_id', 255);
      table.enum('status', ['pending', 'confirmed', 'cancelled', 'completed']).defaultTo('pending');
      table.timestamp('booking_date').defaultTo(knex.fn.now());
      table.timestamp('cancelled_at');
      table.text('cancellation_reason');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('bus_bookings')
    .dropTableIfExists('buses');
};
