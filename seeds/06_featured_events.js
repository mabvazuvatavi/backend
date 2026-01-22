/**
 * Seed featured events for homepage
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Get or create venues for events
  const venues = await knex('venues').select('id').limit(1);
  
  if (venues.length === 0) {
    console.log('⚠️ No venues found, skipping featured events seed');
    return;
  }

  const venueId = venues[0].id;

  // Featured events to add
  const featuredEvents = [
    {
      title: 'Coldplay Concert 2026',
      description: 'Experience Coldplay live with their greatest hits and new material from their latest album.',
      short_description: 'Coldplay live concert at the National Stadium.',
      event_type: 'concert',
      category: 'entertainment',
      venue_id: venueId,
      organizer_id: null,
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
      base_price: 75.00,
      currency: 'USD',
      total_capacity: 5000,
      available_tickets: 5000,
      sold_tickets: 0,
      status: 'published',
      event_image_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200',
      tags: JSON.stringify(['concert', 'music', 'live']),
      terms_and_conditions: 'Standard terms apply.',
      refund_policy: 'Full refund up to 14 days before event.',
      is_featured: true,
      requires_approval: false,
      min_age: 0,
      has_seating: true,
      published_at: knex.fn.now(),
      sales_start_date: knex.fn.now(),
      sales_end_date: knex.fn.now(),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      title: 'AFC Champions League Final',
      description: 'Watch the most anticipated soccer match of the season live at the stadium.',
      short_description: 'Live soccer championship match.',
      event_type: 'sports',
      category: 'sports_soccer',
      venue_id: venueId,
      organizer_id: null,
      start_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      base_price: 50.00,
      currency: 'USD',
      total_capacity: 10000,
      available_tickets: 10000,
      sold_tickets: 0,
      status: 'published',
      event_image_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200',
      tags: JSON.stringify(['soccer', 'sports', 'live']),
      terms_and_conditions: 'Standard terms apply.',
      refund_policy: 'Full refund up to 7 days before event.',
      is_featured: true,
      requires_approval: false,
      min_age: 0,
      has_seating: true,
      published_at: knex.fn.now(),
      sales_start_date: knex.fn.now(),
      sales_end_date: knex.fn.now(),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    },
    {
      title: 'Comedy Night with Kevin Hart',
      description: 'An evening of laughter with stand-up comedian Kevin Hart performing his latest comedy special.',
      short_description: 'Comedy show at the Convention Center.',
      event_type: 'other',
      category: 'entertainment',
      venue_id: venueId,
      organizer_id: null,
      start_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
      base_price: 60.00,
      currency: 'USD',
      total_capacity: 3000,
      available_tickets: 3000,
      sold_tickets: 0,
      status: 'published',
      event_image_url: 'https://images.unsplash.com/photo-1533450718592-a3c08e688cd0?w=1200',
      tags: JSON.stringify(['comedy', 'entertainment', 'live']),
      terms_and_conditions: 'Standard terms apply.',
      refund_policy: 'Full refund up to 10 days before event.',
      is_featured: true,
      requires_approval: false,
      min_age: 18,
      has_seating: true,
      published_at: knex.fn.now(),
      sales_start_date: knex.fn.now(),
      sales_end_date: knex.fn.now(),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    }
  ];

  // Insert featured events
  await knex('events').insert(featuredEvents);

  console.log('✅ Featured events seeded successfully');
};
