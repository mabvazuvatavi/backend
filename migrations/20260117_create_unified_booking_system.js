/**
 * Unified Booking System Migration
 * Creates tables for unified booking across Events, Buses, Flights, Hotels
 */
exports.up = function(knex) {
  return Promise.all([
    // Products Master Table - links all bookable items
    knex.schema.createTable('products', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.enum('product_type', ['event', 'bus', 'flight', 'hotel', 'other']).notNullable().index();
      table.uuid('product_ref_id').notNullable(); // FK to specific entity (event_id, bus_id, etc.)
      table.string('name', 255).notNullable();
      table.text('description');
      table.decimal('base_price', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('KES');
      table.integer('capacity');
      table.integer('available_quantity');
      table.json('metadata'); // Product-specific data
      table.boolean('is_active').defaultTo(true);
      table.timestamps();
      table.unique(['product_type', 'product_ref_id']);
    }),

    // Inventory Management
    knex.schema.createTable('inventory', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.enum('product_type', ['event', 'bus', 'flight', 'hotel', 'other']).notNullable();
      table.date('inventory_date'); // For time-based products (buses, flights, hotels)
      table.integer('total_capacity').notNullable();
      table.integer('available_qty').notNullable();
      table.integer('reserved_qty').defaultTo(0);
      table.integer('sold_qty').defaultTo(0);
      table.timestamp('last_updated').defaultTo(knex.fn.now());
      table.timestamps();
      table.unique(['product_id', 'inventory_date']);
      table.index(['product_id', 'inventory_date']);
    }),

    // Bookings - Main booking record
    knex.schema.createTable('bookings', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.enum('status', ['pending', 'reserved', 'confirmed', 'cancelled', 'completed']).defaultTo('pending').index();
      table.enum('payment_status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending');
      table.decimal('total_amount', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('KES');
      table.timestamp('booking_date').defaultTo(knex.fn.now());
      table.timestamp('reservation_expires_at'); // Auto-release if not paid
      table.json('metadata'); // Additional booking info
      table.timestamps();
      table.index(['user_id', 'status']);
      table.index(['booking_date']);
    }),

    // Booking Items - Line items in a booking
    knex.schema.createTable('booking_items', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.enum('product_type', ['event', 'bus', 'flight', 'hotel', 'other']).notNullable();
      table.integer('quantity').notNullable();
      table.decimal('unit_price', 12, 2).notNullable();
      table.decimal('subtotal', 12, 2).notNullable();
      table.json('extras'); // Product-specific data (seat numbers, dates, room type, etc.)
      table.enum('status', ['pending', 'reserved', 'confirmed', 'cancelled']).defaultTo('pending');
      table.timestamps();
      table.index(['booking_id', 'product_id']);
    }),

    // Pricing Tiers - Different price levels for products
    knex.schema.createTable('pricing_tiers', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.string('tier_name', 100).notNullable(); // VIP, Business, Economy, etc.
      table.decimal('price', 12, 2).notNullable();
      table.integer('available_quantity');
      table.text('description');
      table.boolean('is_active').defaultTo(true);
      table.integer('display_order');
      table.timestamps();
      table.unique(['product_id', 'tier_name']);
      table.index(['product_id']);
    }),

    // Dynamic Pricing - Rules for adjusting prices
    knex.schema.createTable('dynamic_pricing_rules', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('product_id').notNullable().references('id').inTable('products').onDelete('CASCADE');
      table.enum('rule_type', ['time-based', 'demand-based', 'seasonal', 'volume-based']).notNullable();
      table.string('rule_name', 100);
      table.decimal('price_multiplier', 5, 2); // 0.8 = 20% discount, 1.2 = 20% markup
      table.json('conditions'); // Rule conditions
      table.date('active_from');
      table.date('active_to');
      table.boolean('is_active').defaultTo(true);
      table.timestamps();
      table.index(['product_id', 'rule_type']);
    }),

    // Payments - Payment records
    knex.schema.createTable('bookings_payments', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('KES');
      table.enum('payment_method', ['mpesa', 'card', 'paypal', 'bank_transfer', 'other']).notNullable();
      table.enum('status', ['pending', 'completed', 'failed', 'refunded']).defaultTo('pending').index();
      table.string('transaction_ref', 255); // External reference from payment processor
      table.json('payment_data'); // Raw response from payment processor
      table.timestamp('completed_at');
      table.timestamps();
      table.index(['booking_id', 'status']);
      table.unique(['transaction_ref']);
    }),

    // Refunds - Refund records
    knex.schema.createTable('bookings_refunds', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('booking_id').notNullable().references('id').inTable('bookings').onDelete('CASCADE');
      table.uuid('payment_id').references('id').inTable('bookings_payments').onDelete('SET NULL');
      table.decimal('amount', 12, 2).notNullable();
      table.string('currency', 3).defaultTo('KES');
      table.enum('status', ['pending', 'approved', 'processing', 'completed', 'rejected']).defaultTo('pending').index();
      table.text('reason');
      table.string('refund_policy_applied', 255);
      table.string('refund_transaction_ref', 255);
      table.timestamp('processed_at');
      table.json('metadata');
      table.timestamps();
      table.index(['booking_id', 'status']);
    }),

    // Transfers - Ticket/booking transfers
    knex.schema.createTable('booking_transfers', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('booking_item_id').notNullable().references('id').inTable('booking_items').onDelete('CASCADE');
      table.uuid('from_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.uuid('to_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      table.decimal('transfer_price', 12, 2);
      table.enum('status', ['pending', 'approved', 'completed', 'rejected']).defaultTo('pending').index();
      table.text('reason');
      table.timestamps();
      table.index(['booking_item_id', 'status']);
      table.index(['from_user_id', 'to_user_id']);
    }),

    // Tickets/Confirmations - Generated tickets for completed bookings
    knex.schema.createTable('booking_tickets', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('booking_item_id').notNullable().references('id').inTable('booking_items').onDelete('CASCADE');
      table.string('ticket_number', 50).notNullable().unique();
      table.string('qr_code', 500); // QR code data or image URL
      table.enum('status', ['issued', 'used', 'cancelled']).defaultTo('issued').index();
      table.json('ticket_data'); // Seat number, row, section, etc.
      table.timestamp('used_at');
      table.timestamps();
      table.index(['booking_item_id', 'status']);
    })
  ]);
};

exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('booking_tickets'),
    knex.schema.dropTableIfExists('booking_transfers'),
    knex.schema.dropTableIfExists('bookings_refunds'),
    knex.schema.dropTableIfExists('bookings_payments'),
    knex.schema.dropTableIfExists('dynamic_pricing_rules'),
    knex.schema.dropTableIfExists('pricing_tiers'),
    knex.schema.dropTableIfExists('booking_items'),
    knex.schema.dropTableIfExists('bookings'),
    knex.schema.dropTableIfExists('inventory'),
    knex.schema.dropTableIfExists('products'),
  ]);
};
