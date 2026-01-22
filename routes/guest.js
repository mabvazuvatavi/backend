const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const guestCheckoutService = require('../services/guestCheckoutService');
const { CartService } = require('../services/cartCheckoutService');

/**
 * Create a guest cart (no auth required)
 * POST /api/guest/cart/create
 */
router.post('/cart/create', async (req, res) => {
  try {
    const result = await guestCheckoutService.createGuestCart();

    res.status(201).json({
      success: true,
      message: 'Guest cart created',
      data: result
    });
  } catch (error) {
    console.error('Create guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest cart'
    });
  }
});

/**
 * Get guest cart (no auth required)
 * GET /api/guest/cart/:cartId
 */
router.get('/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;

    const cart = await guestCheckoutService.getGuestCart(cartId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found or expired'
      });
    }

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

/**
 * Add item to guest cart (supports event, flight, bus, hotel via item_type)
 * POST /api/guest/cart/:cartId/add
 */
router.post('/cart/:cartId/add', async (req, res) => {
  try {
    const { cartId } = req.params;
    const { 
      // Legacy event fields
      event_id, 
      seat_ids, 
      ticket_type, 
      quantity, 
      price,
      // New unified fields (Option 2)
      item_type = 'event',
      item_ref_id,
      item_title,
      metadata
    } = req.body;

    console.log('Add to guest cart - received params:', { 
      event_id, item_type, item_ref_id, item_title, quantity, price 
    });

    // Validate: either event_id (legacy) or item_type + item_ref_id (new)
    if (item_type === 'event' && !event_id) {
      return res.status(400).json({
        success: false,
        message: 'event_id is required for event items'
      });
    }

    if (item_type !== 'event' && !item_ref_id) {
      return res.status(400).json({
        success: false,
        message: 'item_ref_id is required for non-event items'
      });
    }

    // Verify cart exists
    const cart = await db('shopping_carts')
      .where('id', cartId)
      .where('is_guest', true)
      .first();

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    let unitPrice = price || 0;
    let finalEventId = null;

    // Handle different item types
    if (item_type === 'event') {
      // Verify event exists
      const event = await db('events')
        .where('id', event_id)
        .whereNull('deleted_at')
        .first();

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }
      
      unitPrice = price || event.min_price || 0;
      finalEventId = event_id;
    }
    // For flight/bus/hotel, we don't verify since they're external API data

    // Add item to cart
    const cartItemId = uuidv4();
    const totalPrice = unitPrice * (quantity || 1);
    
    console.log('Calculated prices:', { price, unitPrice, totalPrice, item_type });

    const newItem = {
      id: cartItemId,
      cart_id: cartId,
      event_id: finalEventId,
      item_type: item_type || 'event',
      item_ref_id: item_ref_id || null,
      item_title: item_title || null,
      seat_numbers: seat_ids && seat_ids.length > 0 ? JSON.stringify(seat_ids) : null,
      ticket_type: ticket_type || 'standard',
      quantity: quantity || 1,
      unit_price: unitPrice,
      total_price: totalPrice,
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    await db('shopping_cart_items').insert(newItem);

    // Calculate new total
    const total = await db('shopping_cart_items')
      .where('cart_id', cartId)
      .sum('total_price as total')
      .first();

    await db('shopping_carts')
      .where('id', cartId)
      .update({ total_amount: total.total || 0 });

    // Return success - frontend will fetch cart when needed
    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: {
        id: cartId,
        item_type: item_type
      }
    });
  } catch (error) {
    console.error('Add to guest cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add item to cart'
    });
  }
});

/**
 * Initiate guest checkout
 * POST /api/guest/checkout/initiate
 */
router.post('/checkout/initiate', async (req, res) => {
  try {
    const { cart_id, guest_info, payment_method, billing_info } = req.body;

    if (!cart_id || !guest_info || !billing_info) {
      return res.status(400).json({
        success: false,
        message: 'cart_id, guest_info, and billing_info are required'
      });
    }

    const result = await guestCheckoutService.initiateGuestCheckout(
      cart_id,
      guest_info,
      {
        payment_method: payment_method || 'stripe',
        billing_info
      }
    );

    res.status(201).json({
      success: true,
      message: 'Checkout initiated',
      data: result
    });
  } catch (error) {
    console.error('Initiate guest checkout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to initiate checkout'
    });
  }
});

