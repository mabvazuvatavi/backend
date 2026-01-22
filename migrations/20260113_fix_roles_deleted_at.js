/**
 * Add deleted_at column to roles table if it doesn't exist
 */

exports.up = async function(knex) {
  // Check if deleted_at column exists in roles table
  const hasDeletedAt = await knex.schema.hasColumn('roles', 'deleted_at');
  
  if (!hasDeletedAt) {
    await knex.schema.table('roles', function(table) {
      table.timestamp('deleted_at').nullable().defaultTo(null);
    });
    
    // Add index for deleted_at
    await knex.raw('CREATE INDEX IF NOT EXISTS idx_roles_deleted_at ON roles (deleted_at)');
  }
};

exports.down = async function(knex) {
  // We don't want to drop the column in rollback as it might cause data loss
  // Just remove the index
  await knex.raw('DROP INDEX IF EXISTS idx_roles_deleted_at');
};
