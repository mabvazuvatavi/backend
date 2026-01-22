/**
 * Unified Booking API Routes
 * Handles bookings across all product types
 */

const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const { verifyToken } = require('../middleware/auth');

// Create new booking
router.post('/', verifyToken, async (req, res) => {
  try {
    const { currency } = req.body;
    const booking = await bookingService.createBooking(req.user.id, currency || 'KES');
    res.status(201).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get booking details
router.get('/:bookingId', verifyToken, async (req, res) => {
  try {
    const booking = await bookingService.getBookingDetails(req.params.bookingId);
    
    // Verify user owns this booking
    if (booking.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message,
    });
  }
});

// List user bookings
router.get('/', verifyToken, async (req, res) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user.id, {
      status: req.query.status,
      payment_status: req.query.payment_status,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    });

    res.json({
      success: true,
      data: bookings,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Add item to booking
router.post('/:bookingId/items', verifyToken, async (req, res) => {
  try {
    const { productId, quantity, extras } = req.body;

    if (!productId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, quantity',
      });
    }

    const item = await bookingService.addBookingItem(
      req.params.bookingId,
      productId,
      quantity,
      extras || {}
    );

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Remove item from booking
router.delete('/:bookingId/items/:itemId', verifyToken, async (req, res) => {
  try {
    // TODO: Implement remove item logic
    res.json({
      success: true,
      message: 'Item removed from booking',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Reserve booking items
router.post('/:bookingId/reserve', verifyToken, async (req, res) => {
  try {
    const result = await bookingService.reserveBookingItems(req.params.bookingId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Release reservation
router.post('/:bookingId/release', verifyToken, async (req, res) => {
  try {
    await bookingService.releaseExpiredReservation(req.params.bookingId);
    res.json({
      success: true,
      message: 'Reservation released',
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Initiate payment
router.post('/:bookingId/pay', verifyToken, async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Payment method is required',
      });
    }

    // TODO: Implement payment processing based on method
    // For now, just create a payment record

    res.json({
      success: true,
      message: 'Payment initiated',
      data: {
        booking_id: req.params.bookingId,
        payment_method: paymentMethod,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Confirm booking (admin or payment callback)
router.post('/:bookingId/confirm', verifyToken, async (req, res) => {
  try {
    // TODO: Add authorization check (admin only or payment verified)
    const result = await bookingService.confirmBooking(req.params.bookingId);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', verifyToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const result = await bookingService.cancelBooking(req.params.bookingId, reason);
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
