const express = require('express');
const router = express.Router();
const FlightService = require('../services/amadeus/flightService');
const { auth } = require('../middleware/auth');

const flightService = new FlightService();

/**
 * @route   POST /api/flights/search
 * @desc    Search for flights
 * @access  Public
 */
router.post('/search', async (req, res) => {
  try {
    const { origin, destination, departureDate, returnDate, adults, children, infants, travelClass } = req.body;

    // Validate required fields
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({
        success: false,
        message: 'Origin, destination, and departure date are required'
      });
    }

    // Validate dates
    const depDate = new Date(departureDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (depDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Departure date must be in the future'
      });
    }

    if (returnDate) {
      const retDate = new Date(returnDate);
      if (retDate <= depDate) {
        return res.status(400).json({
          success: false,
          message: 'Return date must be after departure date'
        });
      }
    }

    const searchParams = {
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      departureDate: departureDate,
      returnDate: returnDate,
      adults: parseInt(adults) || 1,
      children: parseInt(children) || 0,
      infants: parseInt(infants) || 0,
      travelClass: travelClass || 'ECONOMY'
    };

    const result = await flightService.searchFlights(searchParams);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Flight search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search flights',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/flights/:offerId
 * @desc    Get flight details
 * @access  Public
 */
router.get('/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const { flightIndex } = req.query;

    if (!offerId) {
      return res.status(400).json({
        success: false,
        message: 'Flight offer ID is required'
      });
    }

    const flightDetails = await flightService.getFlightDetails(offerId, flightIndex || 0);

    res.json({
      success: true,
      data: flightDetails
    });
  } catch (error) {
    console.error('Get flight details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flight details',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/flights/:offerId/book
 * @desc    Book a flight
 * @access  Public
 */
router.post('/:offerId/book', async (req, res) => {
  try {
    const { offerId } = req.params;
    const { flightOffer, passengers, contactInfo } = req.body;

    if (!flightOffer || !passengers || !contactInfo) {
      return res.status(400).json({
        success: false,
        message: 'Flight offer data, passengers, and contact info are required'
      });
    }

    const bookingData = {
      flightOffer,  // Pass complete flight offer object
      passengers,
      contactInfo
    };

    const bookingResult = await flightService.createBooking(bookingData);

    res.json({
      success: true,
      data: bookingResult
    });
  } catch (error) {
    console.error('Flight booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to book flight',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/flights/:flightNumber/status
 * @desc    Get flight status
 * @access  Public
 */
router.get('/:flightNumber/status', async (req, res) => {
  try {
    const { flightNumber } = req.params;
    const { date } = req.query;

    if (!flightNumber || !date) {
      return res.status(400).json({
        success: false,
        message: 'Flight number and date are required'
      });
    }

    const status = await flightService.getFlightStatus(flightNumber, date);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Get flight status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch flight status',
      error: error.message
    });
  }
});

module.exports = router;
