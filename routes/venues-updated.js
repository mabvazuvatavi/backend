/**
 * Updated Venue Routes with Seating/Pricing Tier Support
 * Allows both admins AND venue managers to create/update venues
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');
const { validatePagination, validateUUID, validateVenueCreation } = require('../middleware/validation');

/**
 * Get all venues (public access)
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      venue_type,
      manager_id,
      sort_by = 'name',
      sort_order = 'asc'
    } = req.query;

    const offset = (page - 1) * limit;

    let query = db('venues')
      .leftJoin('users as managers', 'venues.manager_id', 'managers.id')
      .whereNull('venues.deleted_at')
      .select([
        'venues.*',
        'managers.first_name as manager_first_name',
        'managers.last_name as manager_last_name'
      ]);

    if (search) {
      query = query.where(function() {
        this.where('venues.name', 'ilike', `%${search}%`)
          .orWhere('venues.description', 'ilike', `%${search}%`)
          .orWhere('venues.city', 'ilike', `%${city}%`);
      });
    }

    if (city) {
      query = query.where('venues.city', 'ilike', `%${city}%`);
    }

    if (venue_type) {
      query = query.where('venues.venue_type', venue_type);
    }

    if (manager_id) {
      query = query.where('venues.manager_id', manager_id);
    }

    const totalCount = await query.clone().count('* as count').first();
    const venues = await query
      .orderBy(`venues.${sort_by}`, sort_order)
      .limit(limit)
      .offset(offset);

    // Fetch seating tiers for each venue
    for (let venue of venues) {
      venue.seating_tiers = await db('venue_seating_tiers')
        .where({ venue_id: venue.id, is_active: true })
        .orderBy('tier_order', 'asc');
    }

    res.json({
      success: true,
      data: venues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Get venues error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venues'
    });
  }
});

/**
 * Get single venue with seating and pricing tiers
 */
router.get('/:id', validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await db('venues')
      .where({ id })
      .whereNull('deleted_at')
      .leftJoin('users as managers', 'venues.manager_id', 'managers.id')
      .select([
        'venues.*',
        'managers.first_name as manager_first_name',
        'managers.last_name as manager_last_name',
        'managers.email as manager_email'
      ])
      .first();

    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Fetch seating and pricing tiers
    venue.seating_tiers = await db('venue_seating_tiers')
      .where({ venue_id: id, is_active: true })
      .orderBy('tier_order', 'asc');

    venue.pricing_tiers = await db('venue_pricing_tiers')
      .where({ venue_id: id, is_active: true })
      .join(
        'venue_seating_tiers',
        'venue_pricing_tiers.seating_tier_id',
        'venue_seating_tiers.id'
      )
      .select([
        'venue_pricing_tiers.*',
        'venue_seating_tiers.tier_name',
        'venue_seating_tiers.capacity'
      ])
      .orderBy('venue_seating_tiers.tier_order', 'asc');

    res.json({
      success: true,
      data: venue
    });
  } catch (error) {
    console.error('Get venue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch venue'
    });
  }
});

/**
 * ADMIN + VENUE_MANAGER: Create venue
 * Includes seating tier configuration on creation
 */
