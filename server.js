require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

/* =======================
   CORS CONFIG (RENDER SAFE)
======================= */
const allowedOrigins = [
  'https://frontend-o0q7.onrender.com',
  'http://localhost:3000',
  'http://localhost:3500',
  'http://localhost:3501',
  'http://127.0.0.1:3500'
];

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true); // Postman / server-to-server
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

/* =======================
   SOCKET.IO
======================= */
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

/* =======================
   SECURITY & LOGGING
======================= */
app.use(helmet());
app.use(morgan('combined'));

/* =======================
   BODY PARSING
======================= */
app.use((req, res, next) => {
  if (req.path === '/api/media/upload') return next();
  express.json({ limit: '50mb' })(req, res, next);
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* =======================
   STATIC FILES (Local uploads fallback)
======================= */
app.use('/uploads', express.static('uploads'));

/* =======================
   RATE LIMITING (PROD)
======================= */
if (process.env.NODE_ENV === 'production') {
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false
  }));
}

/* =======================
   DATABASE
======================= */
require('./config/database');

/* =======================
   ROUTES
======================= */
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/events', require('./routes/eventsApprovalNew'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/venues', require('./routes/venuesManagementNew'));
app.use('/api/venue-seat-types', require('./routes/venueSeatTypes'));
app.use('/api/streaming', require('./routes/streaming'));
app.use('/api/seats', require('./routes/seats'));
app.use('/api/nfc', require('./routes/nfc'));
app.use('/api/media', require('./routes/media'));
app.use('/api/seasonal-tickets', require('./routes/seasonalTickets'));
app.use('/api/ticket-templates', require('./routes/ticketTemplates'));
app.use('/api/merchandise', require('./routes/merchandise'));
app.use('/api/organizer', require('./routes/organizer'));
app.use('/api/admin/approvals', require('./routes/approvals'));
app.use('/api/payouts', require('./routes/payouts'));
app.use('/api/emails', require('./routes/emailNotifications'));

// Unified Booking System Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/commissions', require('./routes/commissions'));
app.use('/api/rbac', require('./routes/rbac'));
app.use('/api/guest', require('./routes/guest'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/payments', require('./routes/kenyaPayments'));
app.use('/api/hotels', require('./routes/hotels'));
app.use('/api/flights', require('./routes/flights'));
app.use('/api', require('./routes/settings'));

/* =======================
   HEALTH CHECK
======================= */
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    env: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

/* =======================
   SOCKET EVENTS
======================= */
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-event', (eventId) => {
    socket.join(`event-${eventId}`);
  });

  socket.on('leave-event', (eventId) => {
    socket.leave(`event-${eventId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/* =======================
   ERROR HANDLING
======================= */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

/* =======================
   START SERVER
======================= */
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
});

module.exports = { app, server, io };

