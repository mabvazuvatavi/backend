/**
 * Add audit columns to shopping_cart_items for soft-delete compliance
 * Items are marked as 'checked_out' instead of deleted for audit trail
 */
exports.up = async function(knex) {
  // Add status column to shopping_cart_items if not exists
  const hasStatus = await knex.schema.hasColumn('shopping_cart_items', 'status');
  if (!hasStatus) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.string('status', 50).defaultTo('active');
    });
  }

  // Add checked_out_at timestamp
  const hasCheckedOutAt = await knex.schema.hasColumn('shopping_cart_items', 'checked_out_at');
  if (!hasCheckedOutAt) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.timestamp('checked_out_at').nullable();
    });
  }

  // Add order_id reference for audit trail
  const hasOrderId = await knex.schema.hasColumn('shopping_cart_items', 'order_id');
  if (!hasOrderId) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.uuid('order_id').nullable();
    });
  }

  // Add completed_at and order_id to shopping_carts if not exists
  const hasCompletedAt = await knex.schema.hasColumn('shopping_carts', 'completed_at');
  if (!hasCompletedAt) {
    await knex.schema.alterTable('shopping_carts', (table) => {
      table.timestamp('completed_at').nullable();
    });
  }

  const hasCartOrderId = await knex.schema.hasColumn('shopping_carts', 'order_id');
  if (!hasCartOrderId) {
    await knex.schema.alterTable('shopping_carts', (table) => {
      table.uuid('order_id').nullable();
    });
  }

  // Add index for faster queries on status
  try {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.index('status', 'idx_cart_items_status');
    });
  } catch (e) {
    // Index may already exist
  }
};

exports.down = async function(knex) {
  // Remove index
  try {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.dropIndex('status', 'idx_cart_items_status');
    });
  } catch (e) {
    // Index may not exist
  }

  // Remove columns from shopping_cart_items
  const hasStatus = await knex.schema.hasColumn('shopping_cart_items', 'status');
  if (hasStatus) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.dropColumn('status');
    });
  }

  const hasCheckedOutAt = await knex.schema.hasColumn('shopping_cart_items', 'checked_out_at');
  if (hasCheckedOutAt) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.dropColumn('checked_out_at');
    });
  }

  const hasOrderId = await knex.schema.hasColumn('shopping_cart_items', 'order_id');
  if (hasOrderId) {
    await knex.schema.alterTable('shopping_cart_items', (table) => {
      table.dropColumn('order_id');
    });
  }

  // Remove columns from shopping_carts
  const hasCompletedAt = await knex.schema.hasColumn('shopping_carts', 'completed_at');
  if (hasCompletedAt) {
    await knex.schema.alterTable('shopping_carts', (table) => {
      table.dropColumn('completed_at');
    });
  }

  const hasCartOrderId = await knex.schema.hasColumn('shopping_carts', 'order_id');
  if (hasCartOrderId) {
    await knex.schema.alterTable('shopping_carts', (table) => {
      table.dropColumn('order_id');
    });
  }
};