router.post('/', verifyToken, requireRole('admin', 'venue_manager'), validateVenueCreation, async (req, res) => {
  try {
    const {
      name,
      description,
      address,
      city,
      state,
      country,
      postal_code,
      latitude,
      longitude,
      venue_type,
      facilities,
      layout,
      has_seating,
      contact_phone,
      contact_email,
      operating_hours,
      seating_tiers, // Array of tier configurations
      pricing_tiers  // Array of pricing configurations
    } = req.body;

    // Validate required fields
    if (!name || !address || !city || !venue_type) {
      return res.status(400).json({
        success: false,
        message: 'name, address, city, and venue_type are required'
      });
    }

    // Use transaction for consistency
    const trx = await db.transaction();

    try {
      // Create venue
      const [venue] = await trx('venues')
        .insert({
          name,
          description,
          address,
          city,
          state,
          country: country || 'Kenya',
          postal_code,
          latitude,
          longitude,
          venue_type,
          facilities: facilities || [],
          layout: layout || null,
          has_seating: has_seating !== false, // Default true
          is_active: true,
          manager_id: req.user.role === 'venue_manager' ? req.user.id : null,
          contact_phone,
          contact_email,
          operating_hours
        })
        .returning('*');

      let totalCapacity = 0;

      // Create seating tiers if provided
      if (seating_tiers && Array.isArray(seating_tiers) && seating_tiers.length > 0) {
        for (const tier of seating_tiers) {
          if (!tier.tier_name || !tier.capacity || tier.capacity <= 0) {
            await trx.rollback();
            return res.status(400).json({
              success: false,
              message: 'Each seating tier must have tier_name and capacity > 0'
            });
          }

          const [createdTier] = await trx('venue_seating_tiers')
            .insert({
              venue_id: venue.id,
              tier_name: tier.tier_name,
              tier_description: tier.tier_description || '',
              capacity: tier.capacity,
              tier_order: tier.tier_order || 0,
              seat_layout: tier.seat_layout || null
            })
            .returning('*');

          totalCapacity += tier.capacity;

          // Create pricing tier if provided
          if (pricing_tiers && Array.isArray(pricing_tiers)) {
            const tierPricing = pricing_tiers.find(p => p.tier_name === tier.tier_name);
            if (tierPricing) {
              await trx('venue_pricing_tiers')
                .insert({
                  venue_id: venue.id,
                  seating_tier_id: createdTier.id,
                  base_price: tierPricing.base_price || 0,
                  vat_percentage: tierPricing.vat_percentage || 0,
                  booking_fee: tierPricing.booking_fee || 0,
                  service_fee: tierPricing.service_fee || 0,
                  currency: tierPricing.currency || 'KES'
                });
            }
          }
        }

        // Update venue with total capacity
        await trx('venues')
          .where({ id: venue.id })
          .update({
            total_capacity: totalCapacity,
            uses_seating_tiers: true,
            capacity_type: 'tiered'
          });
      }

      // Audit log
      await trx('audit_logs').insert({
        user_id: req.user.id,
        action: 'VENUE_CREATED',
        resource: 'venues',
        resource_id: venue.id,
        new_values: JSON.stringify({
          ...venue,
          total_capacity: totalCapacity,
          seating_tiers_count: seating_tiers?.length || 0
        }),
        timestamp: new Date()
      });

      await trx.commit();

      // Fetch complete venue data
      const completeVenue = await db('venues')
        .where({ id: venue.id })
        .first();

      completeVenue.seating_tiers = await db('venue_seating_tiers')
        .where({ venue_id: venue.id, is_active: true })
        .orderBy('tier_order', 'asc');

      completeVenue.pricing_tiers = await db('venue_pricing_tiers')
        .where({ venue_id: venue.id, is_active: true })
        .join('venue_seating_tiers', 'venue_pricing_tiers.seating_tier_id', 'venue_seating_tiers.id')
        .select([
          'venue_pricing_tiers.*',
          'venue_seating_tiers.tier_name',
          'venue_seating_tiers.capacity'
        ]);

      res.status(201).json({
        success: true,
        message: 'Venue created successfully with seating and pricing tiers',
        data: completeVenue
      });
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Create venue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create venue'
    });
  }
});

/**
 * ADMIN + VENUE_MANAGER: Update venue
 */
router.put('/:id', verifyToken, validateUUID, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check permissions
    if (req.user.role !== 'admin') {
      const venue = await db('venues').where({ id }).first();
      if (!venue || venue.manager_id !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'You can only update venues you manage'
        });
      }
    }

    // Remove restricted fields
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.deleted_at;
    delete updateData.total_capacity; // Calculated from tiers
    delete updateData.seating_tiers;
    delete updateData.pricing_tiers;

    updateData.updated_at = new Date();

    const [updatedVenue] = await db('venues')
      .where({ id })
      .update(updateData)
      .returning('*');

    if (!updatedVenue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    // Fetch seating and pricing tiers
    updatedVenue.seating_tiers = await db('venue_seating_tiers')
      .where({ venue_id: id, is_active: true })
      .orderBy('tier_order', 'asc');

    updatedVenue.pricing_tiers = await db('venue_pricing_tiers')
      .where({ venue_id: id, is_active: true })
      .join('venue_seating_tiers', 'venue_pricing_tiers.seating_tier_id', 'venue_seating_tiers.id')
      .select([
        'venue_pricing_tiers.*',
        'venue_seating_tiers.tier_name'
      ]);

    // Audit log
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'VENUE_UPDATED',
      resource: 'venues',
      resource_id: id,
      new_values: JSON.stringify(updateData),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Venue updated successfully',
      data: updatedVenue
    });
  } catch (error) {
    console.error('Update venue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update venue'
    });
  }
});

/**
 * ADMIN: Delete venue (soft delete)
 */
router.delete('/:id', verifyToken, requireRole('admin'), validateUUID, async (req, res) => {
  try {
    const { id } = req.params;

    const venue = await db('venues').where({ id }).first();
    if (!venue) {
      return res.status(404).json({
        success: false,
        message: 'Venue not found'
      });
    }

    await db('venues')
      .where({ id })
      .update({
        deleted_at: new Date(),
        updated_at: new Date()
      });

    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'VENUE_DELETED',
      resource: 'venues',
      resource_id: id,
      new_values: JSON.stringify({ deleted_at: new Date() }),
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: 'Venue deleted successfully'
    });
  } catch (error) {
    console.error('Delete venue error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete venue'
    });
  }
});

module.exports = router;
