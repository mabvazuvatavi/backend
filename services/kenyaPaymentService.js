const db = require('../config/database');
const crypto = require('crypto');
const axios = require('axios');

/**
 * Kenya Payment Gateway Service
 * Supports local payment methods (M-Pesa, Pesepal, Equitel, Airtel Money, T-Kash)
 * Uses KES (Kenyan Shilling) currency
 */

// Payment gateway configurations
const GATEWAY_CONFIG = {
  mpesa: {
    provider: 'Safaricom',
    name: 'M-Pesa',
    minAmount: 10,
    maxAmount: 150000,
    fee: 0.015, // 1.5% fee
    currency: 'KES',
    supportedCountries: ['KE'],
    timeout: 60000,
    endpoint: 'https://sandbox.safaricom.co.ke'
  },
  pesepal: {
    provider: 'Pesepal',
    name: 'Pesepal',
    minAmount: 100,
    maxAmount: 500000,
    fee: 0.03, // 3% fee
    currency: 'KES',
    supportedCountries: ['KE'],
    timeout: 90000,
    endpoint: 'https://demo.pesepal.com'
  },
  equitel: {
    provider: 'Equitel',
    name: 'Equitel Money',
    minAmount: 10,
    maxAmount: 100000,
    fee: 0.02, // 2% fee
    currency: 'KES',
    supportedCountries: ['KE'],
    timeout: 60000,
    endpoint: 'https://api.equitel.co.ke'
  },
  airtel_money: {
    provider: 'Airtel',
    name: 'Airtel Money',
    minAmount: 10,
    maxAmount: 100000,
    fee: 0.025, // 2.5% fee
    currency: 'KES',
    supportedCountries: ['KE'],
    timeout: 60000,
    endpoint: 'https://api.airtelmoney.co.ke'
  },
  tkash: {
    provider: 'Telkom',
    name: 'T-Kash',
    minAmount: 10,
    maxAmount: 50000,
    fee: 0.02, // 2% fee
    currency: 'KES',
    supportedCountries: ['KE'],
    timeout: 60000,
    endpoint: 'https://api.tkash.co.ke'
  }
};

/**
 * Get available payment methods for Kenya
 * @returns {Array} Available payment methods
 */
async function getAvailablePaymentMethods() {
  try {
    const methods = Object.entries(GATEWAY_CONFIG).map(([key, config]) => ({
      id: key,
      name: config.name,
      provider: config.provider,
      currency: config.currency,
      minAmount: config.minAmount,
      maxAmount: config.maxAmount,
      fee: `${(config.fee * 100).toFixed(1)}%`,
      estimatedTime: key === 'pesepal' ? '1-3 minutes' : '2-5 minutes'
    }));

    return methods;
  } catch (error) {
    throw new Error(`Failed to get payment methods: ${error.message}`);
  }
}

/**
 * Initiate a Kenyan payment transaction
 * @param {number} userId - User ID
 * @param {number} amount - Amount in KES
 * @param {string} paymentMethod - Payment method (mpesa, pesepal, etc.)
 * @param {string} phoneNumber - Mobile number for payment
 * @param {number} eventId - Associated event ID (optional)
 * @param {string} email - User email (required for Pesepal)
 * @returns {Object} Transaction details
 */
