/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('venues').del();

  // Insert Kenyan seed venues
  await knex('venues').insert([
    {
      name: 'Kenyatta International Convention Centre',
      description: 'Premier conference and exhibition venue in Nairobi, hosting major corporate events, concerts, and international conferences.',
      address: 'Kenyatta Avenue, Harambee Avenue',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00100',
      latitude: -1.286389,
      longitude: 36.817223,
      capacity: 6000,
      venue_type: 'conference_center',
      facilities: JSON.stringify([
        'WiFi', 'Parking', 'Catering', 'AV Equipment', 'Stage', 'Sound System',
        'Projectors', 'Microphones', 'Lighting', 'Restrooms', 'Security', 'Translation Services'
      ]),
      layout: JSON.stringify({
        main_hall: { capacity: 4000, type: 'theater' },
        breakout_rooms: { count: 15, capacity_each: 60 },
        exhibition_space: { area_sqm: 3000 }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null, // Will be updated to UUID after insertion
      contact_phone: '+254-20-271-0000',
      contact_email: 'info@kicc.co.ke',
      operating_hours: 'Monday-Friday: 8:00 AM - 6:00 PM, Saturday: 9:00 AM - 4:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Kasarani Stadium (Moi International Sports Centre)',
      description: 'Modern sports complex in Nairobi, home to major football matches, athletics, and entertainment events.',
      address: 'Thika Road, Kasarani',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00501',
      latitude: -1.2217,
      longitude: 36.9256,
      capacity: 60000,
      venue_type: 'stadium',
      facilities: JSON.stringify([
        'Parking', 'VIP Boxes', 'Press Facilities', 'Changing Rooms', 'Medical Facilities',
        'Food Courts', 'Security', 'Lighting', 'Sound System', 'Scoreboards'
      ]),
      layout: JSON.stringify({
        main_stadium: { capacity: 60000, type: 'stadium' },
        indoor_arena: { capacity: 5000, type: 'arena' },
        warm_up_track: { type: 'athletics' }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-20-866-0000',
      contact_email: 'info@kasarani.co.ke',
      operating_hours: 'Daily: 6:00 AM - 9:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Nyayo National Stadium',
      description: 'Multi-purpose stadium in Nairobi, hosting football matches, athletics, and major concerts.',
      address: 'Jogoo Road, Nairobi West',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00500',
      latitude: -1.2992,
      longitude: 36.8219,
      capacity: 30000,
      venue_type: 'stadium',
      facilities: JSON.stringify([
        'Parking', 'VIP Boxes', 'Press Facilities', 'Changing Rooms', 'Medical Facilities',
        'Food Courts', 'Security', 'Lighting', 'Sound System'
      ]),
      layout: JSON.stringify({
        main_stadium: { capacity: 30000, type: 'stadium' },
        warm_up_area: { area_sqm: 500 }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-20-271-4444',
      contact_email: 'info@nyayostadium.co.ke',
      operating_hours: 'Daily: 6:00 AM - 9:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Kenya National Theatre',
      description: 'Cultural hub for performing arts in Nairobi, hosting theatrical performances, concerts, and cultural events.',
      address: 'Harry Thuku Road, Community Area',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00100',
      latitude: -1.2633,
      longitude: 36.8115,
      capacity: 650,
      venue_type: 'theater',
      facilities: JSON.stringify([
        'WiFi', 'Parking', 'Bar', 'Restaurant', 'Sound System', 'Lighting',
        'Dressing Rooms', 'Rehearsal Studios', 'Gallery Space'
      ]),
      layout: JSON.stringify({
        main_theater: { capacity: 650, type: 'theater' },
        studio_theater: { capacity: 150, type: 'black_box' },
        gallery: { capacity: 100, type: 'exhibition' }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-20-222-7777',
      contact_email: 'info@nationaltheatre.go.ke',
      operating_hours: 'Tuesday-Sunday: 9:00 AM - 9:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Sarit Centre Expo Centre',
      description: 'Modern exhibition and conference facility in Westlands, perfect for trade shows, product launches, and corporate events.',
      address: 'Sarit Centre, Westlands',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00800',
      latitude: -1.2655,
      longitude: 36.8019,
      capacity: 2000,
      venue_type: 'conference_center',
      facilities: JSON.stringify([
        'WiFi', 'Parking', 'Catering', 'AV Equipment', 'Exhibition Halls',
        'Meeting Rooms', 'Loading Bay', 'Security', 'Climate Control'
      ]),
      layout: JSON.stringify({
        main_hall: { capacity: 1500, type: 'exhibition' },
        conference_rooms: { count: 8, capacity_each: 50 },
        outdoor_pavilion: { capacity: 500, type: 'open_air' }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-20-374-0000',
      contact_email: 'events@saritcentre.co.ke',
      operating_hours: 'Monday-Saturday: 8:00 AM - 8:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Mombasa Beach Arena',
      description: 'Beachfront venue in Mombasa, perfect for concerts, festivals, and outdoor events with ocean views.',
      address: 'Diani Beach Road',
      city: 'Mombasa',
      state: 'Mombasa County',
      country: 'Kenya',
      postal_code: '80101',
      latitude: -4.2767,
      longitude: 39.5971,
      capacity: 5000,
      venue_type: 'arena',
      facilities: JSON.stringify([
        'Beach Access', 'Parking', 'Outdoor Stage', 'Sound System', 'Lighting',
        'Food Courts', 'Security', 'Restrooms', 'VIP Areas'
      ]),
      layout: JSON.stringify({
        main_stage: { capacity: 5000, type: 'outdoor' },
        vip_lounge: { capacity: 200, type: 'covered' },
        beach_area: { capacity: 1000, type: 'open' }
      }),
      has_seating: false,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-41-222-0000',
      contact_email: 'events@mombasabeacharena.co.ke',
      operating_hours: 'Daily: 10:00 AM - 11:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Eldoret Sports Club',
      description: 'Premier sports facility in Eldoret, hosting athletics meets, football matches, and community events.',
      address: 'Kipchoge Keino Road',
      city: 'Eldoret',
      state: 'Uasin Gishu County',
      country: 'Kenya',
      postal_code: '30100',
      latitude: 0.5143,
      longitude: 35.2698,
      capacity: 15000,
      venue_type: 'sports_complex',
      facilities: JSON.stringify([
        'Athletics Track', 'Football Pitch', 'Training Facilities', 'Gym',
        'Parking', 'Changing Rooms', 'Medical Center', 'Security'
      ]),
      layout: JSON.stringify({
        main_stadium: { capacity: 15000, type: 'multi_purpose' },
        training_grounds: { count: 4, type: 'practice' },
        athletics_track: { type: 'standard_400m' }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-53-300-0000',
      contact_email: 'info@eldoretsports.co.ke',
      operating_hours: 'Daily: 6:00 AM - 8:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      name: 'Kisumu Cultural Centre',
      description: 'Cultural venue in Kisumu celebrating Luo heritage and hosting traditional performances, conferences, and community events.',
      address: 'Oginga Odinga Street',
      city: 'Kisumu',
      state: 'Kisumu County',
      country: 'Kenya',
      postal_code: '40100',
      latitude: -0.0917,
      longitude: 34.7678,
      capacity: 800,
      venue_type: 'theater',
      facilities: JSON.stringify([
        'Performance Hall', 'Exhibition Space', 'Meeting Rooms', 'Cultural Museum',
        'Parking', 'Catering', 'Sound System', 'Traditional Instruments'
      ]),
      layout: JSON.stringify({
        main_hall: { capacity: 600, type: 'theater' },
        cultural_museum: { capacity: 100, type: 'exhibition' },
        outdoor_amphitheater: { capacity: 200, type: 'open_air' }
      }),
      has_seating: true,
      is_active: true,
      manager_id: null,
      contact_phone: '+254-57-200-0000',
      contact_email: 'info@kisumucultural.co.ke',
      operating_hours: 'Monday-Saturday: 9:00 AM - 6:00 PM',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
