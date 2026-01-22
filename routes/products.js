/**
 * Unified Products API
 * Search and list all bookable products across all types
 */

const express = require('express');
const router = express.Router();
const knex = require('../config/database');

// Get all products with filters
router.get('/', async (req, res) => {
  try {
    const {
      type,
      search,
      min_price,
      max_price,
      limit = 50,
      offset = 0,
    } = req.query;

    let query = knex('products').where('is_active', true);

    // Filter by product type
    if (type) {
      query = query.where('product_type', type);
    }

    // Search by name or description
    if (search) {
      query = query.where(function() {
        this.where('name', 'like', `%${search}%`)
          .orWhere('description', 'like', `%${search}%`);
      });
    }

    // Filter by price range
    if (min_price) {
      query = query.where('base_price', '>=', parseFloat(min_price));
    }
    if (max_price) {
      query = query.where('base_price', '<=', parseFloat(max_price));
    }

    const total = await query.clone().count('* as cnt').first();
    const products = await query
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    // Get availability and pricing info for each product
    const productsWithDetails = await Promise.all(
      products.map(async (product) => {
        const inventory = await knex('inventory')
          .where('product_id', product.id)
          .first();

        const pricingTiers = await knex('pricing_tiers')
          .where('product_id', product.id)
          .where('is_active', true);

        return {
          ...product,
          metadata: JSON.parse(product.metadata || '{}'),
          availability: inventory ? {
            available_qty: inventory.available_qty,
            reserved_qty: inventory.reserved_qty,
            sold_qty: inventory.sold_qty,
          } : null,
          pricing_tiers: pricingTiers,
        };
      })
    );

    res.json({
      success: true,
      data: productsWithDetails,
      pagination: {
        total: total.cnt,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get single product details
router.get('/:productId', async (req, res) => {
  try {
    const product = await knex('products')
      .where('id', req.params.productId)
      .first();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Get inventory
    const inventory = await knex('inventory')
      .where('product_id', product.id)
      .first();

    // Get pricing tiers
    const pricingTiers = await knex('pricing_tiers')
      .where('product_id', product.id)
      .where('is_active', true)
      .orderBy('display_order');

    // Get dynamic pricing rules
    const pricingRules = await knex('dynamic_pricing_rules')
      .where('product_id', product.id)
      .where('is_active', true);

    res.json({
      success: true,
      data: {
        ...product,
        metadata: JSON.parse(product.metadata || '{}'),
        inventory: inventory ? {
          available_qty: inventory.available_qty,
          reserved_qty: inventory.reserved_qty,
          sold_qty: inventory.sold_qty,
          total_capacity: inventory.total_capacity,
        } : null,
        pricing_tiers: pricingTiers,
        pricing_rules: pricingRules,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Search products by criteria
router.post('/search', async (req, res) => {
  try {
    const {
      product_type,
      location,
      date_from,
      date_to,
      price_range,
      limit = 50,
      offset = 0,
    } = req.body;

    let query = knex('products').where('is_active', true);

    if (product_type) {
      query = query.where('product_type', product_type);
    }

    if (price_range?.min) {
      query = query.where('base_price', '>=', price_range.min);
    }
    if (price_range?.max) {
      query = query.where('base_price', '<=', price_range.max);
    }

    // For location-based search (events, hotels, etc.)
    if (location) {
      query = query.whereRaw(
        "metadata::text LIKE ?",
        [`%${location}%`]
      );
    }

    // For date range (events, buses, flights, hotels)
    if (date_from || date_to) {
      // This would need custom logic based on product type
      // For now, basic implementation
      if (date_from && date_to) {
        query = query.join('inventory', 'products.id', '=', 'inventory.product_id')
          .where('inventory.inventory_date', '>=', date_from)
          .where('inventory.inventory_date', '<=', date_to);
      }
    }

    const total = await query.clone().count('* as cnt').first();
    const products = await query
      .distinct('products.*')
      .orderBy('products.created_at', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({
      success: true,
      data: products,
      pagination: {
        total: total.cnt,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Get availability by date
router.get('/availability/:productId', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let query = knex('inventory').where('product_id', req.params.productId);

    if (date_from) {
      query = query.where('inventory_date', '>=', date_from);
    }
    if (date_to) {
      query = query.where('inventory_date', '<=', date_to);
    }

    const availability = await query.orderBy('inventory_date');

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
