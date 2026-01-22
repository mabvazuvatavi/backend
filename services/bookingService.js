/**
 * Unified Booking Service
 * Handles booking logic across Events, Buses, Flights, Hotels
 */

const knex = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class BookingService {
  // Create a new booking
  async createBooking(userId, currency = 'KES') {
    try {
      const bookingId = uuidv4();
      await knex('bookings').insert({
        id: bookingId,
        user_id: userId,
        status: 'pending',
        payment_status: 'pending',
        total_amount: 0,
        currency: currency,
        booking_date: knex.fn.now(),
      });
      return { id: bookingId, status: 'pending', total_amount: 0 };
    } catch (error) {
      throw new Error(`Failed to create booking: ${error.message}`);
    }
  }

  // Add item to booking
  async addBookingItem(bookingId, productId, quantity, extras = {}) {
    try {
      // Get product details
      const product = await knex('products').where('id', productId).first();
      if (!product) throw new Error('Product not found');

      // Calculate item price with dynamic pricing
      const unitPrice = await this.calculatePrice(productId, quantity, extras);
      const subtotal = unitPrice * quantity;

      // Create booking item
      const itemId = uuidv4();
      await knex('booking_items').insert({
        id: itemId,
        booking_id: bookingId,
        product_id: productId,
        product_type: product.product_type,
        quantity,
        unit_price: unitPrice,
        subtotal,
        extras: JSON.stringify(extras),
        status: 'pending',
      });

      // Update booking total
      await this.updateBookingTotal(bookingId);

      return {
        id: itemId,
        product_id: productId,
        quantity,
        unit_price: unitPrice,
        subtotal,
      };
    } catch (error) {
      throw new Error(`Failed to add booking item: ${error.message}`);
    }
  }

  // Calculate price with dynamic pricing rules
  async calculatePrice(productId, quantity, extras = {}) {
    try {
      let basePrice = 0;

      // Get product pricing tier if specified
      if (extras.tier_id) {
        const tier = await knex('pricing_tiers').where('id', extras.tier_id).first();
        if (tier) basePrice = parseFloat(tier.price);
      } else {
        const product = await knex('products').where('id', productId).first();
        basePrice = parseFloat(product.base_price);
      }

      // Apply dynamic pricing rules
      const multiplier = await this.getDynamicPriceMultiplier(productId, extras);
      const finalPrice = basePrice * multiplier;

      return finalPrice;
    } catch (error) {
      console.error('Price calculation error:', error);
      return 0; // Fallback to product base price
    }
  }

  // Get dynamic price multiplier
  async getDynamicPriceMultiplier(productId, extras = {}) {
    try {
      const rules = await knex('dynamic_pricing_rules')
        .where('product_id', productId)
        .where('is_active', true)
        .where('active_from', '<=', knex.raw('CURRENT_DATE'))
        .where('active_to', '>=', knex.raw('CURRENT_DATE'));

      let multiplier = 1;

      for (const rule of rules) {
        // Check if rule conditions are met
        const conditions = JSON.parse(rule.conditions || '{}');
        if (this.checkRuleConditions(conditions, extras)) {
          multiplier *= parseFloat(rule.price_multiplier);
        }
      }

      return multiplier;
    } catch (error) {
      console.error('Dynamic pricing error:', error);
      return 1; // No adjustment if error
    }
  }

  // Check if rule conditions are met
  checkRuleConditions(conditions, extras) {
    // Implement condition checking logic
    // Examples: min_quantity, booking_time, inventory_level, etc.
    if (conditions.min_quantity && extras.quantity < conditions.min_quantity) {
      return false;
    }
    return true;
  }

  // Reserve items (lock inventory)
  async reserveBookingItems(bookingId) {
    try {
      const booking = await knex('bookings').where('id', bookingId).first();
      if (!booking) throw new Error('Booking not found');

      const items = await knex('booking_items').where('booking_id', bookingId);

      for (const item of items) {
        // Check inventory availability
        const inventory = await knex('inventory')
          .where('product_id', item.product_id)
          .first();

        if (!inventory || inventory.available_qty < item.quantity) {
          throw new Error(`Insufficient inventory for product ${item.product_id}`);
        }

        // Reserve inventory
        await knex('inventory')
          .where('product_id', item.product_id)
          .update({
            available_qty: knex.raw('available_qty - ?', [item.quantity]),
            reserved_qty: knex.raw('reserved_qty + ?', [item.quantity]),
          });

        // Update item status
        await knex('booking_items').where('id', item.id).update({ status: 'reserved' });
      }

      // Update booking status and set expiration
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      await knex('bookings').where('id', bookingId).update({
        status: 'reserved',
        reservation_expires_at: expiresAt,
      });

      return { status: 'reserved', expires_at: expiresAt };
    } catch (error) {
      throw new Error(`Failed to reserve items: ${error.message}`);
    }
  }

  // Release reservation (if not paid within time limit)
  async releaseExpiredReservation(bookingId) {
    try {
      const booking = await knex('bookings').where('id', bookingId).first();
      if (!booking || booking.status !== 'reserved') return;

      const items = await knex('booking_items').where('booking_id', bookingId);

      for (const item of items) {
        // Release reserved inventory
        await knex('inventory')
          .where('product_id', item.product_id)
          .update({
            available_qty: knex.raw('available_qty + ?', [item.quantity]),
            reserved_qty: knex.raw('reserved_qty - ?', [item.quantity]),
          });

        // Update item status
        await knex('booking_items').where('id', item.id).update({ status: 'cancelled' });
      }

      // Update booking status
      await knex('bookings').where('id', bookingId).update({
        status: 'cancelled',
        payment_status: 'failed',
      });
    } catch (error) {
      console.error('Error releasing reservation:', error);
    }
  }

  // Confirm booking (after payment)
  async confirmBooking(bookingId) {
    try {
      const items = await knex('booking_items').where('booking_id', bookingId);

      for (const item of items) {
        // Move from reserved to sold
        await knex('inventory')
          .where('product_id', item.product_id)
          .update({
            reserved_qty: knex.raw('reserved_qty - ?', [item.quantity]),
            sold_qty: knex.raw('sold_qty + ?', [item.quantity]),
          });

        // Update item status
        await knex('booking_items').where('id', item.id).update({ status: 'confirmed' });

        // Generate tickets
        await this.generateTickets(item.id);
      }

      // Update booking status
      await knex('bookings').where('id', bookingId).update({
        status: 'confirmed',
        payment_status: 'completed',
      });

      return { status: 'confirmed' };
    } catch (error) {
      throw new Error(`Failed to confirm booking: ${error.message}`);
    }
  }

  // Generate tickets for booking item
  async generateTickets(bookingItemId) {
    try {
      const item = await knex('booking_items').where('id', bookingItemId).first();
      if (!item) throw new Error('Booking item not found');

      const tickets = [];
      for (let i = 0; i < item.quantity; i++) {
        const ticketNumber = this.generateTicketNumber(item.product_type);
        const qrData = JSON.stringify({
          ticket_number: ticketNumber,
          booking_item_id: bookingItemId,
          issued_at: new Date(),
        });

        await knex('booking_tickets').insert({
          id: uuidv4(),
          booking_item_id: bookingItemId,
          ticket_number: ticketNumber,
          qr_code: qrData,
          status: 'issued',
          ticket_data: JSON.stringify(item.extras),
        });

        tickets.push(ticketNumber);
      }

      return tickets;
    } catch (error) {
      console.error('Error generating tickets:', error);
      throw error;
    }
  }

  // Generate unique ticket number
  generateTicketNumber(productType) {
    const prefix = productType.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Cancel booking
  async cancelBooking(bookingId, reason = '') {
    try {
      const booking = await knex('bookings').where('id', bookingId).first();
      if (!booking) throw new Error('Booking not found');

      const items = await knex('booking_items').where('booking_id', bookingId);

      for (const item of items) {
        if (item.status === 'reserved') {
          // Release reserved inventory
          await knex('inventory')
            .where('product_id', item.product_id)
            .update({
              available_qty: knex.raw('available_qty + ?', [item.quantity]),
              reserved_qty: knex.raw('reserved_qty - ?', [item.quantity]),
            });
        }

        // Update item status
        await knex('booking_items').where('id', item.id).update({ status: 'cancelled' });
      }

      // Update booking status
      await knex('bookings').where('id', bookingId).update({
        status: 'cancelled',
      });

      return { status: 'cancelled' };
    } catch (error) {
      throw new Error(`Failed to cancel booking: ${error.message}`);
    }
  }

  // Update booking total amount
  async updateBookingTotal(bookingId) {
    try {
      const result = await knex('booking_items')
        .where('booking_id', bookingId)
        .sum('subtotal as total')
        .first();

      const total = result?.total || 0;

      await knex('bookings').where('id', bookingId).update({
        total_amount: total,
      });

      return total;
    } catch (error) {
      console.error('Error updating booking total:', error);
    }
  }

  // Get booking details
  async getBookingDetails(bookingId) {
    try {
      const booking = await knex('bookings').where('id', bookingId).first();
      if (!booking) throw new Error('Booking not found');

      const items = await knex('booking_items')
        .where('booking_id', bookingId)
        .join('products', 'booking_items.product_id', '=', 'products.id')
        .select('booking_items.*', 'products.name', 'products.product_type');

      return {
        ...booking,
        items: items.map(item => ({
          ...item,
          extras: JSON.parse(item.extras || '{}'),
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get booking details: ${error.message}`);
    }
  }

  // List user bookings
  async getUserBookings(userId, filters = {}) {
    try {
      let query = knex('bookings')
        .where('user_id', userId)
        .orderBy('booking_date', 'desc');

      if (filters.status) {
        query = query.where('status', filters.status);
      }

      if (filters.payment_status) {
        query = query.where('payment_status', filters.payment_status);
      }

      const bookings = await query.limit(filters.limit || 50).offset(filters.offset || 0);

      return bookings;
    } catch (error) {
      throw new Error(`Failed to list bookings: ${error.message}`);
    }
  }
}

module.exports = new BookingService();
