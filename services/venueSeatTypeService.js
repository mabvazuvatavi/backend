const db = require('../config/database');
const auditService = require('./auditService');

class VenueSeatTypeService {
  /**
   * Get all seat types for a venue
   * @param {string} venueId - Venue ID
   * @returns {Promise<Array>} Array of seat types with sections
   */
  async getVenueSeatTypes(venueId) {
    try {
      const seatTypes = await db('venue_seat_types')
        .where('venue_id', venueId)
        .where('deleted_at', null)
        .orderBy('type', 'asc')
        .orderBy('name', 'asc');

      // Get sections for each seat type
      for (const seatType of seatTypes) {
        const sections = await db('venue_sections')
          .where('venue_id', venueId)
          .where('seat_type_id', seatType.id)
          .where('deleted_at', null)
          .orderBy('sort_order', 'asc')
          .orderBy('name', 'asc');
        
        seatType.sections = sections;
        seatType.total_capacity = sections.reduce((total, section) => {
          return total + (section.rows * section.seats_per_row);
        }, 0);
      }

      return seatTypes;
    } catch (error) {
      console.error('Error fetching venue seat types:', error);
      throw error;
    }
  }

  /**
   * Create or update seat types for a venue
   * @param {string} venueId - Venue ID
   * @param {Array} seatTypes - Array of seat type objects
   * @param {string} userId - User ID for audit
   * @returns {Promise<Array>} Created/updated seat types
   */
  async saveVenueSeatTypes(venueId, seatTypes, userId) {
    const trx = await db.transaction();
    
    try {
      // Get existing seat types
      const existingSeatTypes = await trx('venue_seat_types')
        .where('venue_id', venueId)
        .where('deleted_at', null)
        .select('id', 'name');

      const existingSeatTypeIds = new Set(existingSeatTypes.map(st => st.id));
      const incomingSeatTypeIds = new Set(seatTypes.filter(st => st.id).map(st => st.id));

      // Delete seat types that are no longer present
      const toDelete = [...existingSeatTypeIds].filter(id => !incomingSeatTypeIds.has(id));
      if (toDelete.length > 0) {
        await trx('venue_sections')
          .where('venue_id', venueId)
          .whereIn('seat_type_id', toDelete)
          .update({ deleted_at: new Date() });

        await trx('venue_seat_types')
          .where('venue_id', venueId)
          .whereIn('id', toDelete)
          .update({ deleted_at: new Date() });
      }

      // Upsert seat types and sections
      const savedSeatTypes = [];
      
      for (const seatTypeData of seatTypes) {
        let seatTypeId;
        
        if (seatTypeData.id && existingSeatTypeIds.has(seatTypeData.id)) {
          // Update existing seat type
          await trx('venue_seat_types')
            .where('id', seatTypeData.id)
            .update({
              name: seatTypeData.name,
              type: seatTypeData.type,
              description: seatTypeData.description,
              default_price: seatTypeData.default_price || 0,
              color: seatTypeData.color,
              is_active: seatTypeData.is_active !== false,
              updated_at: new Date()
            });
          
          seatTypeId = seatTypeData.id;
        } else {
          // Create new seat type
          [seatTypeId] = await trx('venue_seat_types')
            .insert({
              id: seatTypeData.id || undefined,
              venue_id: venueId,
              name: seatTypeData.name,
              type: seatTypeData.type,
              description: seatTypeData.description,
              default_price: seatTypeData.default_price || 0,
              color: seatTypeData.color,
              is_active: seatTypeData.is_active !== false
            })
            .returning('id');
          seatTypeId = seatTypeId.id;
        }

        // Handle sections
        if (seatTypeData.sections && seatTypeData.sections.length > 0) {
          const existingSections = await trx('venue_sections')
            .where('seat_type_id', seatTypeId)
            .where('deleted_at', null)
            .select('id', 'name');

          const existingSectionIds = new Set(existingSections.map(s => s.id));
          const incomingSectionIds = new Set(
            seatTypeData.sections.filter(s => s.id).map(s => s.id)
          );

          // Delete sections that are no longer present
          const sectionsToDelete = [...existingSectionIds].filter(id => !incomingSectionIds.has(id));
          if (sectionsToDelete.length > 0) {
            await trx('venue_sections')
              .where('seat_type_id', seatTypeId)
              .whereIn('id', sectionsToDelete)
              .update({ deleted_at: new Date() });
          }

          // Upsert sections
          for (const sectionData of seatTypeData.sections) {
            if (sectionData.id && existingSectionIds.has(sectionData.id)) {
              // Update existing section
              await trx('venue_sections')
                .where('id', sectionData.id)
                .update({
                  name: sectionData.name,
                  rows: sectionData.rows,
                  seats_per_row: sectionData.seats_per_row,
                  price_override: sectionData.price_override || null,
                  notes: sectionData.notes,
                  sort_order: sectionData.sort_order || 0,
                  is_active: sectionData.is_active !== false,
                  updated_at: new Date()
                });
            } else {
              // Create new section
              await trx('venue_sections')
                .insert({
                  id: sectionData.id || undefined,
                  venue_id: venueId,
                  seat_type_id: seatTypeId,
                  name: sectionData.name,
                  rows: sectionData.rows,
                  seats_per_row: sectionData.seats_per_row,
                  price_override: sectionData.price_override || null,
                  notes: sectionData.notes,
                  sort_order: sectionData.sort_order || 0,
                  is_active: sectionData.is_active !== false
                });
            }
          }
        }

        // Get the complete saved seat type with sections
        const savedSeatType = await trx('venue_seat_types')
          .where('id', seatTypeId)
          .first();

        const sections = await trx('venue_sections')
          .where('seat_type_id', seatTypeId)
          .where('deleted_at', null)
          .orderBy('sort_order', 'asc')
          .orderBy('name', 'asc');

        savedSeatType.sections = sections;
        savedSeatType.total_capacity = sections.reduce((total, section) => {
          return total + (section.rows * section.seats_per_row);
        }, 0);

        savedSeatTypes.push(savedSeatType);
      }

      await trx.commit();

      // Log audit action
      await auditService.log({
        userId,
        action: 'UPDATE_VENUE_SEAT_TYPES',
        resource: 'venue',
        resourceId: venueId,
        metadata: { seatTypesCount: savedSeatTypes.length }
      });

      return savedSeatTypes;
    } catch (error) {
      await trx.rollback();
      console.error('Error saving venue seat types:', error);
      throw error;
    }
  }

