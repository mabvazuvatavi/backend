const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { CartService } = require('../services/cartCheckoutService');

/**
 * Get user's current cart
 * GET /api/cart
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const cart = await CartService.getCart(req.user.id);

    res.json({
      success: true,
      data: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cart'
    });
  }
});

/**
 * Add item to cart (supports event, flight, bus, hotel via item_type)
 * POST /api/cart/add
 */
router.post('/add', verifyToken, async (req, res) => {
  try {
    const { 
      // Legacy event fields
      event_id, 
      seat_ids, 
      seat_numbers, 
      ticket_type, 
      quantity, 
      price, 
      metadata,
      // New unified fields (Option 2)
      item_type = 'event',
      item_ref_id,
      item_title
    } = req.body;

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

    const result = await CartService.addToCart(req.user.id, {
      event_id,
      seat_ids: Array.isArray(seat_ids) ? seat_ids : [],
      seat_numbers: Array.isArray(seat_numbers) ? seat_numbers : [],
      ticket_type: ticket_type || 'general',
      quantity: quantity || 1,
      price,
      metadata,
      item_type,
      item_ref_id,
      item_title
    });

    res.status(201).json({
      success: true,
      message: 'Item added to cart',
      data: result
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add item to cart'
    });
  }
});

/**
 * Remove item from cart
 * DELETE /api/cart/items/:itemId
 */
router.delete('/items/:itemId', verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await CartService.removeFromCart(req.user.id, itemId);

    res.json({
      success: true,
      message: 'Item removed from cart',
      data: result
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to remove item'
    });
  }
});

/**
 * Update cart item quantity
 * PUT /api/cart/items/:itemId
 */
router.put('/items/:itemId', verifyToken, async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'quantity is required'
      });
    }

    const result = await CartService.updateQuantity(req.user.id, itemId, quantity);

    res.json({
      success: true,
      message: 'Quantity updated',
      data: result
    });
  } catch (error) {
    console.error('Update quantity error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update quantity'
    });
  }
});

/**
 * Clear cart
 * DELETE /api/cart
 */
router.delete('/', verifyToken, async (req, res) => {
  try {
    await CartService.clearCart(req.user.id);

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart'
    });
  }
});

/**
 * Apply discount code
 * POST /api/cart/discount
 */
router.post('/discount', verifyToken, async (req, res) => {
  try {
    const { discount_code } = req.body;

    if (!discount_code) {
      return res.status(400).json({
        success: false,
        message: 'discount_code is required'
      });
    }

    const result = await CartService.applyDiscount(req.user.id, discount_code);

    res.json({
      success: true,
      message: 'Discount applied',
      data: result
    });
  } catch (error) {
    console.error('Apply discount error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to apply discount'
    });
  }
});

/**
 * Remove discount code
 * DELETE /api/cart/discount
 */
router.delete('/discount', verifyToken, async (req, res) => {
  try {
    await CartService.removeDiscount(req.user.id);

    res.json({
      success: true,
      message: 'Discount removed'
    });
  } catch (error) {
    console.error('Remove discount error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove discount'
    });
  }
});

module.exports = router;