async function initiatePayment(userId, amount, paymentMethod, phoneNumber, eventId = null, email = null) {
  try {
    // Validate payment method
    if (!GATEWAY_CONFIG[paymentMethod]) {
      throw new Error(`Invalid payment method: ${paymentMethod}`);
    }

    const config = GATEWAY_CONFIG[paymentMethod];

    // Validate amount
    if (amount < config.minAmount || amount > config.maxAmount) {
      throw new Error(`Amount must be between ${config.minAmount} and ${config.maxAmount} ${config.currency}`);
    }

    // Validate phone number format (Kenya: +254 or 07xx)
    if (!validateKenyanPhoneNumber(phoneNumber)) {
      throw new Error('Invalid Kenyan phone number format');
    }

    // Get user info
    const user = await db('users').where('id', userId).first();
    if (!user) {
      throw new Error('User not found');
    }

    // Calculate fees and total
    const transactionFee = parseFloat((amount * config.fee).toFixed(2));
    const totalAmount = amount + transactionFee;

    // Generate transaction reference
    const transactionRef = generateTransactionReference(paymentMethod);

    // Create payment record
    const payment = await db('payments').insert({
      user_id: userId,
      amount: amount,
      fee: transactionFee,
      total_amount: totalAmount,
      currency: config.currency,
      payment_method: paymentMethod,
      transaction_type: 'payment',
      status: 'pending',
      reference_id: transactionRef,
      phone_number: phoneNumber,
      event_id: eventId,
      provider: config.provider,
      created_at: new Date()
    });

    // Store transaction initiation for webhook handling
    await db('payment_transactions').insert({
      payment_id: payment[0],
      user_id: userId,
      amount: totalAmount,
      currency: config.currency,
      method: paymentMethod,
      provider: config.provider,
      reference: transactionRef,
      phone_number: phoneNumber,
      status: 'initiated',
      initiated_at: new Date(),
      expires_at: new Date(Date.now() + config.timeout)
    });

    // Initiate payment with provider
    let providerResponse;
    switch (paymentMethod) {
      case 'mpesa':
        providerResponse = await initiateMpesaPayment(transactionRef, phoneNumber, amount, user.email);
        break;
      case 'pesepal':
        providerResponse = await initiatePesepalPayment(transactionRef, amount, user.email || email, phoneNumber);
        break;
      case 'equitel':
        providerResponse = await initiateEquitelPayment(transactionRef, phoneNumber, amount);
        break;
      case 'airtel_money':
        providerResponse = await initiateAirtelMoneyPayment(transactionRef, phoneNumber, amount);
        break;
      case 'tkash':
        providerResponse = await initiateTkashPayment(transactionRef, phoneNumber, amount);
        break;
      default:
        throw new Error(`Payment method ${paymentMethod} not implemented`);
    }

    return {
      paymentId: payment[0],
      transactionRef,
      amount: amount,
      fee: transactionFee,
      totalAmount: totalAmount,
      currency: config.currency,
      method: config.name,
      phoneNumber: phoneNumber,
      status: 'pending',
      message: providerResponse.message,
      timeout: `${config.timeout / 1000} seconds`,
      paymentUrl: providerResponse.paymentUrl || null,
      checkoutRequestID: providerResponse.checkoutRequestID || null
    };
  } catch (error) {
    throw new Error(`Payment initiation failed: ${error.message}`);
  }
}

/**
 * Handle payment webhook callback (from payment provider)
 * @param {string} provider - Payment provider name
 * @param {Object} data - Webhook data from provider
 * @returns {Object} Payment status update
 */
async function handlePaymentCallback(provider, data) {
  try {
    let reference, status, amount, phone_number;

    // Handle different provider formats
    switch (provider.toLowerCase()) {
      case 'mpesa':
        reference = data.Body.stkCallback.CheckoutRequestID;
        status = data.Body.stkCallback.ResultCode === 0 ? 'success' : 'failed';
        amount = data.Body.stkCallback.CallbackMetadata?.Item?.find(item => item.Name === 'Amount')?.Value;
        phone_number = data.Body.stkCallback.CallbackMetadata?.Item?.find(item => item.Name === 'PhoneNumber')?.Value;
        break;
      case 'pesepal':
        reference = data.merchant_reference;
        status = data.status.toLowerCase();
        amount = data.amount;
        phone_number = data.phone_number;
        break;
      default:
        reference = data.reference || data.transaction_id;
        status = data.status;
        amount = data.amount;
        phone_number = data.phone_number;
    }

    if (!reference) {
      throw new Error('No transaction reference provided');
    }

    // Find payment transaction
    const transaction = await db('payment_transactions')
      .where('reference', reference)
      .first();

    if (!transaction) {
      throw new Error(`Transaction not found: ${reference}`);
    }

    // Validate status
    let paymentStatus = 'failed';
    if (status === 'success' || status === 'completed' || status === 'SUCCESS' || status === 'paid') {
      paymentStatus = 'completed';
    } else if (status === 'pending' || status === 'processing') {
      paymentStatus = 'processing';
    }

    // Update payment transaction
    await db('payment_transactions').where('id', transaction.id).update({
      status: paymentStatus,
      processed_at: new Date(),
      provider_response: JSON.stringify(data)
    });

    // Update payment record
    const updateData = {
      status: paymentStatus,
      updated_at: new Date()
    };

    if (paymentStatus === 'completed') {
      updateData.paid_at = new Date();
    }

    await db('payments').where('id', transaction.payment_id).update(updateData);

    return {
      transactionRef: reference,
      paymentId: transaction.payment_id,
      status: paymentStatus,
      amount: amount,
      processedAt: new Date()
    };
  } catch (error) {
    throw new Error(`Webhook processing failed: ${error.message}`);
  }
}

