/**
 * Add layout configurations to venues
 */

exports.seed = async function(knex) {
  // Get all venues
  const venues = await knex('venues').select('*');
  
  if (venues.length === 0) {
    console.log('No venues found. Skipping venue layout seed.');
    return;
  }

  // Define layout configurations for different venue types
  const venueLayouts = {
    stadium: {
      ticket_types: ['standard', 'vip', 'premium', 'box'],
      default_prices: {
        standard: 25,
        vip: 75,
        premium: 150,
        box: 500
      },
      default_quantities: {
        standard: 5000,
        vip: 500,
        premium: 200,
        box: 50
      },
      sections: [
        { name: 'North Stand', type: 'standard', rows: 20, seats_per_row: 50 },
        { name: 'South Stand', type: 'standard', rows: 20, seats_per_row: 50 },
        { name: 'East Stand', type: 'standard', rows: 15, seats_per_row: 40 },
        { name: 'West Stand', type: 'standard', rows: 15, seats_per_row: 40 },
        { name: 'VIP North', type: 'vip', rows: 5, seats_per_row: 30 },
        { name: 'VIP South', type: 'vip', rows: 5, seats_per_row: 30 },
        { name: 'Premium Boxes', type: 'box', rows: 2, seats_per_row: 25 }
      ]
    },
    theater: {
      ticket_types: ['standard', 'vip', 'balcony'],
      default_prices: {
        standard: 45,
        vip: 85,
        balcony: 35
      },
      default_quantities: {
        standard: 300,
        vip: 100,
        balcony: 150
      },
      sections: [
        { name: 'Orchestra', type: 'standard', rows: 10, seats_per_row: 30 },
        { name: 'Mezzanine', type: 'standard', rows: 8, seats_per_row: 25 },
        { name: 'VIP Orchestra', type: 'vip', rows: 3, seats_per_row: 20 },
        { name: 'Balcony Left', type: 'balcony', rows: 5, seats_per_row: 30 },
        { name: 'Balcony Right', type: 'balcony', rows: 5, seats_per_row: 30 }
      ]
    },
    arena: {
      ticket_types: ['standard', 'vip', 'floor'],
      default_prices: {
        standard: 55,
        vip: 125,
        floor: 85
      },
      default_quantities: {
        standard: 2000,
        vip: 300,
        floor: 500
      },
      sections: [
        { name: 'Lower Bowl', type: 'standard', rows: 15, seats_per_row: 40 },
        { name: 'Upper Bowl', type: 'standard', rows: 20, seats_per_row: 50 },
        { name: 'VIP Suites', type: 'vip', rows: 5, seats_per_row: 20 },
        { name: 'Floor Seats', type: 'floor', rows: 10, seats_per_row: 50 }
      ]
    },
    concert_hall: {
      ticket_types: ['standard', 'vip', 'gallery'],
      default_prices: {
        standard: 65,
        vip: 120,
        gallery: 40
      },
      default_quantities: {
        standard: 400,
        vip: 150,
        gallery: 200
      },
      sections: [
        { name: 'Parquet', type: 'standard', rows: 12, seats_per_row: 25 },
        { name: 'First Tier', type: 'standard', rows: 8, seats_per_row: 30 },
        { name: 'Second Tier', type: 'standard', rows: 10, seats_per_row: 35 },
        { name: 'VIP Boxes', type: 'vip', rows: 4, seats_per_row: 15 },
        { name: 'Gallery', type: 'gallery', rows: 15, seats_per_row: 40 }
      ]
    },
    conference_center: {
      ticket_types: ['standard', 'vip'],
      default_prices: {
        standard: 35,
        vip: 75
      },
      default_quantities: {
        standard: 500,
        vip: 100
      },
      sections: [
        { name: 'Main Hall', type: 'standard', rows: 20, seats_per_row: 25 },
        { name: 'Executive Area', type: 'vip', rows: 5, seats_per_row: 20 }
      ]
    },
    sports_complex: {
      ticket_types: ['general', 'reserved', 'vip'],
      default_prices: {
        general: 15,
        reserved: 35,
        vip: 75
      },
      default_quantities: {
        general: 1000,
        reserved: 300,
        vip: 100
      },
      sections: [
        { name: 'General Admission', type: 'general', rows: 10, seats_per_row: 100 },
        { name: 'Reserved Seating', type: 'reserved', rows: 15, seats_per_row: 20 },
        { name: 'VIP Section', type: 'vip', rows: 5, seats_per_row: 20 }
      ]
    },
    other: {
      ticket_types: ['standard'],
      default_prices: {
        standard: 25
      },
      default_quantities: {
        standard: 200
      },
      sections: [
        { name: 'Main Area', type: 'standard', rows: 10, seats_per_row: 20 }
      ]
    }
  };

  // Update each venue with appropriate layout configuration
  for (const venue of venues) {
    const layout = venueLayouts[venue.venue_type] || venueLayouts.other;
    
    await knex('venues')
      .where('id', venue.id)
      .update({
        layout_config: layout
      });
    
    console.log(`Updated layout for venue: ${venue.name} (${venue.venue_type})`);
  }

  console.log('Venue layout configurations added successfully');
};
