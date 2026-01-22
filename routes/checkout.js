const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/auth');
const { CartService, CheckoutService } = require('../services/cartCheckoutService');
const auditService = require('../services/auditService');
const seatService = require('../services/seatService');

/**
 * Initiate checkout
 * POST /api/checkout/initiate
 */
router.post('/initiate', verifyToken, async (req, res) => {
  try {
    const { payment_method, billing_info } = req.body;

    if (!billing_info) {
      return res.status(400).json({
        success: false,
        message: 'billing_info is required'
      });

    }

    const result = await CheckoutService.initiateCheckout(req.user.id, {
      payment_method: payment_method || 'stripe',
      billing_info
    });

    res.status(201).json({
      success: true,
      message: 'Checkout initiated',
      data: result
    });
  } catch (error) {
    console.error('Initiate checkout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to initiate checkout'
    });
  }
});

/**
 * Pay remaining balance on an order (part-payments)
 * POST /api/checkout/orders/:orderId/pay
 */
router.post('/orders/:orderId/pay', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { amount_paid, payment_method, gateway_response } = req.body;

    const order = await db('orders')
      .where('id', orderId)
      .where('user_id', req.user.id)
      .first();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!['partially_paid', 'confirmed'].includes(order.status)) {
      return res.status(400).json({ success: false, message: `Order is ${order.status}` });
    }

    const balanceDue = Number(order.balance_due ?? 0);
    if (balanceDue <= 0) {
      return res.status(400).json({ success: false, message: 'Order is already fully paid' });
    }

    const requestedPm = payment_method || 'cash';
    const pm = ['stripe', 'paypal', 'zim_gateway', 'mastercard', 'visa', 'bank_transfer', 'cash'].includes(requestedPm)
      ? requestedPm
      : 'cash';
    const gateway = pm === 'paypal' ? 'paypal' : pm === 'stripe' ? 'stripe' : pm === 'zim_gateway' ? 'zim_gateway' : 'other';
    const reference_number = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

    const paidAmount = Math.max(0, Math.min(Number(amount_paid) || 0, balanceDue));
    if (paidAmount <= 0) {
      return res.status(400).json({ success: false, message: 'amount_paid must be > 0' });
    }

    const [createdPayment] = await db('payments')
      .insert({
        user_id: req.user.id,
        event_id: null,
        payment_method: pm,
        gateway,
        reference_number,
        amount: paidAmount,
        currency: 'USD',
        total_amount: paidAmount,
        status: 'completed',
        completed_at: new Date(),
        gateway_response: gateway_response || null,
        metadata: { order_id: orderId, type: 'order_payment' }
      })
      .returning('*');

    const nextAmountPaid = Number(order.amount_paid ?? 0) + paidAmount;
    const nextBalanceDue = Math.max(0, Number(order.total_amount ?? 0) - nextAmountPaid);
    const nextStatus = nextBalanceDue <= 0 ? 'confirmed' : 'partially_paid';

    await db('orders')
      .where('id', orderId)
      .update({
        amount_paid: nextAmountPaid,
        balance_due: nextBalanceDue,
        status: nextStatus,
        payment_id: createdPayment.id,
        updated_at: new Date()
      });

    // If fully paid now: confirm reserved tickets + confirm any seat reservations stored in order metadata
    if (nextStatus === 'confirmed') {
      await db('tickets')
        .where('order_id', orderId)
        .where('status', 'reserved')
        .update({ status: 'confirmed', updated_at: new Date() });

      try {
        const meta = order.metadata
          ? (typeof order.metadata === 'string' ? JSON.parse(order.metadata) : order.metadata)
          : {};
        const reservationIds = Array.isArray(meta?.reservation_ids) ? meta.reservation_ids : [];
        for (const reservationId of reservationIds) {
          await seatService.confirmPurchase(reservationId, createdPayment.id, req.user.id);
        }
      } catch (e) {
        // best-effort
      }
    }

    res.json({
      success: true,
      message: nextStatus === 'confirmed' ? 'Order fully paid' : 'Payment recorded',
      data: {
        orderId,
        paymentId: createdPayment.id,
        amountPaid: nextAmountPaid,
        balanceDue: nextBalanceDue,
        status: nextStatus
      }
    });
  } catch (error) {
    console.error('Order pay error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to apply payment' });
  }
});

/**
 * Complete checkout
 * POST /api/checkout/complete
 */
