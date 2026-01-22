#!/usr/bin/env node

/**
 * Quick Test Script for BusBud Integration
 * Run from backend directory: node test-busbud.js
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3800/api';

// Test data
const testBusData = {
  bus_name: 'Test Express Bus',
  origin: 'Nairobi',
  destination: 'Mombasa',
  departure_time: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
  arrival_time: new Date(new Date().getTime() + 28 * 60 * 60 * 1000).toISOString(),
  total_seats: 50,
  available_seats: 50,
  price_per_seat: 1200,
  bus_type: 'standard',
  amenities: ['WiFi', 'AC', 'Charging'],
  operator_contact: 'test@testbus.com',
  operator_phone: '+254712345678',
};

const tests = [];

// Test 1: Get all buses
async function testGetAllBuses() {
  console.log('\n🧪 TEST 1: Get all buses');
  try {
    const response = await axios.get(`${API_BASE}/buses`);
    console.log('✅ Success! Found', response.data.data.length, 'buses');
    console.log('Sample:', response.data.data[0]);
    return true;
  } catch (err) {
    console.error('❌ Failed:', err.response?.data?.error || err.message);
    return false;
  }
}

// Test 2: Search BusBud API
async function testBusBudSearch() {
  console.log('\n🧪 TEST 2: Search BusBud API');
  try {
    const response = await axios.get(
      `${API_BASE}/buses/search/busbud?origin=Nairobi&destination=Mombasa&date=2026-01-20`
    );
    console.log('✅ Success! Found', response.data.data.length, 'buses from', response.data.source);
    console.log('Sample:', response.data.data[0]);
    return true;
  } catch (err) {
    console.error('❌ Failed:', err.response?.data?.error || err.message);
    return false;
  }
}

// Test 3: Add bus (requires auth - will show instructions)
async function testAddBus() {
  console.log('\n🧪 TEST 3: Add bus manually (requires JWT token)');
  console.log('📝 Instructions:');
  console.log('1. Log in via frontend to get JWT token');
  console.log('2. Run this command with your JWT:');
  console.log(`
curl -X POST "${API_BASE}/buses/manual/add" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(testBusData, null, 2)}'
  `);
  return null;
}

// Test 4: Sync from BusBud to DB (admin only)
async function testSyncBusBud() {
  console.log('\n🧪 TEST 4: Sync BusBud to Database (admin only)');
  console.log('📝 Instructions:');
  console.log('1. Log in as admin via frontend');
  console.log('2. Run this command with your JWT:');
  console.log(`
curl -X POST "${API_BASE}/buses/sync/busbud" \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "Nairobi",
    "destination": "Mombasa",
    "date": "2026-01-20",
    "overwrite": false
  }'
  `);
  return null;
}

// Test 5: Seed demo buses
async function testSeedBuses() {
  console.log('\n🧪 TEST 5: Seed demo buses');
  console.log('📝 Instructions:');
  console.log('Run from backend directory:');
  console.log('node seed-buses.js');
  console.log('This will add 7 demo buses to the database');
  return null;
}

// Run all tests
async function runTests() {
  console.log('🚀 BusBud Integration Test Suite');
  console.log('================================\n');

  const result1 = await testGetAllBuses();
  const result2 = await testBusBudSearch();
  await testAddBus();
  await testSyncBusBud();
  await testSeedBuses();

  console.log('\n📊 Test Summary');
  console.log('================');
  console.log('✅ Get all buses:', result1 ? 'PASS' : 'FAIL');
  console.log('✅ BusBud search:', result2 ? 'PASS' : 'FAIL (Check API availability)');
  console.log('⏳ Add bus: Requires authentication');
  console.log('⏳ Sync BusBud: Requires admin role');
  console.log('⏳ Seed buses: Run separately\n');

  console.log('📌 Next Steps:');
  console.log('1. Start the backend server: npm run dev');
  console.log('2. Start the frontend: npm start');
  console.log('3. Log in to the application');
  console.log('4. Navigate to Buses page');
  console.log('5. Test the Add Bus dialog');
  console.log('6. Test BusBud search\n');
}

runTests().catch(console.error);
