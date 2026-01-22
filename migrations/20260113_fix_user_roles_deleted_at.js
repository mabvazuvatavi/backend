/**
 * Add deleted_at column to user_roles table if it doesn't exist
 */

exports.up = async function(knex) {
  // Check if deleted_at column exists
  const hasDeletedAt = await knex.schema.hasColumn('user_roles', 'deleted_at');
  
  if (!hasDeletedAt) {
    await knex.schema.table('user_roles', function(table) {
      table.timestamp('deleted_at').nullable().defaultTo(null);
    });
    
    // Add index for deleted_at
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_user_roles_deleted_at ON user_roles (deleted_at)');
  }
};

exports.down = async function(knex) {
  // We don't want to drop the column in rollback as it might cause data loss
  // Just remove the index
  await knex.raw('DROP INDEX IF EXISTS idx_user_roles_deleted_at');
};