router.post('/complete', verifyToken, async (req, res) => {
  try {
    const { checkout_id, payment_intent_id, stripe_token, payment_method, gateway_response, amount_paid } = req.body;

    if (!checkout_id) {
      return res.status(400).json({
        success: false,
        message: 'checkout_id is required'
      });
    }

    let finalPaymentId = payment_intent_id;

    // If no payment intent provided, create a completed payment record (useful for cash/offline/mock flows)
    if (!finalPaymentId) {
      const checkout = await db('checkouts')
        .where('id', checkout_id)
        .where('user_id', req.user.id)
        .where('status', 'pending')
        .first();

      if (!checkout) {
        return res.status(404).json({
          success: false,
          message: 'Checkout not found or already processed'
        });
      }

      const requestedPm = payment_method || 'cash';
      const pm = ['stripe', 'paypal', 'zim_gateway', 'mastercard', 'visa', 'bank_transfer', 'cash'].includes(requestedPm)
        ? requestedPm
        : 'cash';
      const gateway = pm === 'paypal' ? 'paypal' : pm === 'stripe' ? 'stripe' : pm === 'zim_gateway' ? 'zim_gateway' : 'other';
      const reference_number = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

      const paidAmountRaw = amount_paid === undefined || amount_paid === null ? checkout.total_amount : amount_paid;
      const paidAmount = Math.max(0, Math.min(Number(paidAmountRaw) || 0, Number(checkout.total_amount) || 0));

      if (paidAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'amount_paid must be > 0'
        });
      }

      const [createdPayment] = await db('payments')
        .insert({
          user_id: req.user.id,
          event_id: null,
          payment_method: pm,
          gateway,
          reference_number,
          amount: paidAmount,
          currency: 'USD',
          total_amount: paidAmount,
          status: 'completed',
          completed_at: new Date(),
          gateway_response: gateway_response || null,
          metadata: { checkout_id, type: 'checkout_payment' }
        })
        .returning('*');

      finalPaymentId = createdPayment.id;
    }

    const result = await CheckoutService.completeCheckout(
      req.user.id,
      checkout_id,
      {
        payment_intent_id: finalPaymentId,
        stripe_token
      }
    );

    // Log successful order
    await auditService.log({
      userId: req.user.id,
      action: 'ORDER_COMPLETED',
      resource: 'orders',
      resourceId: result.orderId,
      newValues: {
        totalAmount: result.totalAmount,
        ticketsCount: result.ticketsCreated
      }
    });

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Complete checkout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete checkout'
    });
  }
});

/**
 * Get user's orders
 * GET /api/checkout/orders
 */
router.get('/orders', verifyToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    let query = db('orders')
      .leftJoin('payments', 'orders.payment_id', 'payments.id')
      .where('orders.user_id', req.user.id)
      .select([
        'orders.*',
        'payments.gateway as payment_gateway',
        'payments.status as payment_status'
      ]);

    if (status) {
      query = query.where('orders.status', status);
    }

    const totalQuery = query.clone().clearSelect().clearOrder().count('orders.id as count').first();
    const [orders, total] = await Promise.all([
      query
        .orderBy('orders.created_at', 'desc')
        .limit(limit)
        .offset(offset),
      totalQuery
    ]);

    // Get ticket count for each order
    const ordersWithTickets = await Promise.all(
      orders.map(async (order) => {
        const ticketCount = await db('tickets')
          .where('order_id', order.id)
          .count('id as count')
          .first();

        return {
          ...order,
          ticketCount: parseInt(ticketCount.count)
        };
      })
    );

    res.json({
      success: true,
      data: {
        orders: ordersWithTickets,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

/**
 * Get order details
 * GET /api/checkout/orders/:orderId
 */
router.get('/orders/:orderId', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await db('orders')
      .leftJoin('payments', 'orders.payment_id', 'payments.id')
      .where('orders.id', orderId)
      .where('orders.user_id', req.user.id)
      .select([
        'orders.*',
        'payments.gateway as payment_gateway',
        'payments.status as payment_status'
      ])
      .first();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Get tickets
    const tickets = await db('tickets')
      .where('order_id', orderId)
      .select('*');

    res.json({
      success: true,
      data: {
        order,
        tickets,
        billingInfo: typeof order.billing_info === 'string' ? JSON.parse(order.billing_info) : order.billing_info
      }
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order details'
    });
  }
});

/**
 * Get checkout details
 * GET /api/checkout/:checkoutId
 */
router.get('/:checkoutId', verifyToken, async (req, res) => {
  try {
    const { checkoutId } = req.params;

    const checkout = await CheckoutService.getCheckout(checkoutId, req.user.id);

    res.json({
      success: true,
      data: checkout
    });
  } catch (error) {
    console.error('Get checkout error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Checkout not found'
    });
  }
});

/**
 * Cancel checkout
 * POST /api/checkout/:checkoutId/cancel
 */
router.post('/:checkoutId/cancel', verifyToken, async (req, res) => {
  try {
    const { checkoutId } = req.params;

    await CheckoutService.cancelCheckout(checkoutId, req.user.id);

    res.json({
      success: true,
      message: 'Checkout cancelled'
    });
  } catch (error) {
    console.error('Cancel checkout error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Failed to cancel checkout'
    });
  }
});

module.exports = router;
