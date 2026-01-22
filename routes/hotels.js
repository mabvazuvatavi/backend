const express = require('express');
const router = express.Router();
const hotelService = require('../services/hotelService');
const { verifyToken } = require('../middleware/auth');
const Joi = require('joi');

// Validation schemas
const searchHotelsSchema = Joi.object({
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().min(Joi.ref('checkIn')).required(),
  destination: Joi.string().required(),
  rooms: Joi.number().integer().min(1).max(10).default(1),
  adults: Joi.number().integer().min(1).max(20).default(2),
  children: Joi.number().integer().min(0).max(10).default(0),
  childrenAges: Joi.array().items(Joi.number().integer().min(0).max(17)).default([]),
  page: Joi.number().integer().min(1).default(1),
  itemsPerPage: Joi.number().integer().min(1).max(50).default(20)
});

const bookingSchema = Joi.object({
  holder: Joi.object({
    name: Joi.string().required(),
    surname: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^(\+?254|0)?[17][0-9]{8,9}$/).required()
  }).required(),
  hotelCode: Joi.string().required(),
  rooms: Joi.array().items(
    Joi.object({
      code: Joi.string().required(),
      rateKey: Joi.string().required(),
      paxes: Joi.array().items(
        Joi.object({
          type: Joi.string().valid('AD', 'CH').required(),
          age: Joi.number().integer().min(0).max(99).required()
        })
      ).required()
    })
  ).required(),
  checkIn: Joi.date().iso().required(),
  checkOut: Joi.date().iso().min(Joi.ref('checkIn')).required(),
  clientReference: Joi.string().optional(),
  remark: Joi.string().max(500).optional()
});

/**
 * @route   GET /api/hotels/destinations
 * @desc    Get popular Kenyan destinations
 * @access  Public
 */
