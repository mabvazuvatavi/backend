const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middleware/auth');
const venueSeatTypeService = require('../services/venueSeatTypeService');
const auditService = require('../services/auditService');

/**
 * Middleware to verify venue manager access for seat type management
 */
const verifyVenueManagerAccess = async (req, res, next) => {
  try {
    if (req.user.role !== 'venue_manager' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Venue manager access required' });
    }

    // For non-admins, verify they manage the requested venue
    if (req.user.role === 'venue_manager' && req.params.venueId) {
      const venueId = req.params.venueId;
      const db = require('../config/database');
      const userVenue = await db('venues')
        .where('id', venueId)
        .where('manager_id', req.user.id)
        .where('deleted_at', null)
        .first();

      if (!userVenue) {
        return res.status(403).json({ error: 'Unauthorized: You do not manage this venue' });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Validation schemas
 */
const seatTypeSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  name: Joi.string().min(1).max(64).required(),
  type: Joi.string().valid('standard', 'vip', 'premium', 'box', 'balcony', 'gallery', 'floor', 'general', 'reserved').required(),
  description: Joi.string().max(255).optional(),
  default_price: Joi.number().positive().required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).required(),
  is_active: Joi.boolean().default(true),
  sections: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().optional(),
      name: Joi.string().min(1).max(128).required(),
      rows: Joi.number().integer().min(1).required(),
      seats_per_row: Joi.number().integer().min(1).required(),
      price_override: Joi.number().positive().optional(),
      notes: Joi.string().max(500).optional(),
      sort_order: Joi.number().integer().default(0),
      is_active: Joi.boolean().default(true)
    })
  ).default([])
});

const saveSeatTypesSchema = Joi.object({
  seat_types: Joi.array().items(seatTypeSchema).min(1).required()
});

/**
 * GET /api/venues/:venueId/seat-types
 * Get all seat types for a venue
 * @param {string} venueId - Venue ID
 */
router.get('/venues/:venueId/seat-types', verifyToken, verifyVenueManagerAccess, async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID is required' });
    }

    const seatTypes = await venueSeatTypeService.getVenueSeatTypes(venueId);

    await auditService.logAction({
      userId: req.user.id,
      action: 'VIEW_VENUE_SEAT_TYPES',
      resourceType: 'venue',
      resourceId: venueId,
      changes: {}
    });

    res.json({ data: seatTypes });
  } catch (error) {
    console.error('Error fetching venue seat types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/venues/:venueId/seat-types
 * Save seat types for a venue
 * @param {string} venueId - Venue ID
 * @body {Object} - Contains seat_types array
 */
router.put('/venues/:venueId/seat-types', verifyToken, verifyVenueManagerAccess, async (req, res) => {
  try {
    const { venueId } = req.params;
    const { error, value } = saveSeatTypesSchema.validate(req.body);

    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.details.map(d => d.message) 
      });
    }

    const savedSeatTypes = await venueSeatTypeService.saveVenueSeatTypes(
      venueId, 
      value.seat_types, 
      req.user.id
    );

    await auditService.logAction({
      userId: req.user.id,
      action: 'UPDATE_VENUE_SEAT_TYPES',
      resourceType: 'venue',
      resourceId: venueId,
      changes: { seatTypesCount: savedSeatTypes.length }
    });

    res.json({ 
      message: 'Seat types saved successfully',
      data: savedSeatTypes 
    });
  } catch (error) {
    console.error('Error saving venue seat types:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/venues/:venueId/seat-types/stats
 * Get seat type statistics for a venue
 * @param {string} venueId - Venue ID
 */
router.get('/venues/:venueId/seat-types/stats', verifyToken, verifyVenueManagerAccess, async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID is required' });
    }

    const stats = await venueSeatTypeService.getVenueSeatTypeStats(venueId);

    await auditService.logAction({
      userId: req.user.id,
      action: 'VIEW_VENUE_SEAT_TYPE_STATS',
      resourceType: 'venue',
      resourceId: venueId,
      changes: {}
    });

    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching venue seat type stats:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/venues/:venueId/seat-types/:seatTypeId
 * Delete a venue seat type
 * @param {string} venueId - Venue ID
 * @param {string} seatTypeId - Seat type ID
 */
router.delete('/venues/:venueId/seat-types/:seatTypeId', verifyToken, verifyVenueManagerAccess, async (req, res) => {
  try {
    const { venueId, seatTypeId } = req.params;

    if (!venueId || !seatTypeId) {
      return res.status(400).json({ error: 'Venue ID and Seat Type ID are required' });
    }

    const success = await venueSeatTypeService.deleteVenueSeatType(venueId, seatTypeId, req.user.id);

    if (success) {
      await auditService.logAction({
        userId: req.user.id,
        action: 'DELETE_VENUE_SEAT_TYPE',
        resourceType: 'venue_seat_type',
        resourceId: seatTypeId,
        changes: { venueId }
      });

      res.json({ message: 'Seat type deleted successfully' });
    } else {
      res.status(400).json({ error: 'Failed to delete seat type' });
    }
  } catch (error) {
    console.error('Error deleting venue seat type:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/venues/:venueId/seat-types/for-event
 * Get seat types formatted for event creation (inheritance)
 * @param {string} venueId - Venue ID
 */
router.get('/venues/:venueId/seat-types/for-event', verifyToken, async (req, res) => {
  try {
    const { venueId } = req.params;

    if (!venueId) {
      return res.status(400).json({ error: 'Venue ID is required' });
    }

    const seatTypes = await venueSeatTypeService.getVenueSeatTypes(venueId);
    
    // Format for event creation - convert to pricing tiers format
    const pricingTiers = seatTypes.map(seatType => ({
      name: seatType.name,
      description: seatType.description || `${seatType.type} seating`,
      price: seatType.default_price,
      section: seatType.type,
      color: seatType.color,
      // Include venue section info for reference
      venue_sections: seatType.sections.map(section => ({
        name: section.name,
        rows: section.rows,
        seats_per_row: section.seats_per_row,
        capacity: section.rows * section.seats_per_row,
        price_override: section.price_override
      }))
    }));

    res.json({ data: pricingTiers });
  } catch (error) {
    console.error('Error fetching venue seat types for event:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
