/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.hasTable('venues').then(async function(exists) {
    if (!exists) return Promise.resolve();

    // Add columns only if they don't already exist
    if (!(await knex.schema.hasColumn('venues', 'website'))) {
      await knex.schema.table('venues', function(table) {
        table.string('website', 1000);
      });
    }

    if (!(await knex.schema.hasColumn('venues', 'image_url'))) {
      await knex.schema.table('venues', function(table) {
        table.string('image_url', 1000);
      });
    }

    if (!(await knex.schema.hasColumn('venues', 'has_parking'))) {
      await knex.schema.table('venues', function(table) {
        table.boolean('has_parking').defaultTo(false);
      });
    }

    if (!(await knex.schema.hasColumn('venues', 'has_wifi'))) {
      await knex.schema.table('venues', function(table) {
        table.boolean('has_wifi').defaultTo(false);
      });
    }

    if (!(await knex.schema.hasColumn('venues', 'has_catering'))) {
      await knex.schema.table('venues', function(table) {
        table.boolean('has_catering').defaultTo(false);
      });
    }

    if (!(await knex.schema.hasColumn('venues', 'has_accessibility'))) {
      await knex.schema.table('venues', function(table) {
        table.boolean('has_accessibility').defaultTo(false);
      });
    }

    return Promise.resolve();
  });
};

exports.down = function(knex) {
  return knex.schema.hasTable('venues').then(async function(exists) {
    if (!exists) return Promise.resolve();

    if (await knex.schema.hasColumn('venues', 'has_accessibility')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('has_accessibility');
      });
    }

    if (await knex.schema.hasColumn('venues', 'has_catering')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('has_catering');
      });
    }

    if (await knex.schema.hasColumn('venues', 'has_wifi')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('has_wifi');
      });
    }

    if (await knex.schema.hasColumn('venues', 'has_parking')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('has_parking');
      });
    }

    if (await knex.schema.hasColumn('venues', 'image_url')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('image_url');
      });
    }

    if (await knex.schema.hasColumn('venues', 'website')) {
      await knex.schema.table('venues', function(table) {
        table.dropColumn('website');
      });
    }

    return Promise.resolve();
  });
};