router.get('/destinations', async (req, res) => {
  try {
    const destinations = hotelService.getPopularKenyanDestinations();
    res.json({
      success: true,
      data: destinations
    });
  } catch (error) {
    console.error('Get destinations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch destinations',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hotels/bookings/guest
 * @desc    Create hotel booking (guest)
 * @access  Public
 */
router.post('/bookings/guest', async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    const booking = await hotelService.createBooking(value);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Create guest booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hotels/search
 * @desc    Search hotels in Kenya
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    const { error, value } = searchHotelsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Validate children ages match children count
    if (value.childrenAges.length !== value.children) {
      return res.status(400).json({
        success: false,
        message: 'Children ages must match number of children'
      });
    }

    // Validate check-in date is in the future
    const checkInDate = new Date(value.checkIn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (checkInDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Check-in date must be in the future'
      });
    }

    // Validate check-out is after check-in
    const checkOutDate = new Date(value.checkOut);
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    const results = await hotelService.searchHotels(value);
    
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('Hotel search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search hotels',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/:hotelCode
 * @desc    Get hotel details
 * @access  Public
 */
router.get('/:hotelCode', async (req, res) => {
  try {
    const { hotelCode } = req.params;
    const { checkIn, checkOut } = req.query;
    
    if (!hotelCode) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code is required'
      });
    }

    const hotelDetails = await hotelService.getHotelDetails(hotelCode, checkIn, checkOut);
    
    res.json({
      success: true,
      data: hotelDetails
    });
  } catch (error) {
    console.error('Get hotel details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel details',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/:hotelCode/availability
 * @desc    Check hotel availability
 * @access  Public
 */
router.get('/:hotelCode/availability', async (req, res) => {
  try {
    const { hotelCode } = req.params;
    const { checkIn, checkOut, rooms = 1, adults = 2, children = 0, childrenAges = [] } = req.query;

    if (!hotelCode || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code, check-in and check-out dates are required'
      });
    }

    // Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    
    if (checkInDate >= checkOutDate) {
      return res.status(400).json({
        success: false,
        message: 'Check-out date must be after check-in date'
      });
    }

    // Validate children ages
    let parsedChildrenAges = [];
    if (Array.isArray(childrenAges)) {
      parsedChildrenAges = childrenAges;
    } else if (typeof childrenAges === 'string' && childrenAges.trim()) {
      parsedChildrenAges = childrenAges.split(',').map(Number).filter(age => !isNaN(age));
    }
    
    // If no children, ages array should be empty
    if (parseInt(children) === 0) {
      parsedChildrenAges = [];
    } else if (parsedChildrenAges.length !== parseInt(children)) {
      return res.status(400).json({
        success: false,
        message: 'Children ages must match number of children'
      });
    }

    const availability = await hotelService.checkAvailability(hotelCode, {
      checkIn,
      checkOut,
      rooms: parseInt(rooms),
      adults: parseInt(adults),
      children: parseInt(children),
      childrenAges: parsedChildrenAges
    });
    
    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Check availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/:hotelCode/rooms
 * @desc    Get hotel room rates
 * @access  Public
 */
router.get('/:hotelCode/rooms', async (req, res) => {
  try {
    const { hotelCode } = req.params;
    const { checkIn, checkOut, rooms = 1, adults = 2, children = 0, childrenAges = [] } = req.query;

    if (!hotelCode || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code, check-in and check-out dates are required'
      });
    }

    const roomRates = await hotelService.getRoomRates(hotelCode, {
      checkIn,
      checkOut,
      rooms: parseInt(rooms),
      adults: parseInt(adults),
      children: parseInt(children),
      childrenAges: Array.isArray(childrenAges) ? childrenAges : 
               typeof childrenAges === 'string' ? childrenAges.split(',').map(Number) : []
    });
    
    res.json({
      success: true,
      data: roomRates
    });
  } catch (error) {
    console.error('Get room rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room rates',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/:hotelCode/images
 * @desc    Get hotel images
 * @access  Public
 */
router.get('/:hotelCode/images', async (req, res) => {
  try {
    const { hotelCode } = req.params;
    
    if (!hotelCode) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code is required'
      });
    }

    const images = await hotelService.getHotelImages(hotelCode);
    
    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('Get hotel images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel images',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/:hotelCode/reviews
 * @desc    Get hotel reviews
 * @access  Public
 */
router.get('/:hotelCode/reviews', async (req, res) => {
  try {
    const { hotelCode } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    if (!hotelCode) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code is required'
      });
    }

    const reviews = await hotelService.getHotelReviews(hotelCode);
    
    res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Get hotel reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch hotel reviews',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hotels/bookings
 * @desc    Create hotel booking
 * @access  Private
 */
router.post('/bookings', verifyToken, async (req, res) => {
  try {
    const { error, value } = bookingSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }

    // Add user ID to booking data
    value.userId = req.user.id;

    const booking = await hotelService.createBooking(value);
    
    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/bookings/public/:bookingReference
 * @desc    Get booking details (guest/public)
 * @access  Public
 */
router.get('/bookings/public/:bookingReference', async (req, res) => {
  try {
    const { bookingReference } = req.params;

    if (!bookingReference) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required'
      });
    }

    const bookingDetails = await hotelService.getBookingDetails(bookingReference);

    res.json({
      success: true,
      data: bookingDetails
    });
  } catch (error) {
    console.error('Get public booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/bookings/:bookingReference
 * @desc    Get booking details
 * @access  Private
 */
router.get('/bookings/:bookingReference', verifyToken, async (req, res) => {
  try {
    const { bookingReference } = req.params;
    
    if (!bookingReference) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required'
      });
    }

    const bookingDetails = await hotelService.getBookingDetails(bookingReference);
    
    // Verify booking belongs to authenticated user (optional, based on your business logic)
    // This would require storing booking references in your database
    
    res.json({
      success: true,
      data: bookingDetails
    });
  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch booking details',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/hotels/bookings/:bookingReference
 * @desc    Cancel hotel booking
 * @access  Private
 */
router.delete('/bookings/:bookingReference', verifyToken, async (req, res) => {
  try {
    const { bookingReference } = req.params;
    const { cancellationReason } = req.body;
    
    if (!bookingReference) {
      return res.status(400).json({
        success: false,
        message: 'Booking reference is required'
      });
    }

    const result = await hotelService.cancelBooking(bookingReference, cancellationReason);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: result
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/bookings
 * @desc    Get user's hotel bookings
 * @access  Private
 */
router.get('/bookings', verifyToken, async (req, res) => {
  try {
    // This would require implementing a database table to store user bookings
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      message: 'User bookings feature requires database implementation'
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/favorites
 * @desc    Get user's favorite hotels
 * @access  Private
 */
router.get('/favorites', verifyToken, async (req, res) => {
  try {
    // This would require implementing a database table to store user favorites
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      message: 'User favorites feature requires database implementation'
    });
  } catch (error) {
    console.error('Get user favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user favorites',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/hotels/favorites
 * @desc    Add hotel to favorites
 * @access  Private
 */
router.post('/favorites', verifyToken, async (req, res) => {
  try {
    const { hotelCode } = req.body;
    
    if (!hotelCode) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code is required'
      });
    }

    // This would require implementing database logic to store favorites
    // For now, return success as placeholder
    res.status(201).json({
      success: true,
      message: 'Hotel added to favorites successfully'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add hotel to favorites',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/hotels/favorites/:hotelCode
 * @desc    Remove hotel from favorites
 * @access  Private
 */
router.delete('/favorites/:hotelCode', verifyToken, async (req, res) => {
  try {
    const { hotelCode } = req.params;
    
    if (!hotelCode) {
      return res.status(400).json({
        success: false,
        message: 'Hotel code is required'
      });
    }

    // This would require implementing database logic to remove favorites
    // For now, return success as placeholder
    res.json({
      success: true,
      message: 'Hotel removed from favorites successfully'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove hotel from favorites',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/hotels/bookings
 * @desc    Get user's hotel bookings
 * @access  Private
 */
router.get('/bookings', verifyToken, async (req, res) => {
  try {
    // This would require implementing a database table to store user bookings
    // For now, return empty array as placeholder
    res.json({
      success: true,
      data: [],
      message: 'User bookings feature requires database implementation'
    });
  } catch (error) {
    console.error('Get user bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user bookings',
      error: error.message
    });
  }
});

module.exports = router;
