/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Clear existing entries
  await knex('payment_methods').del();

  // Insert Kenyan payment methods
  await knex('payment_methods').insert([
    {
      code: 'mpesa',
      name: 'M-Pesa',
      category: 'mobile_money',
      description: 'Kenya\'s most popular mobile money service',
      enabled: true,
      gateway_provider: 'safaricom',
      min_amount: 10.00,
      max_amount: 150000.00,
      currency: 'KES',
      config: {
        consumer_key: process.env.MPESA_CONSUMER_KEY,
        consumer_secret: process.env.MPESA_CONSUMER_SECRET,
        passkey: process.env.MPESA_PASSKEY,
        shortcode: process.env.MPESA_SHORTCODE,
        initiator_name: process.env.MPESA_INITIATOR_NAME,
        initiator_password: process.env.MPESA_INITIATOR_PASSWORD,
        security_credential: process.env.MPESA_SECURITY_CREDENTIAL,
        callback_url: process.env.MPESA_CALLBACK_URL,
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox'
      },
      fees: {
        transaction_fee_percentage: 1.5,
        fixed_fee: 0.00
      },
      processing_time_minutes: 5,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'pesepal',
      name: 'Pesepal',
      category: 'payment_gateway',
      description: 'Kenyan online payment gateway supporting cards and mobile money',
      enabled: true,
      gateway_provider: 'pesepal',
      min_amount: 50.00,
      max_amount: 500000.00,
      currency: 'KES',
      config: {
        consumer_key: process.env.PESEPAL_CONSUMER_KEY,
        consumer_secret: process.env.PESEPAL_CONSUMER_SECRET,
        callback_url: process.env.PESEPAL_CALLBACK_URL,
        environment: process.env.PESEPAL_ENVIRONMENT || 'sandbox'
      },
      fees: {
        transaction_fee_percentage: 3.0,
        fixed_fee: 0.00
      },
      processing_time_minutes: 10,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'equitel',
      name: 'Equitel Money',
      category: 'mobile_money',
      description: 'Equitel mobile money service from Equity Bank',
      enabled: true,
      gateway_provider: 'equity_bank',
      min_amount: 10.00,
      max_amount: 100000.00,
      currency: 'KES',
      config: {
        api_url: process.env.EQUITEL_API_URL,
        merchant_code: process.env.EQUITEL_MERCHANT_CODE,
        api_key: process.env.EQUITEL_API_KEY,
        callback_url: process.env.EQUITEL_CALLBACK_URL,
        environment: process.env.EQUITEL_ENVIRONMENT || 'sandbox'
      },
      fees: {
        transaction_fee_percentage: 2.0,
        fixed_fee: 0.00
      },
      processing_time_minutes: 5,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'airtel_money',
      name: 'Airtel Money',
      category: 'mobile_money',
      description: 'Airtel mobile money service',
      enabled: true,
      gateway_provider: 'airtel',
      min_amount: 10.00,
      max_amount: 80000.00,
      currency: 'KES',
      config: {
        api_url: process.env.AIRTEL_MONEY_API_URL,
        client_id: process.env.AIRTEL_MONEY_CLIENT_ID,
        client_secret: process.env.AIRTEL_MONEY_CLIENT_SECRET,
        callback_url: process.env.AIRTEL_MONEY_CALLBACK_URL,
        environment: process.env.AIRTEL_MONEY_ENVIRONMENT || 'sandbox'
      },
      fees: {
        transaction_fee_percentage: 2.5,
        fixed_fee: 0.00
      },
      processing_time_minutes: 5,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'tkash',
      name: 'T-Kash',
      category: 'mobile_money',
      description: 'T-Kash mobile money service from Telkom Kenya',
      enabled: true,
      gateway_provider: 'telkom',
      min_amount: 10.00,
      max_amount: 70000.00,
      currency: 'KES',
      config: {
        api_url: process.env.TKASH_API_URL,
        merchant_id: process.env.TKASH_MERCHANT_ID,
        api_key: process.env.TKASH_API_KEY,
        callback_url: process.env.TKASH_CALLBACK_URL,
        environment: process.env.TKASH_ENVIRONMENT || 'sandbox'
      },
      fees: {
        transaction_fee_percentage: 2.0,
        fixed_fee: 0.00
      },
      processing_time_minutes: 5,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'stripe',
      name: 'Credit/Debit Card',
      category: 'payment_gateway',
      description: 'International card payments via Stripe',
      enabled: true,
      gateway_provider: 'stripe',
      min_amount: 1.00,
      max_amount: 1000000.00,
      currency: 'KES',
      config: {
        publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
        secret_key: process.env.STRIPE_SECRET_KEY,
        webhook_secret: process.env.STRIPE_WEBHOOK_SECRET
      },
      fees: {
        transaction_fee_percentage: 2.9,
        fixed_fee: 0.30
      },
      processing_time_minutes: 15,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'paypal',
      name: 'PayPal',
      category: 'payment_gateway',
      description: 'PayPal payments for international transactions',
      enabled: true,
      gateway_provider: 'paypal',
      min_amount: 1.00,
      max_amount: 1000000.00,
      currency: 'USD',
      config: {
        client_id: process.env.PAYPAL_CLIENT_ID,
        client_secret: process.env.PAYPAL_CLIENT_SECRET,
        sandbox: process.env.PAYPAL_SANDBOX === 'true'
      },
      fees: {
        transaction_fee_percentage: 3.4,
        fixed_fee: 0.30
      },
      processing_time_minutes: 20,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'cash',
      name: 'Cash on Delivery',
      category: 'cash',
      description: 'Pay cash when collecting tickets at venue',
      enabled: true,
      gateway_provider: null,
      min_amount: 0.00,
      max_amount: 100000.00,
      currency: 'KES',
      config: {},
      fees: {
        transaction_fee_percentage: 0.0,
        fixed_fee: 0.00
      },
      processing_time_minutes: 0,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      code: 'nfc',
      name: 'NFC/RFID Card',
      category: 'nfc',
      description: 'Pay using NFC or RFID card balance',
      enabled: true,
      gateway_provider: 'shashapass',
      min_amount: 1.00,
      max_amount: 50000.00,
      currency: 'KES',
      config: {
        card_issuer: 'ShashaPass',
        card_types: ['nfc', 'rfid', 'both']
      },
      fees: {
        transaction_fee_percentage: 0.5,
        fixed_fee: 0.00
      },
      processing_time_minutes: 1,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