  /**
   * Get venue seat type statistics
   * @param {string} venueId - Venue ID
   * @returns {Promise<Object>} Statistics object
   */
  async getVenueSeatTypeStats(venueId) {
    try {
      const stats = await db('venue_seat_types')
        .where('venue_id', venueId)
        .where('deleted_at', null)
        .select(
          db.raw('COUNT(*) as total_seat_types'),
          db.raw('SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_seat_types')
        )
        .first();

      const capacityStats = await db('venue_sections')
        .where('venue_id', venueId)
        .where('deleted_at', null)
        .where('is_active', true)
        .select(
          db.raw('SUM(rows * seats_per_row) as total_capacity'),
          db.raw('COUNT(*) as total_sections')
        )
        .first();

      return {
        total_seat_types: parseInt(stats.total_seat_types) || 0,
        active_seat_types: parseInt(stats.active_seat_types) || 0,
        total_capacity: parseInt(capacityStats.total_capacity) || 0,
        total_sections: parseInt(capacityStats.total_sections) || 0
      };
    } catch (error) {
      console.error('Error fetching venue seat type stats:', error);
      throw error;
    }
  }

  /**
   * Delete a venue seat type (soft delete)
   * @param {string} venueId - Venue ID
   * @param {string} seatTypeId - Seat type ID
   * @param {string} userId - User ID for audit
   * @returns {Promise<boolean>} Success status
   */
  async deleteVenueSeatType(venueId, seatTypeId, userId) {
    const trx = await db.transaction();
    
    try {
      // Soft delete sections
      await trx('venue_sections')
        .where('venue_id', venueId)
        .where('seat_type_id', seatTypeId)
        .update({ deleted_at: new Date() });

      // Soft delete seat type
      await trx('venue_seat_types')
        .where('id', seatTypeId)
        .where('venue_id', venueId)
        .update({ deleted_at: new Date() });

      await trx.commit();

      // Log audit action
      await auditService.log({
        userId,
        action: 'DELETE_VENUE_SEAT_TYPE',
        resource: 'venue_seat_type',
        resourceId: seatTypeId,
        metadata: { venueId }
      });

      return true;
    } catch (error) {
      await trx.rollback();
      console.error('Error deleting venue seat type:', error);
      throw error;
    }
  }
}

module.exports = new VenueSeatTypeService();
