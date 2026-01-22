/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('users').del();

  // Insert Kenyan seed users
  await knex('users').insert([
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'James',
      last_name: 'Mwangi',
      email: 'james.mwangi@example.com',
      phone: '+254712345678',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'customer',
      is_active: true,
      email_verified: true,
      address: 'Mombasa Road, Industrial Area',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00500',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Grace',
      last_name: 'Wanjiru',
      email: 'grace.wanjiru@example.com',
      phone: '+254723456789',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'customer',
      is_active: true,
      email_verified: true,
      address: 'Kenyatta Avenue',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'David',
      last_name: 'Ochieng',
      email: 'david.ochieng@example.com',
      phone: '+254734567890',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'customer',
      is_active: true,
      email_verified: true,
      address: 'Moi Avenue',
      city: 'Mombasa',
      state: 'Mombasa County',
      country: 'Kenya',
      postal_code: '80100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Sarah',
      last_name: 'Kiprono',
      email: 'sarah.kiprono@example.com',
      phone: '+254745678901',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'customer',
      is_active: true,
      email_verified: true,
      address: 'Nandi Road',
      city: 'Eldoret',
      state: 'Uasin Gishu County',
      country: 'Kenya',
      postal_code: '30100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Michael',
      last_name: 'Otieno',
      email: 'michael.otieno@example.com',
      phone: '+254756789012',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'customer',
      is_active: true,
      email_verified: true,
      address: 'Oginga Odinga Street',
      city: 'Kisumu',
      state: 'Kisumu County',
      country: 'Kenya',
      postal_code: '40100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    // Event Organizers
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Events',
      last_name: 'Team Kenya',
      email: 'events@kenyaconventions.co.ke',
      phone: '+254720123456',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'organizer',
      is_active: true,
      email_verified: true,
      address: 'Waiyaki Way',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00606',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Music',
      last_name: 'Festival Kenya',
      email: 'music@kenyafestivals.co.ke',
      phone: '+254730987654',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'organizer',
      is_active: true,
      email_verified: true,
      address: 'Langata Road',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00502',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    // Venue Managers
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'John',
      last_name: 'Kariuki',
      email: 'john.kariuki@kicc.co.ke',
      phone: '+254722111222',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'venue_manager',
      is_active: true,
      email_verified: true,
      address: 'Kenyatta Avenue',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Mary',
      last_name: 'Atieno',
      email: 'mary.atieno@nyayostadium.co.ke',
      phone: '+254733333444',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'venue_manager',
      is_active: true,
      email_verified: true,
      address: 'Jogoo Road',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00500',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Peter',
      last_name: 'Musa',
      email: 'peter.musa@kasarani.co.ke',
      phone: '+254744555666',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'venue_manager',
      is_active: true,
      email_verified: true,
      address: 'Thika Road',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00501',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    // Admin
    {
      id: knex.raw('gen_random_uuid()'),
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@shashapass.co.ke',
      phone: '+254700000000',
      password_hash: '$2a$10$E5efskSIjWt9W3dcf2M7C.xEPXAh5i.LHbeTFF6HyTW6thKsLxNpa',
      role: 'admin',
      is_active: true,
      email_verified: true,
      address: 'Harambee Avenue',
      city: 'Nairobi',
      state: 'Nairobi County',
      country: 'Kenya',
      postal_code: '00100',
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);

  // Update venue manager IDs in venues table
  const kariuki = await knex('users').where('email', 'john.kariuki@kicc.co.ke').first();
  const atieno = await knex('users').where('email', 'mary.atieno@nyayostadium.co.ke').first();
  const musa = await knex('users').where('email', 'peter.musa@kasarani.co.ke').first();

  if (kariuki) {
    await knex('venues').where('name', 'Kenyatta International Convention Centre').update({ manager_id: kariuki.id });
  }
  if (atieno) {
    await knex('venues').where('name', 'Nyayo National Stadium').update({ manager_id: atieno.id });
  }
  if (musa) {
    await knex('venues').where('name', 'Kasarani Stadium (Moi International Sports Centre)').update({ manager_id: musa.id });
  }
};
