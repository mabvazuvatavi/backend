const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const auditService = require('./auditService');
const ticketService = require('./ticketService');
const paymentService = require('./paymentService');
const approvalPaymentService = require('./approvalPaymentService');
const seatService = require('./seatService');
const EmailService = require('./emailService');

const emailService = new EmailService();

class CartService {
  /**
   * Add item to cart (supports event, flight, bus, hotel via item_type)
   */
  async addToCart(userId, cartItem) {
    try {
      const {
        // Legacy event fields
        event_id,
        seat_ids = [],
        seat_numbers = [],
        ticket_type = 'general',
        quantity = 1,
        price,
        metadata,
        // New unified fields (Option 2)
        item_type = 'event',
        item_ref_id,
        item_title
      } = cartItem;

      let unitPrice = price;
      let finalEventId = event_id;

      // Handle different item types
      if (item_type === 'event' || (!item_type && event_id)) {
        // Verify event exists
        const event = await db('events')
          .where('id', event_id)
          .whereNull('deleted_at')
          .first();

        if (!event) {
          throw new Error('Event not found');
        }
        unitPrice = price ?? event.base_price ?? 0;
      } else {
        // For non-event items (flight, bus, hotel), event_id will be null
        finalEventId = null;
        unitPrice = price ?? 0;
      }

      // Get or create cart
      let cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        const cartId = uuidv4();
        cart = {
          id: cartId,
          user_id: userId,
          status: 'active',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        };

        await db('shopping_carts').insert(cart);
      }

      // Add item to cart
      const cartItemId = uuidv4();
      const totalPrice = unitPrice * quantity;

      let mergedMetadata = metadata ? (typeof metadata === 'string' ? JSON.parse(metadata) : metadata) : {};

      // If seat_ids are provided (event only), reserve them and attach reservation_id to metadata
      if (item_type === 'event' && Array.isArray(seat_ids) && seat_ids.length > 0) {
        const reservation = await seatService.reserveSeats(finalEventId, seat_ids, userId);
        mergedMetadata = {
          ...(mergedMetadata || {}),
          reservation_id: reservation.reservationId
        };
      }

      const newItem = {
        id: cartItemId,
        cart_id: cart.id,
        event_id: finalEventId,
        item_type: item_type || 'event',
        item_ref_id: item_ref_id || null,
        item_title: item_title || null,
        seat_numbers: Array.isArray(seat_numbers) && seat_numbers.length > 0 ? seat_numbers : null,
        ticket_type,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        metadata: Object.keys(mergedMetadata).length > 0 ? JSON.stringify(mergedMetadata) : null
      };

      await db('shopping_cart_items').insert(newItem);

      // Update cart total
      const total = await this.calculateCartTotal(cart.id);
      await db('shopping_carts')
        .where('id', cart.id)
        .update({ total_amount: total });

      return {
        cartId: cart.id,
        item: newItem,
        cartTotal: total
      };
    } catch (error) {
      console.error('Add to cart error:', error);
      throw error;
    }
  }

  /**
   * Get user's cart
   */
  async getCart(userId) {
    try {
      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        return null;
      }

      const items = await db('shopping_cart_items')
        .leftJoin('events', 'shopping_cart_items.event_id', 'events.id')
        .where('shopping_cart_items.cart_id', cart.id)
        .where(function() {
          this.whereNull('shopping_cart_items.status')
            .orWhereNot('shopping_cart_items.status', 'checked_out');
        })
        .select([
          'shopping_cart_items.*',
          'events.title as event_title',
          'events.start_date as event_date'
        ]);

      // Enrich non-event items with their titles from item_title column
      // (item_title is stored at cart add time for flights/buses/hotels)

      // Parse seat numbers and metadata, use item_title for non-events
      const parsedItems = items.map(item => {
        const itemType = item.item_type || 'event';
        let title = item.event_title;
        
        // For non-event items, use item_title from the cart item
        if (itemType !== 'event' && item.item_title) {
          title = item.item_title;
        }
        
        return {
          ...item,
          title: title,
          seat_numbers: item.seat_numbers
            ? (typeof item.seat_numbers === 'string' ? JSON.parse(item.seat_numbers) : item.seat_numbers)
            : [],
          metadata: item.metadata
            ? (typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata)
            : null
        };
      });

      return {
        ...cart,
        items: parsedItems
      };
    } catch (error) {
      console.error('Get cart error:', error);
      throw error;
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(userId, itemId) {
    try {
      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        throw new Error('Cart not found');
      }

      const item = await db('shopping_cart_items')
        .where('id', itemId)
        .where('cart_id', cart.id)
        .first();

      if (item?.metadata) {
        try {
          const parsed = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
          if (parsed?.reservation_id) {
            await seatService.releaseReservation(parsed.reservation_id, userId);
          }
        } catch (e) {
          // best-effort
        }
      }

      await db('shopping_cart_items')
        .where('id', itemId)
        .where('cart_id', cart.id)
        .delete();

      // Update cart total
      const total = await this.calculateCartTotal(cart.id);
      await db('shopping_carts')
        .where('id', cart.id)
        .update({ total_amount: total });

      return { cartTotal: total };
    } catch (error) {
      console.error('Remove from cart error:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(userId, itemId, quantity) {
    try {
      if (quantity < 1) {
        return await this.removeFromCart(userId, itemId);
      }

      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        throw new Error('Cart not found');
      }

      const item = await db('shopping_cart_items')
        .where('id', itemId)
        .where('cart_id', cart.id)
        .first();

      if (!item) {
        throw new Error('Cart item not found');
      }

      const unitPrice = Number(item.unit_price || 0);
      const newTotalPrice = unitPrice * quantity;

      await db('shopping_cart_items')
        .where('id', itemId)
        .update({
          quantity,
          total_price: newTotalPrice
        });

      // Update cart total
      const total = await this.calculateCartTotal(cart.id);
      await db('shopping_carts')
        .where('id', cart.id)
        .update({ total_amount: total });

      return { cartTotal: total };
    } catch (error) {
      console.error('Update quantity error:', error);
      throw error;
    }
  }

  /**
   * Clear cart
   */
  async clearCart(userId) {
    try {
      // Try to clear database cart if table exists
      try {
        const cart = await db('shopping_carts')
          .where('user_id', userId)
          .where('status', 'active')
          .first();

        if (cart) {
          const items = await db('shopping_cart_items').where('cart_id', cart.id);
          for (const item of items) {
            if (!item?.metadata) continue;
            try {
              const parsed = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
              if (parsed?.reservation_id) {
                await seatService.releaseReservation(parsed.reservation_id, userId);
              }
            } catch (e) {
              // best-effort
            }
          }

          await db('shopping_cart_items')
            .where('cart_id', cart.id)
            .delete();

          await db('shopping_carts')
            .where('id', cart.id)
            .update({ total_amount: 0 });
        }
      } catch (tableError) {
        // If shopping_carts table doesn't exist, that's OK
        // The cart is managed on the frontend via CartContext
        if (tableError.code === '42P01') {
          // Table doesn't exist, skip
          console.log('Note: shopping_carts table not found, skipping database cart clear');
        } else {
          throw tableError;
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  }

  /**
   * Calculate cart total
   */
  async calculateCartTotal(cartId) {
    try {
      const result = await db('shopping_cart_items')
        .where('cart_id', cartId)
        .sum('total_price as total')
        .first();

      return result?.total || 0;
    } catch (error) {
      console.error('Calculate total error:', error);
      throw error;
    }
  }

  /**
   * Apply discount code
   */
  async applyDiscount(userId, discountCode) {
    try {
      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        throw new Error('Cart not found');
      }

      // Get discount
      const discount = await db('discount_codes')
        .where('code', discountCode.toUpperCase())
        .where('is_active', true)
        .where('expires_at', '>', new Date())
        .first();

      if (!discount) {
        throw new Error('Invalid or expired discount code');
      }

      // Check if user has already used this code
      if (discount.max_uses_per_user) {
        const usageCount = await db('shopping_carts')
          .where('user_id', userId)
          .where('discount_code', discountCode.toUpperCase())
          .count('id as count')
          .first();

        if (usageCount.count >= discount.max_uses_per_user) {
          throw new Error('You have already used this discount code');
        }
      }

      // Apply discount
      await db('shopping_carts')
        .where('id', cart.id)
        .update({
          discount_code: discountCode.toUpperCase(),
          discount_percentage: discount.discount_percentage,
          discount_amount: Math.floor(cart.total_amount * (discount.discount_percentage / 100))
        });

      // Recalculate total with discount
      const discountAmount = Math.floor(cart.total_amount * (discount.discount_percentage / 100));
      const finalTotal = cart.total_amount - discountAmount;

      return {
        discountCode,
        discountPercentage: discount.discount_percentage,
        discountAmount,
        finalTotal
      };
    } catch (error) {
      console.error('Apply discount error:', error);
      throw error;
    }
  }

  /**
   * Remove discount code
   */
  async removeDiscount(userId) {
    try {
      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart) {
        throw new Error('Cart not found');
      }

      await db('shopping_carts')
        .where('id', cart.id)
        .update({
          discount_code: null,
          discount_percentage: 0,
          discount_amount: 0
        });

      return { success: true };
    } catch (error) {
      console.error('Remove discount error:', error);
      throw error;
    }
  }
}

class CheckoutService {
  /**
   * Initiate checkout
   */
  async initiateCheckout(userId, checkoutData) {
    try {
      const { payment_method = 'stripe', billing_info } = checkoutData;

      // Get cart
      const cart = await db('shopping_carts')
        .where('user_id', userId)
        .where('status', 'active')
        .first();

      if (!cart || !cart.total_amount || cart.total_amount <= 0) {
        throw new Error('Cart is empty');
      }

      if (!cart.items) {
        const items = await db('shopping_cart_items')
          .where('cart_id', cart.id);
        cart.items = items;
      }

      if (!billing_info) {
        throw new Error('Billing information is required');
      }

      // Calculate final amount
      const finalAmount = cart.total_amount - (cart.discount_amount || 0);

      // Create checkout session
      const checkoutId = uuidv4();
      const checkout = {
        id: checkoutId,
        user_id: userId,
        cart_id: cart.id,
        payment_method,
        subtotal: cart.total_amount,
        discount_amount: cart.discount_amount || 0,
        total_amount: finalAmount,
        billing_info,
        status: 'pending',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
      };

      const [createdCheckout] = await db('checkouts')
        .insert(checkout)
        .returning('*');

      // Log audit
      await auditService.log({
        userId,
        action: 'CHECKOUT_INITIATED',
        resource: 'checkouts',
        resourceId: checkoutId,
        newValues: {
          totalAmount: finalAmount,
          itemCount: cart.items.length
        }
      });

      return {
        checkoutId,
        totalAmount: finalAmount,
        paymentMethod: payment_method
      };
    } catch (error) {
      console.error('Initiate checkout error:', error);
      throw error;
    }
  }

  /**
   * Complete checkout and create order
   */
  async completeCheckout(userId, checkoutId, paymentData) {
    try {
      const { payment_intent_id, stripe_token } = paymentData;

      // Get checkout
      const checkout = await db('checkouts')
        .where('id', checkoutId)
        .where('user_id', userId)
        .where('status', 'pending')
        .first();

      if (!checkout) {
        throw new Error('Checkout not found or already processed');
      }

      // Verify payment
      const payment = await db('payments')
        .where('id', payment_intent_id)
        .where('user_id', userId)
        .where('status', 'completed')
        .first();

      if (!payment) {
        throw new Error('Payment not found or not completed');
      }

      const paidAmount = Number(payment.total_amount ?? payment.amount ?? 0);
      const orderTotal = Number(checkout.total_amount ?? 0);
      const balanceDue = Math.max(0, orderTotal - paidAmount);
      const isFullyPaid = balanceDue <= 0;

      // Get cart items first
      const cartItems = await db('shopping_cart_items')
        .where('cart_id', checkout.cart_id);

      // Validate deposit eligibility if not fully paid
      if (!isFullyPaid) {
        // Get unique event IDs from cart items
        const eventIds = [...new Set(cartItems.map(item => item.event_id))];
        
        // Fetch events with deposit policies
        const events = await db('events')
          .whereIn('id', eventIds)
          .select([
            'id',
            'allow_deposit',
            'deposit_type',
            'deposit_value',
            'min_deposit_amount',
            'deposit_due_by'
          ]);

        // Check if all events allow deposits
        const eventsWithoutDeposit = events.filter(event => !event.allow_deposit);
        if (eventsWithoutDeposit.length > 0) {
          const eventTitles = await db('events')
            .whereIn('id', eventsWithoutDeposit.map(e => e.id))
            .pluck('title');
          throw new Error(
            `Deposits are not allowed for the following events: ${eventTitles.join(', ')}. ` +
            'Please pay the full amount to continue.'
          );
        }

        // Validate minimum deposit amounts
        for (const event of events) {
          if (event.allow_deposit) {
            let requiredMinDeposit = 0;
            
            // Calculate minimum deposit based on event's deposit policy
            const eventSubtotal = cartItems
              .filter(item => item.event_id === event.id)
              .reduce((sum, item) => sum + (item.price * item.quantity), 0);

            if (event.deposit_type === 'percentage') {
              requiredMinDeposit = eventSubtotal * (event.deposit_value / 100);
            } else {
              requiredMinDeposit = event.deposit_value;
            }

            // Ensure minimum deposit is met
            requiredMinDeposit = Math.max(requiredMinDeposit, event.min_deposit_amount || 0);

            if (paidAmount < requiredMinDeposit) {
              const eventTitle = await db('events')
                .where('id', event.id)
                .pluck('title')
                .first();
              throw new Error(
                `Minimum deposit of $${requiredMinDeposit.toFixed(2)} required for "${eventTitle}". ` +
                `Current payment: $${paidAmount.toFixed(2)}`
              );
            }

            // Check if deposit due date has passed
            if (event.deposit_due_by && new Date(event.deposit_due_by) < new Date()) {
              const eventTitle = await db('events')
                .where('id', event.id)
                .pluck('title')
                .first();
              throw new Error(
                `Deposit deadline has passed for "${eventTitle}". ` +
                'Please pay the full amount to continue.'
              );
            }
          }
        }
      }

      // Create order
      const orderId = uuidv4();
      const order = {
        id: orderId,
        user_id: userId,
        checkout_id: checkoutId,
        payment_id: payment_intent_id,
        subtotal: checkout.subtotal,
        discount_amount: checkout.discount_amount,
        total_amount: checkout.total_amount,
        amount_paid: Math.min(paidAmount, orderTotal),
        balance_due: balanceDue,
        status: isFullyPaid ? 'confirmed' : 'partially_paid',
        billing_info: checkout.billing_info,
        metadata: {
          reservation_ids: [],
          payment_id: payment_intent_id,
          is_fully_paid: isFullyPaid
        },
        created_at: new Date()
      };

      const [createdOrder] = await db('orders')
        .insert(order)
        .returning('*');

      // Create tickets/reservations for each cart item
      const ticketsCreated = [];
      const eventRevenue = {}; // Track revenue per organizer
      const ticketsByEvent = {}; // Track ticket quantities per event
      const busBookingsCreated = [];
      const flightBookingsCreated = [];
      const hotelBookingsCreated = [];

      const reservationsToConfirm = [];

      for (const cartItem of cartItems) {
        const cartItemMetadata = cartItem.metadata
          ? (typeof cartItem.metadata === 'string' ? JSON.parse(cartItem.metadata) : cartItem.metadata)
          : null;

        if (cartItemMetadata?.reservation_id) {
          reservationsToConfirm.push({ reservationId: cartItemMetadata.reservation_id });
        }

        // Check item type using the item_type column (Option 2 approach)
        const itemType = cartItem.item_type || 'event';

        try {
          if (itemType === 'event') {
            // Original event ticket logic
            const seatNumbers = cartItem.seat_numbers
              ? (typeof cartItem.seat_numbers === 'string' ? JSON.parse(cartItem.seat_numbers) : cartItem.seat_numbers)
              : [];

            for (let i = 0; i < cartItem.quantity; i++) {
              const created = await ticketService.createTicket({
                event_id: cartItem.event_id,
                order_id: orderId,
                ticket_type: cartItem.ticket_type,
                price: cartItem.unit_price,
                status: isFullyPaid ? 'confirmed' : 'reserved',
                user_id: userId,
                seat_number: Array.isArray(seatNumbers) ? (seatNumbers[i] || null) : null
              });
              ticketsCreated.push(created.ticket);

              // Track revenue for each event
              if (!eventRevenue[cartItem.event_id]) {
                eventRevenue[cartItem.event_id] = 0;
              }
              eventRevenue[cartItem.event_id] += Number(cartItem.unit_price || 0);

              // Track ticket quantities per event
              if (!ticketsByEvent[cartItem.event_id]) {
                ticketsByEvent[cartItem.event_id] = 0;
              }
              ticketsByEvent[cartItem.event_id]++;
            }
          } else if (itemType === 'bus') {
            // Use item_ref_id for bus ID (Option 2 approach)
            const busId = cartItem.item_ref_id;
            const busMetadata = cartItemMetadata || {};
            
            // Create bus booking record
            const busBooking = await db('bus_bookings')
              .insert({
                id: uuidv4(),
                bus_id: busId,
                user_id: userId,
                order_id: orderId,
                seats_count: cartItem.quantity,
                passenger_details: busMetadata.passenger_details 
                  ? JSON.stringify(busMetadata.passenger_details) 
                  : '[]',
                total_price: cartItem.unit_price * cartItem.quantity,
                status: isFullyPaid ? 'confirmed' : 'reserved',
                created_at: new Date()
              })
              .returning('*');

            busBookingsCreated.push(busBooking[0]);

            // Update bus available seats
            await db('buses')
              .where('id', busId)
              .decrement('available_seats', cartItem.quantity);

            // Create ticket record for bus booking (for unified ticket display)
            const created = await ticketService.createUniversalTicket({
              order_id: orderId,
              item_type: 'bus',
              item_id: busId,
              item_title: cartItem.item_title || 'Bus Booking',
              price: cartItem.unit_price,
              status: isFullyPaid ? 'confirmed' : 'reserved',
              user_id: userId,
              quantity: cartItem.quantity,
              metadata: {
                bus_id: busId,
                destination: busMetadata.destination,
                departure_time: busMetadata.departure_time,
                seats: cartItem.quantity,
                passengers: busMetadata.passenger_details
              }
            });
            if (created) ticketsCreated.push(created);
          } else if (itemType === 'flight') {
            // Use item_ref_id for flight offer ID (Option 2 approach)
            const flightOfferId = cartItem.item_ref_id;
            const flightMetadata = cartItemMetadata || {};
            
            // Create flight booking record
            const flightBooking = await db('flight_bookings')
              .insert({
                id: uuidv4(),
                flight_offer_id: flightOfferId, // Store offer ID instead of flight_id
                user_id: userId,
                order_id: orderId,
                passengers_count: cartItem.quantity,
                passenger_details: flightMetadata.passengers 
                  ? JSON.stringify(flightMetadata.passengers) 
                  : '[]',
                contact_info: flightMetadata.contactInfo
                  ? JSON.stringify(flightMetadata.contactInfo)
                  : null,
                flight_details: JSON.stringify(flightMetadata.flightOffer || {}),
                total_price: cartItem.unit_price * cartItem.quantity,
                status: isFullyPaid ? 'confirmed' : 'reserved',
                created_at: new Date()
              })
              .returning('*');

            flightBookingsCreated.push(flightBooking[0]);

            // Create ticket record for flight booking
            const created = await ticketService.createUniversalTicket({
              order_id: orderId,
              item_type: 'flight',
              item_id: flightOfferId,
              item_title: cartItem.item_title || 'Flight Booking',
              price: cartItem.unit_price,
              status: isFullyPaid ? 'confirmed' : 'reserved',
              user_id: userId,
              quantity: cartItem.quantity,
              metadata: {
                flight_offer_id: flightOfferId,
                departure: flightMetadata.departure,
                arrival: flightMetadata.arrival,
                airline: flightMetadata.airline,
                passengers: cartItem.quantity,
                passenger_details: flightMetadata.passengers,
                contact_info: flightMetadata.contactInfo
              }
            });
            if (created) ticketsCreated.push(created);
          } else if (itemType === 'hotel') {
            // Use item_ref_id for hotel code (Option 2 approach)
            const hotelCode = cartItem.item_ref_id;
            const hotelMetadata = cartItemMetadata || {};
            
            // Create hotel booking record
            const hotelBooking = await db('hotel_bookings')
              .insert({
                id: uuidv4(),
                hotel_code: hotelCode, // Store hotel code instead of hotel_id
                user_id: userId,
                order_id: orderId,
                check_in_date: hotelMetadata.checkIn,
                check_out_date: hotelMetadata.checkOut,
                rooms_count: cartItem.quantity,
                guest_details: hotelMetadata.guest_details 
                  ? JSON.stringify(hotelMetadata.guest_details) 
                  : '[]',
                total_price: cartItem.unit_price * cartItem.quantity,
                status: isFullyPaid ? 'confirmed' : 'reserved',
                created_at: new Date()
              })
              .returning('*');

            hotelBookingsCreated.push(hotelBooking[0]);

            // Create ticket record for hotel booking
            const created = await ticketService.createUniversalTicket({
              order_id: orderId,
              item_type: 'hotel',
              item_id: hotelCode,
              item_title: cartItem.item_title || 'Hotel Booking',
              price: cartItem.unit_price,
              status: isFullyPaid ? 'confirmed' : 'reserved',
              user_id: userId,
              quantity: cartItem.quantity,
              metadata: {
                hotel_code: hotelCode,
                check_in: hotelMetadata.checkIn,
                check_out: hotelMetadata.checkOut,
                rooms: cartItem.quantity,
                location: hotelMetadata.location,
                guest_details: cartItem.metadata?.guest_details
              }
            });
            if (created) ticketsCreated.push(created);
          }
        } catch (itemError) {
          console.error(`Error processing ${itemType} item in checkout:`, itemError);
          // Log but don't fail the entire checkout
        }
      }

      // Update event ticket availability (for event items only)
      for (const eventId in ticketsByEvent) {
        await db('events')
          .where('id', eventId)
          .increment('sold_tickets', ticketsByEvent[eventId])
          .decrement('available_tickets', ticketsByEvent[eventId]);
      }

      // Record earnings for organizers of each event
      for (const eventId in eventRevenue) {
        try {
          const event = await db('events')
            .where('id', eventId)
            .select('organizer_id')
            .first();

          if (event && event.organizer_id) {
            await approvalPaymentService.addEarnings(
              event.organizer_id,
              eventRevenue[eventId],
              'ticket_sale'
            );
          }
        } catch (earnError) {
          console.error(`Error recording earnings for event ${eventId}:`, earnError);
          // Don't fail the checkout if earnings recording fails
        }
      }

      // Update checkout status
      await db('checkouts')
        .where('id', checkoutId)
        .update({
          status: 'completed',
          order_id: orderId,
          completed_at: new Date()
        });

      // Soft-delete cart items (mark as checked out) and move cart to completed
      // Items are preserved for audit but won't appear in active cart queries
      await db('shopping_cart_items')
        .where('cart_id', checkout.cart_id)
        .update({ 
          status: 'checked_out',
          checked_out_at: new Date(),
          order_id: orderId
        });
      
      await db('shopping_carts')
        .where('id', checkout.cart_id)
        .update({ 
          status: 'completed', 
          completed_at: new Date(),
          order_id: orderId
        });

      // Store reservation IDs on order metadata
      try {
        const reservationIds = reservationsToConfirm.map(r => r.reservationId);
        const currentMeta = createdOrder?.metadata
          ? (typeof createdOrder.metadata === 'string' ? JSON.parse(createdOrder.metadata) : createdOrder.metadata)
          : {};
        await db('orders')
          .where('id', orderId)
          .update({
            metadata: {
              ...(currentMeta || {}),
              reservation_ids: reservationIds,
              is_fully_paid: isFullyPaid
            }
          });
      } catch (e) {
        // best-effort
      }

      // Confirm seating reservations only when fully paid
      if (isFullyPaid) {
        for (const r of reservationsToConfirm) {
          await seatService.confirmPurchase(r.reservationId, payment_intent_id, userId);
        }
      }

      // Log audit
      await auditService.log({
        userId,
        action: 'CHECKOUT_COMPLETED',
        resource: 'checkouts',
        resourceId: checkoutId,
        newValues: {
          orderId,
          totalAmount: checkout.total_amount,
          ticketsCreated: ticketsCreated.length
        }
      });

      try {
        const user = await db('users')
          .where('id', userId)
          .select('id', 'first_name', 'last_name', 'email')
          .first();

        if (user?.email) {
          emailService.sendOrderTicketsEmail(user, orderId, ticketsCreated, {
            itemsText: 'tickets'
          }).catch(err => {
            console.warn('Failed to send order ticket email:', err.message);
          });
        }
      } catch (emailError) {
        console.warn('Ticket email setup failed:', emailError.message);
      }

      return {
        orderId,
        ticketsCreated: ticketsCreated.length,
        totalAmount: checkout.total_amount,
        amountPaid: Math.min(paidAmount, orderTotal),
        balanceDue,
        status: isFullyPaid ? 'confirmed' : 'partially_paid'
      };
    } catch (error) {
      console.error('Complete checkout error:', error);
      throw error;
    }
  }

  /**
   * Get checkout details
   */
  async getCheckout(checkoutId, userId) {
    try {
      const checkout = await db('checkouts')
        .where('id', checkoutId)
        .where('user_id', userId)
        .first();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Get related cart items
      const items = await db('shopping_cart_items')
        .where('cart_id', checkout.cart_id);

      return {
        ...checkout,
        items,
        billingInfo: typeof checkout.billing_info === 'string'
          ? JSON.parse(checkout.billing_info)
          : checkout.billing_info
      };
    } catch (error) {
      console.error('Get checkout error:', error);
      throw error;
    }
  }

  /**
   * Cancel checkout
   */
  async cancelCheckout(checkoutId, userId) {
    try {
      const checkout = await db('checkouts')
        .where('id', checkoutId)
        .where('user_id', userId)
        .first();

      if (!checkout) {
        throw new Error('Checkout not found');
      }

      // Release any seat reservations tied to cart items
      if (checkout.cart_id) {
        const items = await db('shopping_cart_items').where('cart_id', checkout.cart_id);
        for (const item of items) {
          if (!item?.metadata) continue;
          try {
            const parsed = typeof item.metadata === 'string' ? JSON.parse(item.metadata) : item.metadata;
            if (parsed?.reservation_id) {
              await seatService.releaseReservation(parsed.reservation_id, userId);
            }
          } catch (e) {
            // best-effort
          }
        }
      }

      await db('checkouts')
        .where('id', checkoutId)
        .update({
          status: 'cancelled',
          cancelled_at: new Date()
        });

      // Log audit
      await auditService.log({
        userId,
        action: 'CHECKOUT_CANCELLED',
        resource: 'checkouts',
        resourceId: checkoutId
      });

      return { success: true };
    } catch (error) {
      console.error('Cancel checkout error:', error);
      throw error;
    }
  }
}

module.exports = {
  CartService: new CartService(),
  CheckoutService: new CheckoutService()
};
