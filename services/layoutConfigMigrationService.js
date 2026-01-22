const db = require('../config/database');
const venueSeatTypeService = require('./venueSeatTypeService');

/**
 * Migration service to convert existing layout_config data to new venue seat types structure
 */
class LayoutConfigMigrationService {
  /**
   * Migrate all venues with layout_config to the new seat types structure
   * @param {string} userId - User ID for audit logging
   * @returns {Promise<Object>} Migration results
   */
  async migrateAllVenues(userId = 'system') {
    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Get all venues with layout_config
      const venues = await db('venues')
        .whereNotNull('layout_config')
        .where('deleted_at', null)
        .select('id', 'name', 'venue_type', 'layout_config');

      results.total = venues.length;

      console.log(`Found ${venues.length} venues with layout_config to migrate`);

      for (const venue of venues) {
        try {
          await this.migrateVenue(venue, userId);
          results.successful++;
          console.log(`✅ Successfully migrated venue: ${venue.name}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            venueId: venue.id,
            venueName: venue.name,
            error: error.message
          });
          console.error(`❌ Failed to migrate venue ${venue.name}:`, error.message);
        }
      }

      console.log(`Migration completed: ${results.successful}/${results.total} successful`);
      return results;
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Migrate a single venue's layout_config to seat types
   * @param {Object} venue - Venue object with layout_config
   * @param {string} userId - User ID for audit logging
   * @returns {Promise<Object>} Migrated seat types
   */
  async migrateVenue(venue, userId = 'system') {
    if (!venue.layout_config) {
      throw new Error('No layout_config found for venue');
    }

    let layoutConfig;
    try {
      layoutConfig = typeof venue.layout_config === 'string' 
        ? JSON.parse(venue.layout_config) 
        : venue.layout_config;
    } catch (error) {
      throw new Error('Invalid layout_config JSON format');
    }

    if (!layoutConfig.ticket_types || !Array.isArray(layoutConfig.ticket_types)) {
      throw new Error('No ticket_types found in layout_config');
    }

    // Convert layout_config to seat types format
    const seatTypes = layoutConfig.ticket_types.map((ticketType, index) => {
      const seatType = {
        name: this.capitalizeFirst(ticketType),
        type: ticketType,
        description: `${this.capitalizeFirst(ticketType)} seating`,
        default_price: layoutConfig.default_prices?.[ticketType] || 50,
        color: this.getDefaultColor(ticketType, index),
        is_active: true,
        sections: []
      };

      // Add sections for this ticket type
      if (layoutConfig.sections && Array.isArray(layoutConfig.sections)) {
        const typeSections = layoutConfig.sections.filter(section => section.type === ticketType);
        
        seatType.sections = typeSections.map((section, sectionIndex) => ({
          name: section.name,
          rows: section.rows || 10,
          seats_per_row: section.seats_per_row || 20,
          price_override: null,
          notes: `Migrated from layout_config`,
          sort_order: sectionIndex,
          is_active: true
        }));
      }

      // If no sections found, create a default section
      if (seatType.sections.length === 0) {
        const defaultQuantity = layoutConfig.default_quantities?.[ticketType] || 100;
        const rows = Math.ceil(Math.sqrt(defaultQuantity / 10)); // Rough estimate
        const seatsPerRow = Math.ceil(defaultQuantity / rows);

        seatType.sections = [{
          name: `Default ${this.capitalizeFirst(ticketType)} Section`,
          rows: rows,
          seats_per_row: seatsPerRow,
          price_override: null,
          notes: `Default section created during migration (estimated capacity: ${defaultQuantity})`,
          sort_order: 0,
          is_active: true
        }];
      }

      return seatType;
    });

    // Save the converted seat types
    const savedSeatTypes = await venueSeatTypeService.saveVenueSeatTypes(
      venue.id,
      seatTypes,
      userId
    );

    // Optionally clear the layout_config after successful migration
    await db('venues')
      .where('id', venue.id)
      .update({ 
        layout_config: null,
        updated_at: new Date()
      });

    return savedSeatTypes;
  }

  /**
   * Check if a venue needs migration
   * @param {string} venueId - Venue ID
   * @returns {Promise<boolean>} True if migration is needed
   */
  async needsMigration(venueId) {
    const venue = await db('venues')
      .where('id', venueId)
      .where('deleted_at', null)
      .select('layout_config')
      .first();

    return venue && venue.layout_config !== null;
  }

  /**
   * Get migration status for all venues
   * @returns {Promise<Object>} Migration status
   */
  async getMigrationStatus() {
    const totalVenues = await db('venues')
      .where('deleted_at', null)
      .count('* as count')
      .first();

    const venuesWithLayoutConfig = await db('venues')
      .whereNotNull('layout_config')
      .where('deleted_at', null)
      .count('* as count')
      .first();

    const venuesWithSeatTypes = await db('venue_seat_types')
      .countDistinct('venue_id as count')
      .first();

    return {
      total_venues: parseInt(totalVenues.count) || 0,
      venues_with_layout_config: parseInt(venuesWithLayoutConfig.count) || 0,
      venues_with_seat_types: parseInt(venuesWithSeatTypes.count) || 0,
      venues_need_migration: parseInt(venuesWithLayoutConfig.count) || 0
    };
  }

  /**
   * Helper method to capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get default color for ticket type
   * @param {string} ticketType - Ticket type
   * @param {number} index - Index for fallback colors
   * @returns {string} Hex color code
   */
  getDefaultColor(ticketType, index) {
    const colorMap = {
      standard: '#2196F3',
      vip: '#FFD700',
      premium: '#9C27B0',
      box: '#FF1493',
      balcony: '#795548',
      gallery: '#607D8B',
      floor: '#4CAF50',
      general: '#FF9800',
      reserved: '#00BCD4'
    };

    return colorMap[ticketType] || ['#2196F3', '#FF1493', '#FFD700', '#4CAF50', '#FF9800'][index % 5];
  }
}

module.exports = new LayoutConfigMigrationService();