/**
 * Get payment status
 * @param {number} paymentId - Payment ID
 * @returns {Object} Payment status details
 */
async function getPaymentStatus(paymentId) {
  try {
    const payment = await db('payments')
      .select('payments.*', 'payment_transactions.provider_response')
      .leftJoin('payment_transactions', 'payments.id', 'payment_transactions.payment_id')
      .where('payments.id', paymentId)
      .first();

    if (!payment) {
      throw new Error('Payment not found');
    }

    return {
      paymentId: payment.id,
      referenceId: payment.reference_id,
      amount: payment.amount,
      fee: payment.fee,
      totalAmount: payment.total_amount,
      currency: payment.currency,
      method: payment.payment_method,
      provider: payment.provider,
      status: payment.status,
      phoneNumber: payment.phone_number,
      createdAt: payment.created_at,
      paidAt: payment.paid_at,
      providerResponse: payment.provider_response ? JSON.parse(payment.provider_response) : null
    };
  } catch (error) {
    throw new Error(`Failed to get payment status: ${error.message}`);
  }
}

/**
 * Verify payment is legitimate (anti-fraud check)
 * @param {number} paymentId - Payment ID
 * @returns {Object} Verification result
 */
async function verifyPayment(paymentId) {
  try {
    const payment = await db('payments')
      .select('payments.*', 'users.id as user_id', 'users.email', 'users.phone')
      .join('users', 'payments.user_id', 'users.id')
      .where('payments.id', paymentId)
      .first();

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Perform fraud checks
    const fraudScore = performFraudChecks(payment);
    const isLegitimate = fraudScore < 50; // Score < 50 is considered legitimate

    // Log verification
    await db('payment_verifications').insert({
      payment_id: paymentId,
      fraud_score: fraudScore,
      is_legitimate: isLegitimate,
      checks_performed: {
        amountRange: checkAmountRange(payment),
        frequencyCheck: await checkTransactionFrequency(payment),
        geoCheck: checkGeoLocation(payment),
        deviceCheck: checkDeviceConsistency(payment)
      },
      verified_at: new Date()
    });

    return {
      paymentId,
      isLegitimate,
      fraudScore,
      status: isLegitimate ? 'verified' : 'review_required',
      message: isLegitimate ? 'Payment verified' : 'Payment requires manual review'
    };
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}

/**
 * Process refund for Kenyan payment
 * @param {number} paymentId - Original payment ID
 * @param {string} reason - Refund reason
 * @returns {Object} Refund details
 */
async function processRefund(paymentId, reason) {
  try {
    const payment = await db('payments')
      .where('id', paymentId)
      .where('status', 'completed')
      .first();

    if (!payment) {
      throw new Error('Payment not found or already refunded');
    }

    // Create refund record
    const refund = await db('payment_refunds').insert({
      payment_id: paymentId,
      user_id: payment.user_id,
      amount: payment.total_amount,
      currency: payment.currency,
      method: payment.payment_method,
      reason,
      status: 'initiated',
      reference_id: `REFUND-${generateTransactionReference(payment.payment_method)}`,
      initiated_at: new Date()
    });

    // Update payment status
    await db('payments').where('id', paymentId).update({
      status: 'refunded',
      updated_at: new Date()
    });

    return {
      refundId: refund[0],
      originalPaymentId: paymentId,
      amount: payment.total_amount,
      currency: payment.currency,
      method: payment.payment_method,
      status: 'initiated',
      referenceId: `REFUND-${paymentId}`
    };
  } catch (error) {
    throw new Error(`Refund processing failed: ${error.message}`);
  }
}

/**
 * Get transaction history for a user
 * @param {number} userId - User ID
 * @param {number} limit - Limit results
 * @param {number} offset - Pagination offset
 * @returns {Array} Transaction history
 */
async function getTransactionHistory(userId, limit = 50, offset = 0) {
  try {
    const transactions = await db('payments')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return transactions.map(t => ({
      paymentId: t.id,
      amount: t.amount,
      fee: t.fee,
      totalAmount: t.total_amount,
      currency: t.currency,
      method: t.payment_method,
      status: t.status,
      reference: t.reference_id,
      createdAt: t.created_at,
      completedAt: t.paid_at
    }));
  } catch (error) {
    throw new Error(`Failed to get transaction history: ${error.message}`);
  }
}

/**
 * Get payment statistics for platform
 * @returns {Object} Payment statistics
 */
async function getPaymentStatistics() {
  try {
    const stats = await db('payments')
      .select(
        db.raw('COUNT(*) as total_transactions'),
        db.raw('SUM(CASE WHEN status = "completed" THEN 1 ELSE 0 END) as successful_transactions'),
        db.raw('SUM(CASE WHEN status = "completed" THEN amount ELSE 0 END) as total_revenue'),
        db.raw('SUM(CASE WHEN status = "completed" THEN fee ELSE 0 END) as total_fees'),
        db.raw('payment_method, COUNT(*) as count'),
      )
      .where('currency', 'KES')
      .groupBy('payment_method')
      .first();

    return {
      totalTransactions: stats.total_transactions || 0,
      successfulTransactions: stats.successful_transactions || 0,
      totalRevenue: parseFloat(stats.total_revenue || 0),
      totalFees: parseFloat(stats.total_fees || 0),
      averageTransactionValue: stats.total_revenue / Math.max(stats.successful_transactions, 1)
    };
  } catch (error) {
    throw new Error(`Failed to get payment statistics: ${error.message}`);
  }
}

// Provider-specific payment initiation functions

/**
 * Initiate M-Pesa STK Push payment
 */
async function initiateMpesaPayment(transactionRef, phoneNumber, amount, email) {
  try {
    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const callbackUrl = process.env.MPESA_CALLBACK_URL;

    // Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const accessToken = tokenResponse.data.access_token;

    // Format phone number
    const formattedPhone = phoneNumber.replace(/^0/, '+254');

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').substring(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

    // STK Push request
    const stkResponse = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: transactionRef,
        TransactionDesc: `Shashapass Payment - ${transactionRef}`
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return {
      message: 'Please enter your M-Pesa PIN to complete the payment',
      checkoutRequestID: stkResponse.data.CheckoutRequestID
    };
  } catch (error) {
    throw new Error(`M-Pesa initiation failed: ${error.message}`);
  }
}

/**
 * Initiate Pesepal payment
 */
async function initiatePesepalPayment(transactionRef, amount, email, phoneNumber) {
  try {
    const consumerKey = process.env.PESEPAL_CONSUMER_KEY;
    const consumerSecret = process.env.PESEPAL_CONSUMER_SECRET;
    const callbackUrl = process.env.PESEPAL_CALLBACK_URL;

    // Get OAuth token
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const tokenResponse = await axios.post(
      'https://demo.pesepal.com/api/Auth/RequestToken',
      {},
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const token = tokenResponse.data.token;

    // Submit order
    const orderResponse = await axios.post(
      'https://demo.pesepal.com/api/Transact/SubmitOrderRequest',
      {
        amount: amount,
        currency: 'KES',
        description: `Shashapass Payment - ${transactionRef}`,
        type: 'MERCHANT',
        reference: transactionRef,
        email: email,
        phonenumber: phoneNumber,
        callback_url: callbackUrl,
        redirect_mode: '',
        first_name: '',
        last_name: '',
        middle_name: ''
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return {
      message: 'Please complete the payment on the Pesepal payment page',
      paymentUrl: orderResponse.data.redirect_url,
      orderTrackingId: orderResponse.data.order_tracking_id
    };
  } catch (error) {
    throw new Error(`Pesepal initiation failed: ${error.message}`);
  }
}

/**
 * Initiate Equitel payment
 */
async function initiateEquitelPayment(transactionRef, phoneNumber, amount) {
  try {
    // Placeholder implementation
    return {
      message: 'Please approve the payment on your Equitel account',
      checkoutRequestID: `EQ${transactionRef}`
    };
  } catch (error) {
    throw new Error(`Equitel initiation failed: ${error.message}`);
  }
}

/**
 * Initiate Airtel Money payment
 */
async function initiateAirtelMoneyPayment(transactionRef, phoneNumber, amount) {
  try {
    // Placeholder implementation
    return {
      message: 'Please approve the payment on your Airtel Money account',
      checkoutRequestID: `AM${transactionRef}`
    };
  } catch (error) {
    throw new Error(`Airtel Money initiation failed: ${error.message}`);
  }
}

/**
 * Initiate T-Kash payment
 */
async function initiateTkashPayment(transactionRef, phoneNumber, amount) {
  try {
    // Placeholder implementation
    return {
      message: 'Please approve the payment on your T-Kash account',
      checkoutRequestID: `TK${transactionRef}`
    };
  } catch (error) {
    throw new Error(`T-Kash initiation failed: ${error.message}`);
  }
}

// Helper Functions

/**
 * Validate Kenyan phone number
 * @param {string} phoneNumber - Phone number
 * @returns {boolean} Is valid
 */
function validateKenyanPhoneNumber(phoneNumber) {
  // Kenya format: +254XXXXXXXXX or 07XXXXXXXXX
  const kenyaPhoneRegex = /^(\+254|0)[7][0-9]{8}$/;
  return kenyaPhoneRegex.test(phoneNumber.replace(/\s/g, ''));
}

/**
 * Generate unique transaction reference
 * @param {string} method - Payment method
 * @returns {string} Reference
 */
function generateTransactionReference(method) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const methodCode = method.substring(0, 3).toUpperCase();
  return `${methodCode}${timestamp}${random}`;
}

/**
 * Perform fraud checks on payment
 * @param {Object} payment - Payment object
 * @returns {number} Fraud score (0-100)
 */
function performFraudChecks(payment) {
  let score = 0;

  // Check amount range
  if (!checkAmountRange(payment)) {
    score += 20;
  }

  // Check for unusual patterns
  if (payment.amount > 50000) {
    score += 10; // Large transactions get slightly higher score
  }

  // Check device consistency
  if (!checkDeviceConsistency(payment)) {
    score += 15;
  }

  return score;
}

/**
 * Check if amount is within reasonable range
 * @param {Object} payment - Payment object
 * @returns {boolean} Is valid
 */
function checkAmountRange(payment) {
  const config = GATEWAY_CONFIG[payment.payment_method];
  return payment.amount >= config.minAmount && payment.amount <= config.maxAmount;
}

/**
 * Check transaction frequency for user
 * @param {Object} payment - Payment object
 * @returns {Promise<boolean>} Is valid
 */
async function checkTransactionFrequency(payment) {
  try {
    const recentPayments = await db('payments')
      .where('user_id', payment.user_id)
      .where('status', 'completed')
      .where('created_at', '>', db.raw('NOW() - INTERVAL 1 HOUR'))
      .count('* as count')
      .first();

    // Flag if more than 5 transactions in last hour
    return (recentPayments.count || 0) <= 5;
  } catch {
    return true; // Allow if check fails
  }
}

/**
 * Check geolocation consistency
 * @param {Object} payment - Payment object
 * @returns {boolean} Is valid
 */
function checkGeoLocation(payment) {
  // Implement geolocation check based on IP
  // For now, assume valid if payment_country is KE
  return true;
}

/**
 * Check device consistency
 * @param {Object} payment - Payment object
 * @returns {boolean} Is valid
 */
function checkDeviceConsistency(payment) {
  // Check if device/IP is consistent with user's history
  // For now, assume valid
  return true;
}

module.exports = {
  getAvailablePaymentMethods,
  initiatePayment,
  handlePaymentCallback,
  getPaymentStatus,
  verifyPayment,
  processRefund,
  getTransactionHistory,
  getPaymentStatistics
};
