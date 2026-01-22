/**
 * Adds deposit policy columns to events table (Option A)
 * - allow_deposit (boolean)
 * - deposit_type (enum: percentage, fixed)
 * - deposit_value (decimal)
 * - min_deposit_amount (decimal)
 * - deposit_due_by (timestamp)
 */

exports.up = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.boolean('allow_deposit').defaultTo(false);
    table.enum('deposit_type', ['percentage', 'fixed']).defaultTo('percentage');
    table.decimal('deposit_value', 5, 2).defaultTo(30); // e.g. 30% or $30.00
    table.decimal('min_deposit_amount', 12, 2).defaultTo(0);
    table.timestamp('deposit_due_by').nullable();
  });
};

exports.down = async function (knex) {
  await knex.schema.alterTable('events', (table) => {
    table.dropColumn('allow_deposit');
    table.dropColumn('deposit_type');
    table.dropColumn('deposit_value');
    table.dropColumn('min_deposit_amount');
    table.dropColumn('deposit_due_by');
  });
};
