/**
 * Adds missing commerce primitives used by the app:
 * - discount_codes
 * - checkouts
 * - orders
 * - seat_reservations
 * And adds required columns to existing tables:
 * - shopping_carts: discount_code, discount_percentage, discount_amount
 * - tickets: order_id
 * - seats: reservation_id, sold_by, sold_at, payment_id
 */

exports.up = async function (knex) {
  // -----------------------------
  // discount_codes
  // -----------------------------
  const hasDiscountCodes = await knex.schema.hasTable('discount_codes');
  if (!hasDiscountCodes) {
    await knex.schema.createTable('discount_codes', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('code', 64).notNullable().unique();
      table.decimal('discount_percentage', 5, 2).notNullable();
      table.boolean('is_active').defaultTo(true);
      table.timestamp('starts_at').nullable();
      table.timestamp('expires_at').nullable();
      table.integer('max_uses_total').nullable();
      table.integer('max_uses_per_user').nullable();
      table.integer('uses_count').defaultTo(0);
      table.jsonb('metadata').nullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['code']);
      table.index(['is_active', 'expires_at']);
    });
  }

  // -----------------------------
  // shopping_carts: promo fields
  // -----------------------------
  const hasShoppingCarts = await knex.schema.hasTable('shopping_carts');
  if (hasShoppingCarts) {
    const hasDiscountCode = await knex.schema.hasColumn('shopping_carts', 'discount_code');
    if (!hasDiscountCode) {
      await knex.schema.alterTable('shopping_carts', (table) => {
        table.string('discount_code', 64).nullable();
        table.decimal('discount_percentage', 5, 2).defaultTo(0);
        table.decimal('discount_amount', 12, 2).defaultTo(0);
      });
    }
  }

  // -----------------------------
  // checkouts
  // -----------------------------
  const hasCheckouts = await knex.schema.hasTable('checkouts');
  if (!hasCheckouts) {
    await knex.schema.createTable('checkouts', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('user_id').nullable().index();
      table.foreign('user_id').references('users.id').onDelete('SET NULL');

      table.uuid('cart_id').nullable().index();
      table.foreign('cart_id').references('shopping_carts.id').onDelete('SET NULL');

      table.boolean('is_guest').defaultTo(false).index();
      table.string('guest_email', 255).nullable();
      table.string('guest_first_name', 100).nullable();
      table.string('guest_last_name', 100).nullable();
      table.string('guest_phone', 50).nullable();
      table.string('confirmation_code', 32).nullable().index();

      table.string('payment_method').defaultTo('stripe');
      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
      table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);
      table.jsonb('billing_info').notNullable();

      table.string('status').defaultTo('pending').index(); // pending, completed, cancelled, expired
      table.timestamp('expires_at').nullable().index();

      table.uuid('order_id').nullable().index();

      table.timestamp('completed_at').nullable();
      table.timestamp('cancelled_at').nullable();
      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['user_id', 'status']);
      table.index(['is_guest', 'status']);
    });
  }

  // -----------------------------
  // orders
  // -----------------------------
  const hasOrders = await knex.schema.hasTable('orders');
  if (!hasOrders) {
    await knex.schema.createTable('orders', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

      table.uuid('user_id').nullable().index();
      table.foreign('user_id').references('users.id').onDelete('SET NULL');

      table.uuid('checkout_id').nullable().index();
      table.foreign('checkout_id').references('checkouts.id').onDelete('SET NULL');

      table.uuid('payment_id').nullable().index();
      table.foreign('payment_id').references('payments.id').onDelete('SET NULL');

      table.boolean('is_guest').defaultTo(false).index();
      table.string('guest_email', 255).nullable().index();
      table.string('guest_first_name', 100).nullable();
      table.string('guest_last_name', 100).nullable();
      table.string('guest_phone', 50).nullable();
      table.string('confirmation_code', 32).nullable().index();

      table.decimal('subtotal', 12, 2).notNullable().defaultTo(0);
      table.decimal('discount_amount', 12, 2).notNullable().defaultTo(0);
      table.decimal('total_amount', 12, 2).notNullable().defaultTo(0);

      table.decimal('amount_paid', 12, 2).notNullable().defaultTo(0);
      table.decimal('balance_due', 12, 2).notNullable().defaultTo(0);

      table.string('status').defaultTo('confirmed').index();

      table.jsonb('billing_info').notNullable();
      table.jsonb('metadata').nullable();

      table.timestamps(true, true);
      table.timestamp('deleted_at').nullable();

      table.index(['user_id', 'status']);
    });
  }

  // -----------------------------
  // tickets: order_id
  // -----------------------------
  const hasTickets = await knex.schema.hasTable('tickets');
  if (hasTickets) {
    const hasOrderId = await knex.schema.hasColumn('tickets', 'order_id');
    if (!hasOrderId) {
      await knex.schema.alterTable('tickets', (table) => {
        table.uuid('order_id').nullable().index();
        table.foreign('order_id').references('orders.id').onDelete('SET NULL');
      });
    }
  }

  // -----------------------------
  // seat_reservations
  // -----------------------------
  const hasSeatReservations = await knex.schema.hasTable('seat_reservations');
  if (!hasSeatReservations) {
    await knex.schema.createTable('seat_reservations', (table) => {
      table.uuid('id').primary();
      table.uuid('event_id').notNullable().index();
      table.foreign('event_id').references('events.id').onDelete('CASCADE');

      table.uuid('user_id').nullable().index();
      table.foreign('user_id').references('users.id').onDelete('SET NULL');

      table.jsonb('seat_ids').notNullable();
      table.string('status').defaultTo('pending').index(); // pending, released, confirmed, expired
      table.timestamp('expires_at').notNullable().index();

      table.uuid('payment_id').nullable().index();
      table.foreign('payment_id').references('payments.id').onDelete('SET NULL');

      table.timestamp('released_at').nullable();
      table.timestamp('confirmed_at').nullable();
      table.timestamps(true, true);
    });
  }

  // -----------------------------
  // seats: reservation_id / sold_by / sold_at / payment_id
  // -----------------------------
  const hasSeats = await knex.schema.hasTable('seats');
  if (hasSeats) {
    const hasReservationId = await knex.schema.hasColumn('seats', 'reservation_id');
    if (!hasReservationId) {
      await knex.schema.alterTable('seats', (table) => {
        table.uuid('reservation_id').nullable().index();
        table.uuid('sold_by').nullable().index();
        table.timestamp('sold_at').nullable();
        table.uuid('payment_id').nullable().index();
      });
    }
  }
};

exports.down = async function (knex) {
  // Down migrations are conservative to avoid accidental data loss.
  // Only drop tables if they exist; do not drop columns to preserve integrity.

  const hasSeatReservations = await knex.schema.hasTable('seat_reservations');
  if (hasSeatReservations) {
    await knex.schema.dropTable('seat_reservations');
  }

  const hasOrders = await knex.schema.hasTable('orders');
  if (hasOrders) {
    await knex.schema.dropTable('orders');
  }

  const hasCheckouts = await knex.schema.hasTable('checkouts');
  if (hasCheckouts) {
    await knex.schema.dropTable('checkouts');
  }

  const hasDiscountCodes = await knex.schema.hasTable('discount_codes');
  if (hasDiscountCodes) {
    await knex.schema.dropTable('discount_codes');
  }
};
