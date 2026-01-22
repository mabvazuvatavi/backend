/**
 * Event Approval System Routes
 * Handles event submission, approval workflow, and status transitions
 */
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

/**
 * ORGANIZER: Submit event for approval
 * POST /api/events/approvals/submit
 * Organizers create events as DRAFT, then submit for admin review
 */
router.post('/submit', verifyToken, requireRole('organizer'), async (req, res) => {
  try {
    const { eventId } = req.body;

    // Verify event exists and belongs to organizer
    const event = await db('events')
      .where({ id: eventId, organizer_id: req.user.id })
      .first();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission to submit it'
      });
    }

    // Event must be in draft status
    if (event.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: `Event cannot be submitted from ${event.status} status. Only draft events can be submitted.`
      });
    }

    // Update event status to pending review
    const [updatedEvent] = await db('events')
      .where({ id: eventId })
      .update({
        status: 'pending_admin_review',
        updated_at: new Date()
      })
      .returning('*');

    // Create approval audit log
    await db('event_approvals').insert({
      event_id: eventId,
      organizer_id: req.user.id,
      action: 'submitted',
      notes: 'Event submitted for admin review',
      event_snapshot: JSON.stringify(event)
    });

    res.json({
      success: true,
      message: 'Event submitted for admin approval',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Submit event for approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit event for approval'
    });
  }
});

/**
 * ADMIN: Get pending approval events
 * GET /api/events/approvals/pending
 */
router.get('/pending', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const events = await db('events')
      .where({ status: 'pending_admin_review' })
      .where({ deleted_at: null })
      .leftJoin('users as organizers', 'events.organizer_id', 'organizers.id')
      .leftJoin('venues', 'events.venue_id', 'venues.id')
      .select([
        'events.*',
        'organizers.first_name as organizer_first_name',
        'organizers.last_name as organizer_last_name',
        'organizers.email as organizer_email',
        'venues.name as venue_name'
      ])
      .orderBy('events.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const totalCount = await db('events')
      .where({ status: 'pending_admin_review' })
      .where({ deleted_at: null })
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount.count,
        pages: Math.ceil(totalCount.count / limit)
      }
    });
  } catch (error) {
    console.error('Get pending events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending events'
    });
  }
});

/**
 * ADMIN: Approve event
 * POST /api/events/approvals/:eventId/approve
 */
router.post('/:eventId/approve', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { notes = '' } = req.body;

    // Get event
    const event = await db('events')
      .where({ id: eventId })
      .first();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Event must be pending review
    if (event.status !== 'pending_admin_review') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve event with status: ${event.status}`
      });
    }

    // Update event status to approved and published
    const [updatedEvent] = await db('events')
      .where({ id: eventId })
      .update({
        status: 'published',
        approved_by: req.user.id,
        approved_at: new Date(),
        published_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Create approval audit log
    await db('event_approvals').insert({
      event_id: eventId,
      organizer_id: event.organizer_id,
      admin_id: req.user.id,
      action: 'approved',
      notes: notes || 'Event approved by admin',
      event_snapshot: JSON.stringify(event)
    });

    res.json({
      success: true,
      message: 'Event approved and published successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Approve event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve event'
    });
  }
});

/**
 * ADMIN: Reject event
 * POST /api/events/approvals/:eventId/reject
 */
router.post('/:eventId/reject', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rejection_reason } = req.body;

    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    // Get event
    const event = await db('events')
      .where({ id: eventId })
      .first();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Event must be pending review
    if (event.status !== 'pending_admin_review') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject event with status: ${event.status}`
      });
    }

    // Update event status to rejected
    const [updatedEvent] = await db('events')
      .where({ id: eventId })
      .update({
        status: 'rejected',
        rejection_reason: rejection_reason,
        rejected_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Create rejection audit log
    await db('event_approvals').insert({
      event_id: eventId,
      organizer_id: event.organizer_id,
      admin_id: req.user.id,
      action: 'rejected',
      notes: rejection_reason,
      event_snapshot: JSON.stringify(event)
    });

    res.json({
      success: true,
      message: 'Event rejected',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Reject event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject event'
    });
  }
});

/**
 * ORGANIZER: Get approval history for their events
 * GET /api/events/:eventId/approval-history
 */
router.get('/:eventId/history', verifyToken, async (req, res) => {
  try {
    const { eventId } = req.params;

    // Verify access: organizer can see their own, admin can see any
    const event = await db('events')
      .where({ id: eventId })
      .first();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (req.user.role === 'organizer' && event.organizer_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this event\'s approval history'
      });
    }

    const approvalHistory = await db('event_approvals')
      .where({ event_id: eventId })
      .leftJoin('users as admins', 'event_approvals.admin_id', 'admins.id')
      .select([
        'event_approvals.*',
        'admins.first_name as admin_first_name',
        'admins.last_name as admin_last_name',
        'admins.email as admin_email'
      ])
      .orderBy('event_approvals.action_date', 'desc');

    res.json({
      success: true,
      data: approvalHistory
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approval history'
    });
  }
});

/**
 * ORGANIZER: Revise rejected event and resubmit
 * POST /api/events/:eventId/revise
 */
router.post('/:eventId/revise', verifyToken, requireRole('organizer'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const { revisionNotes, ...eventUpdates } = req.body;

    // Get event
    const event = await db('events')
      .where({ id: eventId, organizer_id: req.user.id })
      .first();

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission'
      });
    }

    // Event must be rejected
    if (event.status !== 'rejected') {
      return res.status(400).json({
        success: false,
        message: 'Only rejected events can be revised and resubmitted'
      });
    }

    // Update event with revisions
    const [updatedEvent] = await db('events')
      .where({ id: eventId })
      .update({
        ...eventUpdates,
        status: 'pending_admin_review',
        rejection_reason: null,
        rejected_at: null,
        updated_at: new Date()
      })
      .returning('*');

    // Log revision
    await db('event_approvals').insert({
      event_id: eventId,
      organizer_id: req.user.id,
      action: 'revised',
      notes: revisionNotes || 'Event revised and resubmitted for approval',
      event_snapshot: JSON.stringify(updatedEvent)
    });

    res.json({
      success: true,
      message: 'Event revised and resubmitted for approval',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Revise event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revise event'
    });
  }
});

module.exports = router;
