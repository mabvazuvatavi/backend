/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  try {
    // Create venue_seating_sections table
    const hasVenueSections = await knex.schema.hasTable('venue_seating_sections');
    if (!hasVenueSections) {
      await knex.schema.createTable('venue_seating_sections', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('venue_id').notNullable().references('id').inTable('venues').onDelete('CASCADE');
        table.string('section_name', 100).notNullable();
        table.integer('total_seats').notNullable();
        table.decimal('base_price', 10, 2).notNullable();
        table.text('description');
        table.string('color_code', 10);
        table.integer('row_count').defaultTo(0);
        table.integer('seats_per_row').defaultTo(0);
        table.jsonb('seat_map').defaultTo('{}');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
        table.index('venue_id');
        table.unique(['venue_id', 'section_name']);
      });
    }

    // Create event_pricing_tiers table
    const hasPricingTiers = await knex.schema.hasTable('event_pricing_tiers');
    if (!hasPricingTiers) {
      await knex.schema.createTable('event_pricing_tiers', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
        table.string('tier_name', 100).notNullable();
        table.text('description');
        table.uuid('venue_section_id').nullable().references('id').inTable('venue_seating_sections');
        table.decimal('base_price', 10, 2).notNullable();
        table.integer('total_tickets').notNullable();
        table.integer('available_tickets').notNullable();
        table.timestamp('sale_start_date').notNullable();
        table.timestamp('sale_end_date').notNullable();
        table.decimal('min_price', 10, 2).defaultTo(0);
        table.decimal('max_price', 10, 2).defaultTo(0);
        table.jsonb('tier_metadata').defaultTo('{}');
        table.boolean('is_active').defaultTo(true);
        table.timestamps(true, true);
        table.index(['event_id', 'is_active']);
        table.index(['event_id', 'venue_section_id']);
      });
    }

    // Create event_approvals table
    const hasApprovals = await knex.schema.hasTable('event_approvals');
    if (!hasApprovals) {
      await knex.schema.createTable('event_approvals', function(table) {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('event_id').notNullable().references('id').inTable('events').onDelete('CASCADE');
        table.uuid('requested_by').notNullable().references('id').inTable('users');
        table.uuid('reviewed_by').nullable().references('id').inTable('users');
        table.enum('status', ['pending', 'approved', 'rejected']).defaultTo('pending');
        table.text('reviewer_comments');
        table.jsonb('event_snapshot').defaultTo('{}');
        table.timestamp('requested_at').defaultTo(knex.fn.now());
        table.timestamp('reviewed_at').nullable();
        table.timestamps(true, true);
        table.index(['event_id']);
        table.index(['status']);
        table.index(['reviewed_by']);
      });
    }

    // Add columns to events table if missing
    const hasEventMode = await knex.schema.hasColumn('events', 'event_mode');
    if (!hasEventMode) {
      await knex.schema.table('events', function(table) {
        table.enum('event_mode', ['physical', 'virtual', 'hybrid']).defaultTo('physical');
        table.enum('event_status', ['draft', 'pending_approval', 'approved', 'rejected', 'published', 'cancelled']).defaultTo('draft');
        table.uuid('approved_by').nullable();
        table.timestamp('approved_at').nullable();
        table.text('rejection_reason').nullable();
        table.jsonb('virtual_config').defaultTo('{}');
      });
    }

    return true;
  } catch (error) {
    console.log('Migration note:', error.message);
    return true;
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  try {
    await knex.schema.dropTableIfExists('event_approvals');
    await knex.schema.dropTableIfExists('event_pricing_tiers');
    await knex.schema.dropTableIfExists('venue_seating_sections');

    const hasEventMode = await knex.schema.hasColumn('events', 'event_mode');
    if (hasEventMode) {
      await knex.schema.table('events', function(table) {
        table.dropColumn('event_mode');
        table.dropColumn('event_status');
        table.dropColumn('approved_by');
        table.dropColumn('approved_at');
        table.dropColumn('rejection_reason');
        table.dropColumn('virtual_config');
      });
    }
    return true;
  } catch (error) {
    console.log('Rollback note:', error.message);
    return true;
  }
};
