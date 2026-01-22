/**
 * Venue Management Routes
 * Handles venue creation, editing, and seating section management
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const knex = require('../config/database');

// GET /api/venues - List venues (public, with filtering)
router.get('/', async (req, res) => {
  try {
    const { city, venue_type, search, limit = 50, offset = 0 } = req.query;

    let query = knex('venues').where('is_active', true);

    if (city) query = query.where('city', city);
    if (venue_type) query = query.where('venue_type', venue_type);
    if (search) {
      query = query.whereRaw(`(name ILIKE ? OR description ILIKE ?)`, [
        `%${search}%`,
        `%${search}%`,
      ]);
    }

    const total = await query.clone().count('id as count').first();
    const venues = await query
      .select('*')
      .limit(parseInt(limit))
      .offset(parseInt(offset));

    res.json({
      success: true,
      data: venues,
      pagination: {
        total: total.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error('Error fetching venues:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/venues/:id - Get single venue with seating sections
router.get('/:id', async (req, res) => {
  try {
    const venue = await knex('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Get seating sections
    const sections = await knex('venue_seating_sections')
      .where('venue_id', venue.id)
      .where('is_active', true)
      .select('*');

    res.json({
      success: true,
      data: {
        ...venue,
        seating_sections: sections,
      },
    });
  } catch (error) {
    console.error('Error fetching venue:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/venues/:id/seating-sections - Get venue seating sections
router.get('/:id/seating-sections', async (req, res) => {
  try {
    const sections = await knex('venue_seating_sections')
      .where('venue_id', req.params.id)
      .where('is_active', true)
      .select('*')
      .orderBy('created_at', 'asc');

    res.json({
      success: true,
      data: sections,
    });
  } catch (error) {
    console.error('Error fetching seating sections:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/venues - Create new venue (Manager/Admin only)
router.post('/', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const { role } = req.user;
    if (!['venue_manager', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Only managers and admins can create venues' });
    }

    const {
      name,
      description,
      venue_type,
      address,
      city,
      state,
      country,
      phone,
      email,
      website,
      capacity,
      has_seating,
      has_parking,
      has_wifi,
      has_catering,
      has_accessibility,
      venue_image_url,
      seating_sections,
    } = req.body;

    // Validate required fields
    if (!name || !description || !venue_type || !address || !city || !state || !country || !email || !capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate seating sections if has_seating is true
    if (has_seating && (!seating_sections || seating_sections.length === 0)) {
      return res.status(400).json({ error: 'At least one seating section is required' });
    }

    // Validate total seating doesn't exceed capacity
    if (has_seating && seating_sections) {
      const totalSeats = seating_sections.reduce((sum, s) => sum + parseInt(s.total_seats || 0), 0);
      if (totalSeats > parseInt(capacity)) {
        return res.status(400).json({ error: 'Total seats exceed venue capacity' });
      }
    }

    // Create venue
    const venueData = {
      manager_id: req.user.id,
      name,
      description,
      venue_type,
      address,
      city,
      state,
      country,
      // Map incoming aliases to DB columns
      contact_phone: phone || null,
      contact_email: email || null,
      website: website || null,
      capacity: parseInt(capacity, 10),
      has_seating: has_seating || false,
      has_parking: has_parking || false,
      has_wifi: has_wifi || false,
      has_catering: has_catering || false,
      has_accessibility: has_accessibility || false,
      image_url: venue_image_url || null,
      is_active: true,
    };

    // Filter venueData to only columns that exist in the DB to avoid insert errors
    const columnsInfo = await trx('venues').columnInfo();
    const allowedCols = Object.keys(columnsInfo);
    const filteredVenueData = {};
    Object.keys(venueData).forEach((k) => {
      if (allowedCols.includes(k)) filteredVenueData[k] = venueData[k];
    });

    const inserted = await trx('venues').insert(filteredVenueData).returning('id');
    let venueId;
    if (Array.isArray(inserted)) {
      venueId = inserted[0] && inserted[0].id ? inserted[0].id : inserted[0];
    } else {
      venueId = inserted && inserted.id ? inserted.id : inserted;
    }

    // Create seating sections if provided
    if (has_seating && seating_sections && seating_sections.length > 0) {
      const sectionData = seating_sections.map((section) => ({
        venue_id: venueId,
        section_name: section.section_name,
        total_seats: parseInt(section.total_seats),
        base_price: parseFloat(section.base_price),
        description: section.description || null,
        color_code: section.color_code || '#3F51B5',
        is_active: true,
      }));

      await trx('venue_seating_sections').insert(sectionData);
    }

    await trx.commit();

    res.status(201).json({
      success: true,
      message: 'Venue created successfully',
      data: { id: venueId },
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error creating venue:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/venues/:id - Update venue (Manager/Admin only)
router.patch('/:id', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const venue = await trx('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Only manager or admin can edit
    if (venue.manager_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      name,
      description,
      venue_type,
      address,
      city,
      state,
      country,
      phone,
      contact_phone,
      email,
      contact_email,
      website,
      capacity,
      has_parking,
      has_wifi,
      has_catering,
      has_accessibility,
      venue_image_url,
      image_url,
      seating_sections,
    } = req.body;

    // Update venue fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (venue_type !== undefined) updates.venue_type = venue_type;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
    // Handle both phone and contact_phone
    if (phone !== undefined) updates.contact_phone = phone;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone;
    // Handle both email and contact_email
    if (email !== undefined) updates.contact_email = email;
    if (contact_email !== undefined) updates.contact_email = contact_email;
    if (website !== undefined) updates.website = website;
    if (capacity !== undefined) updates.capacity = parseInt(capacity);
    if (has_parking !== undefined) updates.has_parking = has_parking;
    if (has_wifi !== undefined) updates.has_wifi = has_wifi;
    if (has_catering !== undefined) updates.has_catering = has_catering;
    if (has_accessibility !== undefined) updates.has_accessibility = has_accessibility;
    if (venue_image_url !== undefined) updates.image_url = venue_image_url;
    if (image_url !== undefined) updates.image_url = image_url;

    await trx('venues').where('id', req.params.id).update(updates);

    // Update seating sections if provided
    if (seating_sections !== undefined) {
      // Validate total seats against capacity
      const totalSeats = seating_sections.reduce((sum, s) => sum + parseInt(s.total_seats || 0), 0);
      if (totalSeats > (capacity || venue.capacity)) {
        return res.status(400).json({ error: 'Total seats exceed venue capacity' });
      }

      // Delete old sections
      await trx('venue_seating_sections').where('venue_id', req.params.id).del();

      // Insert new sections
      if (seating_sections.length > 0) {
        const sectionData = seating_sections.map((section) => ({
          venue_id: req.params.id,
          section_name: section.section_name,
          total_seats: parseInt(section.total_seats),
          base_price: parseFloat(section.base_price),
          description: section.description || null,
          color_code: section.color_code || '#3F51B5',
          is_active: true,
        }));

        await trx('venue_seating_sections').insert(sectionData);
      }
    }

    await trx.commit();

    res.json({
      success: true,
      message: 'Venue updated',
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error updating venue:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/venues/:id - Update venue (Manager/Admin only) - same as PATCH
router.put('/:id', verifyToken, async (req, res) => {
  const trx = await knex.transaction();

  try {
    const venue = await trx('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Only manager or admin can edit
    if (venue.manager_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const {
      name,
      description,
      venue_type,
      address,
      city,
      state,
      country,
      phone,
      contact_phone,
      email,
      contact_email,
      website,
      capacity,
      has_parking,
      has_wifi,
      has_catering,
      has_accessibility,
      venue_image_url,
      image_url,
      seating_sections,
    } = req.body;

    // Update venue fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (venue_type !== undefined) updates.venue_type = venue_type;
    if (address !== undefined) updates.address = address;
    if (city !== undefined) updates.city = city;
    if (state !== undefined) updates.state = state;
    if (country !== undefined) updates.country = country;
    // Handle both phone and contact_phone
    if (phone !== undefined) updates.contact_phone = phone;
    if (contact_phone !== undefined) updates.contact_phone = contact_phone;
    // Handle both email and contact_email
    if (email !== undefined) updates.contact_email = email;
    if (contact_email !== undefined) updates.contact_email = contact_email;
    if (website !== undefined) updates.website = website;
    if (capacity !== undefined) updates.capacity = parseInt(capacity);
    if (has_parking !== undefined) updates.has_parking = has_parking;
    if (has_wifi !== undefined) updates.has_wifi = has_wifi;
    if (has_catering !== undefined) updates.has_catering = has_catering;
    if (has_accessibility !== undefined) updates.has_accessibility = has_accessibility;
    if (venue_image_url !== undefined) updates.image_url = venue_image_url;
    if (image_url !== undefined) updates.image_url = image_url;

    await trx('venues').where('id', req.params.id).update(updates);

    // Update seating sections if provided
    if (seating_sections !== undefined) {
      // Validate total seats against capacity
      const totalSeats = seating_sections.reduce((sum, s) => sum + parseInt(s.total_seats || 0), 0);
      if (totalSeats > (capacity || venue.capacity)) {
        return res.status(400).json({ error: 'Total seats exceed venue capacity' });
      }

      // Delete old sections
      await trx('venue_seating_sections').where('venue_id', req.params.id).del();

      // Insert new sections
      if (seating_sections.length > 0) {
        const sectionData = seating_sections.map((section) => ({
          venue_id: req.params.id,
          section_name: section.section_name,
          total_seats: parseInt(section.total_seats),
          base_price: parseFloat(section.base_price),
          description: section.description || null,
          color_code: section.color_code || '#3F51B5',
          is_active: true,
        }));

        await trx('venue_seating_sections').insert(sectionData);
      }
    }

    await trx.commit();

    res.json({
      success: true,
      message: 'Venue updated',
    });
  } catch (error) {
    await trx.rollback();
    console.error('Error updating venue:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/venues/:id/seating-sections - Add seating section
router.post('/:id/seating-sections', verifyToken, async (req, res) => {
  try {
    const venue = await knex('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Only manager or admin can add sections
    if (venue.manager_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { section_name, total_seats, base_price, description, color_code } = req.body;

    if (!section_name || !total_seats || !base_price) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if section name already exists for this venue
    const existing = await knex('venue_seating_sections')
      .where('venue_id', req.params.id)
      .where('section_name', section_name)
      .first();

    if (existing) {
      return res.status(400).json({ error: 'Section name already exists for this venue' });
    }

    const insertedSection = await knex('venue_seating_sections')
      .insert({
        venue_id: req.params.id,
        section_name,
        total_seats: parseInt(total_seats),
        base_price: parseFloat(base_price),
        description: description || null,
        color_code: color_code || '#3F51B5',
        is_active: true,
      })
      .returning('id');
    let sectionId;
    if (Array.isArray(insertedSection)) {
      sectionId = insertedSection[0] && insertedSection[0].id ? insertedSection[0].id : insertedSection[0];
    } else {
      sectionId = insertedSection && insertedSection.id ? insertedSection.id : insertedSection;
    }

    res.status(201).json({
      success: true,
      message: 'Seating section created',
      data: { id: sectionId },
    });
  } catch (error) {
    console.error('Error adding seating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/venues/:id/seating-sections/:sectionId - Update seating section
router.patch('/:id/seating-sections/:sectionId', verifyToken, async (req, res) => {
  try {
    const venue = await knex('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Only manager or admin can edit
    if (venue.manager_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { section_name, total_seats, base_price, description, color_code } = req.body;

    const updates = {};
    if (section_name !== undefined) updates.section_name = section_name;
    if (total_seats !== undefined) updates.total_seats = parseInt(total_seats);
    if (base_price !== undefined) updates.base_price = parseFloat(base_price);
    if (description !== undefined) updates.description = description;
    if (color_code !== undefined) updates.color_code = color_code;

    await knex('venue_seating_sections')
      .where('id', req.params.sectionId)
      .where('venue_id', req.params.id)
      .update(updates);

    res.json({
      success: true,
      message: 'Seating section updated',
    });
  } catch (error) {
    console.error('Error updating seating section:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/venues/:id/seating-sections/:sectionId - Delete seating section
router.delete('/:id/seating-sections/:sectionId', verifyToken, async (req, res) => {
  try {
    const venue = await knex('venues').where('id', req.params.id).first();

    if (!venue) {
      return res.status(404).json({ error: 'Venue not found' });
    }

    // Only manager or admin can delete
    if (venue.manager_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if section is being used by any events
    const usedByEvent = await knex('event_pricing_tiers')
      .where('venue_section_id', req.params.sectionId)
      .first();

    if (usedByEvent) {
      return res.status(400).json({ error: 'Cannot delete section used by events' });
    }

    await knex('venue_seating_sections')
      .where('id', req.params.sectionId)
      .where('venue_id', req.params.id)
      .del();

    res.json({
      success: true,
      message: 'Seating section deleted',
    });
  } catch (error) {
    console.error('Error deleting seating section:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
