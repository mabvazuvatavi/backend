const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { verifyToken } = require('../middleware/auth');
const kenyaPaymentService = require('../services/kenyaPaymentService');
const auditService = require('../services/auditService');

/**
 * GET /api/payments/kenya/methods
 * Get available Kenyan payment methods
 */
router.get('/kenya/methods', async (req, res) => {
  try {
    const methods = await kenyaPaymentService.getAvailablePaymentMethods();
    res.json({ data: methods, count: methods.length });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/initiate
 * Initiate a Kenyan payment transaction
 * @body {number} amount - Amount in KES
 * @body {string} paymentMethod - Method (mpesa, pesepal, equitel, airtel_money, tkash)
 * @body {string} phoneNumber - Mobile number (+254 or 07xx format)
 * @body {number} eventId - Associated event ID (optional)
 * @body {string} email - User email (required for Pesepal)
 */
router.post('/kenya/initiate', verifyToken, async (req, res) => {
  try {
    const schema = Joi.object({
      amount: Joi.number().required().positive().max(500000),
      paymentMethod: Joi.string().required().valid('mpesa', 'pesepal', 'equitel', 'airtel_money', 'tkash'),
      phoneNumber: Joi.string().required().pattern(/^(\+254|0)[7][0-9]{8}$/),
      eventId: Joi.number().optional(),
      email: Joi.string().email().when('paymentMethod', {
        is: 'pesepal',
        then: Joi.required(),
        otherwise: Joi.optional()
      })
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const result = await kenyaPaymentService.initiatePayment(
      req.user.id,
      value.amount,
      value.paymentMethod,
      value.phoneNumber,
      value.eventId || null,
      value.email || null
    );

    await auditService.logAction({
      userId: req.user.id,
      action: 'INITIATE_KENYA_PAYMENT',
      resourceType: 'payment',
      resourceId: result.paymentId,
      changes: {
        amount: value.amount,
        method: value.paymentMethod,
        totalAmount: result.totalAmount
      }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error initiating payment:', error);
    
    if (error.message.includes('Invalid') || error.message.includes('Amount must')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/mpesa/callback
 * Handle M-Pesa webhook callback (no auth required)
 * @body {Object} Body - M-Pesa callback data
 */
router.post('/kenya/mpesa/callback', async (req, res) => {
  try {
    const result = await kenyaPaymentService.handlePaymentCallback('mpesa', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/pesepal/callback
 * Handle Pesepal webhook callback (no auth required)
 * @body {Object} - Pesepal callback data
 */
router.post('/kenya/pesepal/callback', async (req, res) => {
  try {
    const result = await kenyaPaymentService.handlePaymentCallback('pesepal', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error processing Pesepal callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/equitel/callback
 * Handle Equitel webhook callback (no auth required)
 * @body {Object} - Equitel callback data
 */
router.post('/kenya/equitel/callback', async (req, res) => {
  try {
    const result = await kenyaPaymentService.handlePaymentCallback('equitel', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error processing Equitel callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/airtel/callback
 * Handle Airtel Money webhook callback (no auth required)
 * @body {Object} - Airtel Money callback data
 */
router.post('/kenya/airtel/callback', async (req, res) => {
  try {
    const result = await kenyaPaymentService.handlePaymentCallback('airtel_money', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error processing Airtel Money callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/kenya/tkash/callback
 * Handle T-Kash webhook callback (no auth required)
 * @body {Object} - T-Kash callback data
 */
router.post('/kenya/tkash/callback', async (req, res) => {
  try {
    const result = await kenyaPaymentService.handlePaymentCallback('tkash', req.body);
    res.json(result);
  } catch (error) {
    console.error('Error processing T-Kash callback:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/:paymentId/status
 * Get payment status
 * @param {number} paymentId - Payment ID
 */
router.get('/:paymentId/status', verifyToken, async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const status = await kenyaPaymentService.getPaymentStatus(parseInt(paymentId));

    res.json(status);
  } catch (error) {
    console.error('Error getting payment status:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/:paymentId/verify
 * Verify payment legitimacy (anti-fraud)
 * @param {number} paymentId - Payment ID
 */
router.post('/:paymentId/verify', async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const result = await kenyaPaymentService.verifyPayment(parseInt(paymentId));

    res.json(result);
  } catch (error) {
    console.error('Error verifying payment:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/payments/:paymentId/refund
 * Refund a completed payment
 * @param {number} paymentId - Payment ID to refund
 * @body {string} reason - Refund reason
 */
router.post('/:paymentId/refund', verifyToken, async (req, res) => {
  try {
    const schema = Joi.object({
      reason: Joi.string().required().min(10).max(500)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { paymentId } = req.params;

    if (isNaN(paymentId)) {
      return res.status(400).json({ error: 'Invalid payment ID' });
    }

    const result = await kenyaPaymentService.processRefund(
      parseInt(paymentId),
      value.reason
    );

    await auditService.logAction({
      userId: req.user.id,
      action: 'REQUEST_PAYMENT_REFUND',
      resourceType: 'payment',
      resourceId: parseInt(paymentId),
      changes: { reason: value.reason }
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error processing refund:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/history
 * Get transaction history for current user
 * @query {number} limit - Results limit (default 50)
 * @query {number} offset - Pagination offset (default 0)
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const limitNum = Math.min(parseInt(limit) || 50, 100);
    const offsetNum = parseInt(offset) || 0;

    const transactions = await kenyaPaymentService.getTransactionHistory(
      req.user.id,
      limitNum,
      offsetNum
    );

    res.json({ data: transactions, count: transactions.length });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/payments/kenya/statistics
 * Get payment statistics (admin only)
 */
router.get('/kenya/statistics', verifyToken, async (req, res) => {
  try {
    // Verify admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view payment statistics' });
    }

    const stats = await kenyaPaymentService.getPaymentStatistics();

    res.json(stats);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
