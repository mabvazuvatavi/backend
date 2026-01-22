# Kenyan Seed Data

This directory contains seed data specifically for the Kenyan version of ShashaPass, replacing all Zimbabwean data with Kenyan equivalents.

## Files Overview

### 1. `01_payment_methods_kenya.js`
- **M-Pesa**: Kenya's most popular mobile money service (1.5% fee)
- **Pesepal**: Kenyan payment gateway (3% fee) 
- **Equitel Money**: Equity Bank's mobile money (2% fee)
- **Airtel Money**: Airtel's mobile money service (2.5% fee)
- **T-Kash**: Telkom Kenya's mobile money (2% fee)
- **Stripe**: International card payments (2.9% + $0.30)
- **PayPal**: International payments (3.4% + $0.30)
- **Cash on Delivery**: Pay at venue (0% fee)
- **NFC/RFID**: Card-based payments (0.5% fee)

### 2. `01_users_kenya.js`
- **Regular Users**: 5 Kenyan users from major cities (Nairobi, Mombasa, Eldoret, Kisumu)
- **Event Organizers**: 2 Kenyan event organizing companies
- **Venue Managers**: 3 venue managers for major venues
- **Admin**: 1 system administrator

### 3. `02_venues_kenya.js`
- **Kenyatta International Convention Centre (KICC)**: Nairobi's premier conference venue
- **Kasarani Stadium**: Major sports complex (60,000 capacity)
- **Nyayo National Stadium**: Multi-purpose stadium (30,000 capacity)
- **Kenya National Theatre**: Cultural hub for performing arts
- **Sarit Centre Expo Centre**: Modern exhibition facility
- **Mombasa Beach Arena**: Beachfront venue for concerts
- **Eldoret Sports Club**: Sports facility in Rift Valley
- **Kisumu Cultural Centre**: Cultural venue in western Kenya

### 4. `03_events_kenya.js`
- **Nairobi Tech Summit 2026**: Technology conference (KES 8,500)
- **Safari Sound Festival**: Major music festival (KES 2,500)
- **Kenya Premier League**: Football derby (KES 500)
- **Kenya Fashion Week**: Fashion showcase (KES 3,500)
- **M-Pesa Mobile Money Conference**: Fintech event (KES 4,500)
- **Kenya International Comedy Festival**: Comedy shows (KES 1,500)
- **Nairobi Marathon 2026**: Running event (KES 2,000)
- **Kenyan Food & Wine Festival**: Culinary event (KES 1,800)

## Running the Seeds

### Quick Start
```bash
cd backend
node seeds/run_kenyan_seeds.js
```

### Individual Seeds
```bash
# Payment methods
npx knex seed:run --specific=seeds/01_payment_methods_kenya.js

# Users  
npx knex seed:run --specific=seeds/01_users_kenya.js

# Venues
npx knex seed:run --specific=seeds/02_venues_kenya.js

# Events
npx knex seed:run --specific=seeds/03_events_kenya.js
```

## Data Characteristics

### Phone Numbers
All phone numbers use Kenyan format:
- International: `+254712345678`
- Local: `0712345678`
- Validation regex: `^(\+254|0)[7][0-9]{8}$`

### Currency
All amounts are in Kenyan Shillings (KES):
- Event prices: KES 500 - 8,500
- Payment limits: KES 10 - 1,500,000 depending on method

### Locations
Major Kenyan cities covered:
- **Nairobi**: Capital city, most venues
- **Mombasa**: Coastal city, beach events
- **Eldoret**: Rift Valley, sports events
- **Kisumu**: Western Kenya, cultural events

### Venue Types
- Conference Centers (KICC, Sarit Centre)
- Stadiums (Kasarani, Nyayo)
- Theaters (Kenya National Theatre)
- Outdoor Venues (Mombasa Beach Arena)
- Cultural Centers (Kisumu Cultural Centre)
- Sports Complexes (Eldoret Sports Club)

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# M-Pesa
MPESA_CONSUMER_KEY=your_mpesa_consumer_key
MPESA_CONSUMER_SECRET=your_mpesa_consumer_secret
MPESA_PASSKEY=your_mpesa_passkey
MPESA_SHORTCODE=174379
MPESA_INITIATOR_NAME=your_initiator_name
MPESA_INITIATOR_PASSWORD=your_initiator_password
MPESA_SECURITY_CREDENTIAL=your_security_credential
MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# Pesepal
PESEPAL_CONSUMER_KEY=your_pesepal_consumer_key
PESEPAL_CONSUMER_SECRET=your_pesepal_consumer_secret
PESEPAL_CALLBACK_URL=https://yourdomain.com/api/payments/pesepal/callback
PESEPAL_ENVIRONMENT=sandbox

# Equitel
EQUITEL_API_URL=https://api.equitel.co.ke
EQUITEL_MERCHANT_CODE=your_merchant_code
EQUITEL_API_KEY=your_equitel_api_key
EQUITEL_CALLBACK_URL=https://yourdomain.com/api/payments/equitel/callback
EQUITEL_ENVIRONMENT=sandbox

# Airtel Money
AIRTEL_MONEY_API_URL=https://api.airtel.com
AIRTEL_MONEY_CLIENT_ID=your_client_id
AIRTEL_MONEY_CLIENT_SECRET=your_client_secret
AIRTEL_MONEY_CALLBACK_URL=https://yourdomain.com/api/payments/airtel_money/callback
AIRTEL_MONEY_ENVIRONMENT=sandbox

# T-Kash
TKASH_API_URL=https://api.telkom.co.ke
TKASH_MERCHANT_ID=your_merchant_id
TKASH_API_KEY=your_tkash_api_key
TKASH_CALLBACK_URL=https://yourdomain.com/api/payments/tkash/callback
TKASH_ENVIRONMENT=sandbox
```

## Notes

- All seed data is designed for demonstration and testing
- Real production data should use actual venue details and pricing
- Payment method configurations require actual API credentials from providers
- Events are scheduled for 2026 to avoid conflicts with current dates
- User passwords are hashed examples - use proper authentication in production