/**
 * Complete guest checkout
 * POST /api/guest/checkout/complete
 */
router.post('/checkout/complete', async (req, res) => {
  try {
    const { cart_id, billing_address } = req.body;

    if (!cart_id) {
      return res.status(400).json({
        success: false,
        message: 'cart_id is required'
      });
    }

    const result = await guestCheckoutService.completeGuestCheckout(
      cart_id,
      billing_address || {}
    );

    res.json({
      success: true,
      message: 'Checkout completed successfully',
      data: result
    });
  } catch (error) {
    console.error('Complete guest checkout error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to complete checkout'
    });
  }
});

/**
 * Get guest tickets by email + confirmation code
 * GET /api/guest/tickets?email=...&code=...
 */
router.get('/tickets', async (req, res) => {
  try {
    const { email, code } = req.query;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and confirmation code are required'
      });
    }

    const result = await guestCheckoutService.getGuestTickets(email, code);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get guest tickets error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'Tickets not found'
    });
  }
});

/**
 * Resend guest access link
 * POST /api/guest/resend-link
 */
router.post('/resend-link', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await guestCheckoutService.sendGuestAccessLink(email);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Resend access link error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to send access link'
    });
  }
});

/**
 * Get guest order history
 * GET /api/guest/orders?email=...&code=...
 */
router.get('/orders', async (req, res) => {
  try {
    const { email, code } = req.query;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and confirmation code are required'
      });
    }

    const result = await guestCheckoutService.getGuestOrderHistory(email, code);

    res.json({
      success: true,
      data: {
        email,
        orders: result,
        totalOrders: result.length
      }
    });
  } catch (error) {
    console.error('Get guest orders error:', error);
    res.status(404).json({
      success: false,
      message: error.message || 'No orders found'
    });
  }
});

/**
 * Convert guest order to account
 * POST /api/guest/register
 */
router.post('/register', async (req, res) => {
  try {
    const { email, confirmation_code, password, password_confirm } = req.body;

    if (!email || !confirmation_code || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email, confirmation code, and password are required'
      });
    }

    if (password !== password_confirm) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const result = await guestCheckoutService.convertGuestToAccount(
      email,
      confirmation_code,
      { password }
    );

    res.json({
      success: true,
      message: 'Account created successfully',
      data: result
    });
  } catch (error) {
    console.error('Register guest error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create account'
    });
  }
});

/**
 * Remove item from guest cart
 * DELETE /api/guest/cart/:cartId/items/:itemId
 */
router.delete('/cart/:cartId/items/:itemId', async (req, res) => {
  try {
    const { cartId, itemId } = req.params;

    // Verify cart exists and is guest
    const cart = await db('shopping_carts')
      .where('id', cartId)
      .where('is_guest', true)
      .first();

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Remove item
    await db('shopping_cart_items')
      .where('id', itemId)
      .where('cart_id', cartId)
      .delete();

    // Recalculate total
    const total = await db('shopping_cart_items')
      .where('cart_id', cartId)
      .sum('total_price as total')
      .first();

    await db('shopping_carts')
      .where('id', cartId)
      .update({ total_amount: total.total || 0 });

    res.json({
      success: true,
      message: 'Item removed',
      data: { cartTotal: total.total || 0 }
    });
  } catch (error) {
    console.error('Remove guest cart item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove item'
    });
  }
});

/**
 * Clear guest cart
 * DELETE /api/guest/cart/:cartId
 */
router.delete('/cart/:cartId', async (req, res) => {
  try {
    const { cartId } = req.params;

    // Verify cart exists and is guest
    const cart = await db('shopping_carts')
      .where('id', cartId)
      .where('is_guest', true)
      .first();

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Clear items
    await db('shopping_cart_items')
      .where('cart_id', cartId)
      .delete();

    // Reset total
    await db('shopping_carts')
      .where('id', cartId)
      .update({ total_amount: 0 });

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Clear guest cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

module.exports = router;
