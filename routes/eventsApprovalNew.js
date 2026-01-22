/**
 * Event Approval Routes - COMPREHENSIVE
 * Handles event approval workflow: Draft → Pending → Approved/Rejected → Published
 * ROUTE ORDER IS CRITICAL: Specific paths must come BEFORE :id wildcards to prevent conflicts
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const knex = require('../config/database');

// Helper: Check if user is admin
const isAdmin = (req) => req.user?.role === 'admin';

// Helper: Check if user is organizer of event or admin
const canModifyEvent = async (req, eventId, userId) => {
  const event = await knex('events').where('id', eventId).first();
  if (!event) return false;
  return event.organizer_id === userId || isAdmin({ user: { role: 'admin' } });
};

/* =======================
   ROUTE ORDER (CRITICAL):
   1. Specific paths WITHOUT :id (e.g. /admin/event-approvals)
   2. Specific paths WITH :id in non-wildcard position (e.g. /:id/publish)
   3. Generic :id route (e.g. /:id)
======================= */

/* =======================
   ADMIN ROUTES - SPECIFIC PATHS FIRST
======================= */

// GET /api/events/admin/event-approvals - List all event approvals
router.get('/admin/event-approvals', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Only admins can view approvals' });
    }

    const approvals = await knex('event_approvals')
      .select('*')
      .orderBy('requested_at', 'desc')
      .leftJoin('users', 'event_approvals.requested_by', 'users.id')
      .select('event_approvals.*', knex.raw("users.first_name || ' ' || users.last_name as requested_by_name"));

    res.json({ success: true, data: approvals });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/events/admin/event-approvals/:id/review - Admin: Review event approval
router.patch('/admin/event-approvals/:id/review', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'Only admins can review approvals' });
    }

    const { status, comments } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const approval = await trx('event_approvals')
      .where('id', req.params.id)
      .first();

    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }

    const now = new Date();

    // Update approval
    await trx('event_approvals').where('id', req.params.id).update({
      status,
      reviewed_by: req.user.id,
      reviewer_comments: comments || null,
      reviewed_at: now,
    });

    // Update event status
    if (status === 'approved') {
      await trx('events')
        .where('id', approval.event_id)
        .update({
          status: 'approved',
          approved_by: req.user.id,
          approved_at: now,
        });
    } else if (status === 'rejected') {
      await trx('events')
        .where('id', approval.event_id)
        .update({
          status: 'rejected',
          rejection_reason: comments || null,
        });
    }

    await trx.commit();

    res.json({
      success: true,
      message: `Event ${status}`,
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error reviewing approval:', error);
    res.status(500).json({ error: error.message });
  }
});

/* =======================
   ORGANIZER ROUTES - SPECIFIC ACTION PATHS
======================= */

