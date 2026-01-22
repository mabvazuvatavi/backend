const axios = require('axios');
const crypto = require('crypto');

class FlightService {
  constructor() {
    this.apiKey = process.env.AMADEUS_API_KEY;
    this.apiSecret = process.env.AMADEUS_API_SECRET;
    this.endpoint = process.env.AMADEUS_ENDPOINT || 'https://test.api.amadeus.com';
    this.currency = process.env.AMADEUS_CURRENCY || 'KES';
    this.countryCode = process.env.AMADEUS_COUNTRY_CODE || 'KE';
    this.accessToken = null;
    this.tokenExpiry = null;
    
    // Debug logging
    console.log('Amadeus Flight API Configuration:');
    console.log('API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('API Secret:', this.apiSecret ? `${this.apiSecret.substring(0, 4)}...` : 'NOT SET');
    console.log('Endpoint:', this.endpoint);
  }

  /**
   * Get Amadeus Bearer token using OAuth2 Client Credentials flow
   * Correct format: form-urlencoded body with client_id and client_secret
   */
  async getAccessToken() {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry > Date.now()) {
      console.log('Using cached Amadeus token');
      return this.accessToken;
    }

    try {
      // Use URLSearchParams for proper form-urlencoded format
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.apiKey);
      params.append('client_secret', this.apiSecret);
      
      console.log('Requesting new Amadeus access token...');
      console.log('- Endpoint:', `${this.endpoint}/v1/security/oauth2/token`);
      console.log('- Client ID:', this.apiKey.substring(0, 8) + '...');
      
      const response = await axios({
        method: 'POST',
        url: `${this.endpoint}/v1/security/oauth2/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params.toString(),
        timeout: 10000
      });

      console.log('✓ OAuth Response Status:', response.status);
      console.log('✓ Response Keys:', Object.keys(response.data).join(', '));
      
      if (!response.data.access_token) {
        throw new Error(`No access_token in OAuth response. Response: ${JSON.stringify(response.data)}`);
      }
      
      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiry for safety
      const expiresIn = response.data.expires_in || 1800;
      this.tokenExpiry = Date.now() + (expiresIn - 300) * 1000;
      
      console.log('✓ Amadeus access token obtained successfully');
      console.log('  - Token type:', response.data.token_type);
      console.log('  - Expires in:', expiresIn, 'seconds');
      console.log('  - Token (first 20 chars):', this.accessToken.substring(0, 20) + '...');
      
      return this.accessToken;
    } catch (error) {
      console.error('❌ Failed to get Amadeus access token:');
      console.error('   Status:', error.response?.status);
      console.error('   Error:', error.response?.data?.error);
      console.error('   Description:', error.response?.data?.error_description);
      console.error('   Message:', error.message);
      throw new Error(`Failed to authenticate with Amadeus API: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Make authenticated request to Amadeus API
   */
  async makeRequest(method, path, data = null, params = {}) {
    try {
      const token = await this.getAccessToken();
      
      console.log('Token obtained:', token ? `${token.substring(0, 20)}...` : 'NONE');
      
      const config = {
        method,
        url: `${this.endpoint}${path}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      };

      console.log('Request Config:');
      console.log('- URL:', config.url);
      console.log('- Method:', config.method);
      console.log('- Auth Header:', config.headers.Authorization ? `Bearer ${token.substring(0, 20)}...` : 'MISSING');

      if (method.toUpperCase() !== 'GET' && data) {
        config.data = data;
      }

      if (Object.keys(params).length > 0) {
        config.params = params;
        console.log('- Query Params:', Object.keys(params).map(k => `${k}=${params[k]}`).join(', '));
      }

      console.log(`Making request: ${method} ${path}`);
      const response = await axios(config);
      
      console.log(`✓ Amadeus API ${path} request successful`);
      return response.data;
    } catch (error) {
      console.error('Amadeus API Error:', error.response?.data || error.message);
      console.error('Error Status:', error.response?.status);
      console.error('Error Details:', error.response?.data?.errors);
      
      // Log the actual auth header being sent (for debugging)
      if (error.config?.headers?.Authorization) {
        console.error('Auth Header Sent:', error.config.headers.Authorization.substring(0, 30) + '...');
      }
      
      throw new Error(`Amadeus API Error: ${error.response?.data?.errors?.[0]?.title || error.message}`);
    }
  }

  /**
   * Search for flights
   */
  async searchFlights(searchParams) {
    const { 
      origin, 
      destination, 
      departureDate, 
      returnDate, 
      adults = 1, 
      children = 0, 
      infants = 0,
      travelClass = 'ECONOMY'
    } = searchParams;

    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: adults.toString(),
      children: children.toString(),
      infants: infants.toString(),
      travelClass,
      currencyCode: this.currency,
      max: 20
    };

    if (returnDate) {
      params.returnDate = returnDate;
    }

    try {
      const response = await this.makeRequest('GET', '/v2/shopping/flight-offers', null, params);
      return this.formatFlightSearchResults(response);
    } catch (error) {
      console.warn('Amadeus flight search unavailable, using mock flight data:', error.message);
      return this.getMockFlightData(origin, destination, departureDate, adults);
    }
  }

  /**
   * Format flight search results
   */
  formatFlightSearchResults(response) {
    if (!response.data || response.data.length === 0) {
      return {
        success: true,
        flights: [],
        total: 0,
        message: 'No flights found for the given criteria'
      };
    }

    const flights = response.data.map((offer, index) => {
      const itinerary = offer.itineraries[0]; // Outbound flight
      const firstSegment = itinerary.segments[0];
      const lastSegment = itinerary.segments[itinerary.segments.length - 1];

      return {
        id: `${index}-${offer.id}`,
        offerId: offer.id,
        airline: firstSegment.operating?.carrierCode || firstSegment.carrierCode,
        airlineCode: firstSegment.carrierCode,
        airlineLogoUrl: this.getAirlineLogoUrl(firstSegment.carrierCode),
        flightNumber: `${firstSegment.carrierCode}${firstSegment.number}`,
        departure: {
          time: firstSegment.departure.at,
          airport: firstSegment.departure.iataCode,
          airportName: this.getAirportName(firstSegment.departure.iataCode),
          terminal: firstSegment.departure.terminal
        },
        arrival: {
          time: lastSegment.arrival.at,
          airport: lastSegment.arrival.iataCode,
          airportName: this.getAirportName(lastSegment.arrival.iataCode),
          terminal: lastSegment.arrival.terminal
        },
        duration: itinerary.duration, // ISO 8601 duration
        stops: itinerary.segments.length - 1,
        price: {
          total: parseFloat(offer.price.total),
          base: parseFloat(offer.price.base),
          fees: offer.price.fees?.map(f => ({ amount: parseFloat(f.amount), type: f.type })) || [],
          grandTotal: parseFloat(offer.price.grandTotal),
          currency: offer.price.currency
        },
        travelerPricings: offer.travelerPricings,
        validatingAirlineCode: offer.validatingAirlineCode,
        instantTicketingRequired: offer.instantTicketingRequired,
        nonHomogeneous: offer.nonHomogeneous,
        oneWay: offer.oneWay,
        lastTicketingDate: offer.lastTicketingDate,
        numberOfBookableSeats: offer.numberOfBookableSeats
      };
    });

    return {
      success: true,
      flights,
      total: response.data.length,
      dictionaries: response.dictionaries
    };
  }

  /**
   * Get flight details
   */
  async getFlightDetails(offerId, flightIndex) {
    // For Amadeus, we need to store the full search response or retrieve it
    // This is a simplified version - in production, you'd cache search results
    return {
      id: offerId,
      offerId,
      details: 'Retrieved from previous search'
    };
  }

  /**
   * Confirm flight booking (create booking)
   */
  async createBooking(bookingData) {
    const { 
      flightOffer,  // Complete flight offer object from search results
      passengers,
      contactInfo
    } = bookingData;

    // Validate required flight offer data
    if (!flightOffer || !flightOffer.id) {
      throw new Error('Flight offer with ID is required for booking');
    }

    console.log('Creating booking with flight offer ID:', flightOffer.id);
    console.log('Flight offer type:', flightOffer.type);
    console.log('Passengers count:', passengers.length);

    const payload = {
      type: 'flight-order',
      flightOffers: [
        {
          id: flightOffer.id,
          source: flightOffer.source || 'GDS',
          instantTicketingRequired: flightOffer.instantTicketingRequired || false,
          disablePricing: false,
          forceTicket: false
        }
      ],
      remarks: {
        general: [{
          subType: 'GENERAL_REMARK',
          category: 'MISCELLANEOUS',
          text: 'BOOKING CONFIRMATION'
        }]
      },
      contacts: [{
        addresseeName: {
          firstName: contactInfo.firstName,
          lastName: contactInfo.lastName
        },
        address: {
          cityName: contactInfo.city || 'Nairobi',
          countryCode: contactInfo.countryCode || 'KE'
        },
        emailAddress: contactInfo.email,
        phones: [{
          deviceType: 'MOBILE',
          countryCallingCode: '+254',
          number: contactInfo.phone
        }]
      }],
      travelers: passengers.map((passenger, index) => ({
        id: (index + 1).toString(),
        dateOfBirth: passenger.dateOfBirth,
        name: {
          firstName: passenger.firstName,
          lastName: passenger.lastName
        },
        gender: passenger.gender || 'MALE',
        contact: {
          emailAddress: passenger.email || contactInfo.email,
          phones: [{
            deviceType: 'MOBILE',
            countryCallingCode: '+254',
            number: passenger.phone || contactInfo.phone
          }]
        },
        documents: passenger.documents || []
      }))
    };

    try {
      console.log('Booking payload:', JSON.stringify(payload, null, 2));
      const response = await this.makeRequest('POST', '/v1/booking/flight-orders', payload);
      console.log('Booking response received:', response?.id);
      return this.formatBookingConfirmation(response);
    } catch (error) {
      console.warn('Amadeus flight booking unavailable, creating mock booking:', error.message);

      const mockReference = `FLIGHT_${Date.now()}_${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      const price = flightOffer?.price || {};
      const totalPrice = Number(price.grandTotal ?? price.total ?? 0) || 0;
      const currency = price.currency || this.currency;

      return {
        success: true,
        bookingReference: mockReference,
        isMockData: true,
        bookingDetails: {
          id: mockReference,
          type: 'flight-order',
          flightOffers: [flightOffer],
          travelers: (passengers || []).map((p, idx) => ({
            id: String(idx + 1),
            dateOfBirth: p.dateOfBirth,
            name: { firstName: p.firstName, lastName: p.lastName },
            gender: p.gender || 'MALE'
          })),
          contacts: [{
            addresseeName: {
              firstName: contactInfo?.firstName,
              lastName: contactInfo?.lastName
            },
            address: {
              cityName: contactInfo?.city || 'Nairobi',
              countryCode: contactInfo?.countryCode || this.countryCode
            },
            emailAddress: contactInfo?.email,
            phones: [{
              deviceType: 'MOBILE',
              countryCallingCode: '+254',
              number: contactInfo?.phone
            }]
          }],
          documents: []
        },
        totalPrice,
        currency
      };
    }
  }

  /**
   * Format booking confirmation
   */
  formatBookingConfirmation(response) {
    return {
      success: true,
      bookingReference: response.id,
      bookingDetails: {
        id: response.id,
        associatedRecords: response.associatedRecords || [],
        type: response.type,
        queuingOfficeId: response.queuingOfficeId,
        flightOffers: response.flightOffers || [],
        travelers: response.travelers || [],
        contacts: response.contacts || [],
        ticketingAgreement: response.ticketingAgreement,
        remarks: response.remarks,
        documents: response.documents || []
      },
      totalPrice: response.flightOffers?.[0]?.price?.grandTotal || 0,
      currency: response.flightOffers?.[0]?.price?.currency || this.currency
    };
  }

  /**
   * Get airline logo URL
   */
  getAirlineLogoUrl(carrierCode) {
    // Using public airline logo API
    return `https://api.lufthansa.com/v1/mds/images/logos/airlines/square/${carrierCode}.png`;
  }

  /**
   * Get airport name
   */
  getAirportName(iataCode) {
    // Simple mapping - in production, use a comprehensive airport database
    const airports = {
      'NBO': 'Nairobi (Jomo Kenyatta)',
      'MBA': 'Mombasa',
      'KIA': 'Kisumu',
      'NKC': 'Nakuru',
      'JRO': 'Kilimanjaro',
      'DAR': 'Dar es Salaam',
      'LIL': 'Lilongwe',
      'ADD': 'Addis Ababa',
      'LOS': 'Lagos',
      'LHR': 'London Heathrow',
      'CDG': 'Paris Charles de Gaulle',
      'JFK': 'New York',
      'LAX': 'Los Angeles',
      'DXB': 'Dubai',
      'SIN': 'Singapore',
      'HND': 'Tokyo'
    };
    
    return airports[iataCode] || iataCode;
  }

  /**
   * Get flight status
   */
  async getFlightStatus(flightNumber, date) {
    const params = {
      carrierCode: flightNumber.substring(0, 2),
      flightNumber: flightNumber.substring(2),
      scheduledDepartureDate: date
    };

    try {
      const response = await this.makeRequest('GET', '/v2/schedule/flights', null, params);
      return response;
    } catch (error) {
      console.warn('Amadeus flight status unavailable, using mock status:', error.message);
      return {
        isMockData: true,
        data: {
          flightNumber,
          date,
          status: 'SCHEDULED',
          message: 'Mock status (Amadeus unavailable)'
        }
      };
    }
  }

  /**
   * Seat availability (if available in Amadeus API)
   */
  async getSeatAvailability(flightOfferId) {
    // Note: Seat availability typically requires additional call after booking
    return {
      available: true,
      message: 'Seat selection available at booking confirmation'
    };
  }

  /**
   * Get mock flight data for testing/development when API authentication fails
   */
  getMockFlightData(origin, destination, departureDate, adults) {
    const airlines = [
      { code: 'KQ', name: 'Kenya Airways' },
      { code: 'ET', name: 'Ethiopian Airlines' },
      { code: 'BA', name: 'British Airways' },
      { code: 'LH', name: 'Lufthansa' },
      { code: 'EK', name: 'Emirates' },
      { code: 'AF', name: 'Air France' },
      { code: 'IB', name: 'Iberia' }
    ];

    const mockFlights = [];
    const depDate = new Date(departureDate);

    for (let i = 0; i < 6; i++) {
      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const departureHour = 6 + (i * 3);
      const arrivalHour = departureHour + (destination === 'LHR' ? 8 : 4);

      const depDateTime = new Date(depDate);
      depDateTime.setHours(departureHour, Math.floor(Math.random() * 60), 0);

      const arrDateTime = new Date(depDateTime);
      arrDateTime.setHours(arrivalHour % 24);
      if (arrivalHour >= 24) arrDateTime.setDate(arrDateTime.getDate() + 1);

      mockFlights.push({
        id: `mock-${i}`,
        offerId: `MOCK_OFFER_${i}`,
        airline: airline.name,
        airlineCode: airline.code,
        airlineLogoUrl: `https://www.gstatic.com/flights/airline_logos/70px/${airline.code}.png`,
        flightNumber: `${airline.code}${100 + i}`,
        departure: {
          time: depDateTime.toISOString(),
          airport: origin,
          airportName: this.getAirportName(origin),
          terminal: Math.floor(Math.random() * 3) + 1
        },
        arrival: {
          time: arrDateTime.toISOString(),
          airport: destination,
          airportName: this.getAirportName(destination),
          terminal: Math.floor(Math.random() * 3) + 1
        },
        duration: `PT${6 + Math.floor(Math.random() * 4)}H${Math.floor(Math.random() * 60)}M`,
        stops: Math.floor(Math.random() * 2),
        price: {
          total: Math.floor(Math.random() * 200000) + 50000,
          base: Math.floor(Math.random() * 150000) + 30000,
          currency: this.currency
        },
        seats: {
          economy: Math.floor(Math.random() * 100) + 20,
          premium: Math.floor(Math.random() * 50) + 5,
          business: Math.floor(Math.random() * 20) + 2
        }
      });
    }

    return {
      success: true,
      flights: mockFlights,
      total: mockFlights.length,
      isMockData: true,
      message: '⚠️  Mock flight data (API authentication issue - contact Amadeus support to enable flight search)'
    };
  }
}

module.exports = FlightService;