// POST /api/events/:id/submit-approval - Submit event for approval
router.post('/:id/submit-approval', verifyToken, async (req, res) => {
  try {
    const event = await knex('events').where('id', req.params.id).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only organizer can submit for approval
    if (event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Event must be in draft status
    if (event.status !== 'draft') {
      return res.status(400).json({
        error: `Cannot submit event with status: ${event.status}`,
      });
    }

    // Update event status
    await knex('events')
      .where('id', req.params.id)
      .update({ status: 'pending_approval' });

    // Create approval request
    const pricingTiers = await knex('event_pricing_tiers')
      .where('event_id', req.params.id)
      .select('*');

    await knex('event_approvals').insert({
      event_id: req.params.id,
      requested_by: req.user.id,
      status: 'pending',
      event_snapshot: {
        title: event.title,
        description: event.description,
        category: event.category,
        event_mode: event.event_mode,
        venue_id: event.venue_id,
        pricing_tiers: pricingTiers,
      },
    });

    res.json({
      success: true,
      message: 'Event submitted for approval',
    });
  } catch (error) {
    console.error('Error submitting event:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/events/:id/publish - Organizer: Publish approved event
router.post('/:id/publish', verifyToken, async (req, res) => {
  try {
    const event = await knex('events').where('id', req.params.id).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only organizer can publish
    if (event.organizer_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Event must be approved
    if (event.status !== 'approved') {
      return res.status(400).json({
        error: 'Event must be approved before publishing',
      });
    }

    await knex('events')
      .where('id', req.params.id)
      .update({ status: 'published', published_at: knex.fn.now() });

    res.json({
      success: true,
      message: 'Event published',
    });
  } catch (error) {
    console.error('Error publishing event:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/events/:id - Admin: Publish/unpublish event from admin dashboard
router.put('/:id', verifyToken, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Only admins can update event status' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Missing status' });
    }

    // Admin dashboard toggles draft <-> published
    if (!['draft', 'published'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const updateData = {
      status,
      updated_at: knex.fn.now(),
    };

    if (status === 'published') {
      updateData.published_at = knex.fn.now();
    } else if (status === 'draft') {
      updateData.published_at = null;
    }

    const updatedCount = await knex('events')
      .where('id', req.params.id)
      .update(updateData);

    if (!updatedCount) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({
      success: true,
      message: `Event status updated to ${status}`,
      data: { id: req.params.id, status },
    });
  } catch (error) {
    console.error('Error updating event status:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/* =======================
   GENERIC CRUD ROUTES - AFTER ALL SPECIFIC PATHS
======================= */

// POST /api/events - Create new event (Draft status)
router.post('/', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const {
      title,
      description,
      short_description,
      category,
      event_type,
      event_mode,
      venue_id,
      start_date,
      end_date,
      base_price,
      total_capacity,
      event_image_url,
      pricing_tiers,
    } = req.body;

    // Validate required fields
    if (!title || !description || !category || !event_mode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate pricing tiers
    if (!pricing_tiers || pricing_tiers.length === 0) {
      return res.status(400).json({ error: 'At least one pricing tier is required' });
    }

    // For in-person events, venue is required
    if ((event_mode === 'in_person' || event_mode === 'hybrid') && !venue_id) {
      return res.status(400).json({ error: 'Venue is required for in-person events' });
    }

    // Map category to event_type if not provided
    const categoryToEventType = {
      'music': 'concert',
      'sports_soccer': 'sports',
      'sports_cricket': 'sports',
      'sports_other': 'sports',
      'arts': 'theater',
      'business': 'conference',
      'entertainment': 'festival',
      'travel_bus': 'bus_trip',
      'travel_flight': 'flight',
      'other': 'other',
    };
    const resolvedEventType = event_type || categoryToEventType[category] || 'other';

    // Create event
    const eventData = {
      organizer_id: req.user.id,
      title,
      description,
      short_description: short_description || null,
      category,
      event_type: resolvedEventType,
      event_mode,
      venue_id: venue_id || null,
      start_date,
      end_date,
      base_price: base_price || 0,
      total_capacity: total_capacity || 0,
      status: 'draft',
      event_image_url: event_image_url || null,
    };

    const [eventResult] = await trx('events').insert(eventData).returning('id');
    const eventId = eventResult.id || eventResult;

    // Create pricing tiers
    const tierData = pricing_tiers.map((tier) => ({
      event_id: eventId,
      tier_name: tier.tier_name,
      description: tier.description || null,
      venue_section_id: tier.venue_section_id || null,
      base_price: tier.base_price,
      total_tickets: tier.total_tickets,
      available_tickets: tier.total_tickets,
      sale_start_date: tier.sale_start_date || start_date,
      sale_end_date: tier.sale_end_date || end_date,
      is_active: true,
    }));

    await trx('event_pricing_tiers').insert(tierData);

    // Sync event capacity/availability based on tiers
    const tierTotalTickets = pricing_tiers.reduce(
      (sum, t) => sum + Number(t?.total_tickets || 0),
      0
    );
    await trx('events')
      .where('id', eventId)
      .update({
        total_capacity: tierTotalTickets,
        available_tickets: tierTotalTickets,
        sold_tickets: 0,
        updated_at: knex.fn.now(),
      });

    await trx.commit();

    res.status(201).json({
      success: true,
      message: 'Event created',
      data: { id: eventId },
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error creating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/events - Get all events with filters (public access)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      event_type,
      event_mode,
      venue_id,
      organizer_id,
      status,
      sort_by = 'start_date',
      sort_order = 'desc'
    } = req.query;

    // Default to published for public listings, but show all for organizer's own events
    // If status is explicitly empty string, show all statuses
    const effectiveStatus = status === '' ? null : (status || (organizer_id ? null : 'published'));

    const offset = (page - 1) * limit;

    let query = knex('events')
      .leftJoin('venues', 'events.venue_id', 'venues.id')
      .leftJoin('users as organizers', 'events.organizer_id', 'organizers.id')
      .whereNull('events.deleted_at')
      .select([
        'events.*',
        'venues.name as venue_name',
        'venues.city as venue_city',
        'organizers.first_name as organizer_first_name',
        'organizers.last_name as organizer_last_name'
      ]);

    // Apply filters
    if (search) {
      query = query.where(function() {
        this.where('events.title', 'ilike', `%${search}%`)
          .orWhere('events.description', 'ilike', `%${search}%`)
          .orWhere('venues.name', 'ilike', `%${search}%`);
      });
    }

    if (category) {
      query = query.where('events.category', category);
    }

    if (event_type) {
      query = query.where('events.event_type', event_type);
    }

    if (event_mode) {
      query = query.where('events.event_mode', event_mode);
    }

    if (venue_id) {
      query = query.where('events.venue_id', venue_id);
    }

    if (organizer_id) {
      query = query.where('events.organizer_id', organizer_id);
    }

    if (effectiveStatus) {
      query = query.where('events.status', effectiveStatus);
    }

    // Apply sorting
    query = query.orderBy(`events.${sort_by}`, sort_order === 'asc' ? 'asc' : 'desc');

    // Get total count for pagination
    const totalQuery = query.clone().clearSelect().clearOrder().count('* as count').first();
    const [events, total] = await Promise.all([
      query.limit(limit).offset(offset),
      totalQuery
    ]);

    // Fetch pricing tiers for all events to get correct prices and ticket counts
    const eventIds = events.map(e => e.id);
    const allPricingTiers = eventIds.length > 0 
      ? await knex('event_pricing_tiers').whereIn('event_id', eventIds)
      : [];

    // Enrich events with pricing data from tiers
    const enrichedEvents = events.map(event => {
      const tiers = allPricingTiers.filter(t => t.event_id === event.id);
      
      // Calculate base_price as minimum tier price, available_tickets as sum of all tiers
      // Use base_price field from pricing tiers (not price)
      const minPrice = tiers.length > 0 
        ? Math.min(...tiers.map(t => Number(t.base_price || t.price || 0)))
        : Number(event.base_price || 0);
      const totalAvailable = tiers.length > 0
        ? tiers.reduce((sum, t) => sum + Number(t.available_tickets ?? t.total_tickets ?? 0), 0)
        : Number(event.available_tickets || 0);
      const totalCapacity = tiers.length > 0
        ? tiers.reduce((sum, t) => sum + Number(t.total_tickets ?? 0), 0)
        : Number(event.total_tickets || 0);

      return {
        ...event,
        base_price: minPrice,
        available_tickets: totalAvailable,
        total_tickets: totalCapacity,
        pricing_tiers: tiers,
      };
    });

    console.log(`[EVENTS API] Returned ${events.length} events for organizer_id=${organizer_id}, status=${effectiveStatus || 'all'}`);

    res.json({
      success: true,
      data: enrichedEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total?.count || 0,
        offset: offset
      }
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/events/:id - Get event details
router.get('/:id', async (req, res) => {
  try {
    const event = await knex('events')
      .where('id', req.params.id)
      .first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Get pricing tiers
    const pricingTiers = await knex('event_pricing_tiers')
      .where('event_id', event.id)
      .select('*');

    // Get venue seating sections if physical event
    let seatingOptions = [];
    if (event.venue_id) {
      seatingOptions = await knex('venue_seating_sections')
        .where('venue_id', event.venue_id)
        .select('*');
    }

    res.json({
      success: true,
      data: {
        ...event,
        pricing_tiers: pricingTiers,
        seating_sections: seatingOptions,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/events/:id - Update event (only in draft status)
router.patch('/:id', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const event = await trx('events').where('id', req.params.id).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only organizer or admin can edit
    if (event.organizer_id !== req.user.id && !isAdmin(req)) {
      return res.status(403).json({ error: 'Not authorized to edit this event' });
    }

    // Can only edit if status is draft or pending
    if (!['draft', 'pending_approval'].includes(event.status)) {
      return res.status(400).json({
        error: `Cannot edit event with status: ${event.status}`,
      });
    }

    const {
      title,
      description,
      short_description,
      category,
      event_mode,
      venue_id,
      start_date,
      end_date,
      base_price,
      total_capacity,
      event_image_url,
      pricing_tiers,
    } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (short_description !== undefined) updateData.short_description = short_description;
    if (category) updateData.category = category;
    if (event_mode) updateData.event_mode = event_mode;
    if (venue_id !== undefined) updateData.venue_id = venue_id || null;
    if (start_date) updateData.start_date = start_date;
    if (end_date) updateData.end_date = end_date;
    if (base_price !== undefined) updateData.base_price = base_price;
    if (total_capacity !== undefined) updateData.total_capacity = total_capacity;
    if (event_image_url) updateData.event_image_url = event_image_url;
    updateData.updated_at = new Date();

    await trx('events').where('id', req.params.id).update(updateData);

    // Update pricing tiers if provided
    if (pricing_tiers) {
      await trx('event_pricing_tiers').where('event_id', req.params.id).del();

      const tierData = pricing_tiers.map((tier) => ({
        event_id: req.params.id,
        tier_name: tier.tier_name,
        description: tier.description || null,
        venue_section_id: tier.venue_section_id || null,
        base_price: tier.base_price,
        total_tickets: tier.total_tickets,
        available_tickets: tier.total_tickets,
        sale_start_date: tier.sale_start_date || start_date,
        sale_end_date: tier.sale_end_date || end_date,
        is_active: true,
      }));

      await trx('event_pricing_tiers').insert(tierData);

      // Sync event capacity/availability based on tiers
      const tierTotalTickets = pricing_tiers.reduce(
        (sum, t) => sum + Number(t?.total_tickets || 0),
        0
      );
      await trx('events')
        .where('id', req.params.id)
        .update({
          total_capacity: tierTotalTickets,
          available_tickets: tierTotalTickets,
          updated_at: knex.fn.now(),
        });
    }

    // Reset approval status to pending if event was previously approved
    if (event.status === 'approved') {
      await trx('events')
        .where('id', req.params.id)
        .update({ status: 'pending_approval' });

      await trx('event_approvals').insert({
        event_id: req.params.id,
        requested_by: req.user.id,
        status: 'pending',
        event_snapshot: {
          title,
          description,
          category,
          event_mode,
          venue_id,
          pricing_tiers,
        },
      });
    }

    await trx.commit();

    res.json({
      success: true,
      message: 'Event updated',
      data: { id: req.params.id },
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error updating event:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/events/:id - Delete event (only in draft status)
router.delete('/:id', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const event = await trx('events').where('id', req.params.id).first();

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only organizer or admin can delete
    if (event.organizer_id !== req.user.id && !isAdmin(req)) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Can only delete if in draft or rejected status
    if (!['draft', 'rejected'].includes(event.status)) {
      return res.status(400).json({
        error: `Cannot delete event with status: ${event.status}`,
      });
    }

    // Delete related data
    await trx('event_pricing_tiers').where('event_id', req.params.id).del();
    await trx('event_approvals').where('event_id', req.params.id).del();
    await trx('events').where('id', req.params.id).del();

    await trx.commit();

    res.json({
      success: true,
      message: 'Event deleted',
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error deleting event:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
