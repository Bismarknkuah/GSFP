require('dotenv').config();
require('express-async-errors');
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { connect } = require('./db');
const { seed   } = require('./db/seed');
const errorHandler = require('./middleware/error');

async function boot() {
  // ── Database connection ─────────────────────────────────────
  try {
    await connect();
    await seed();
  } catch(e) {
    console.error('[boot] Fatal error:', e);
    process.exit(1);
  }

  const app = express();

  // ── CORS (Updated & Improved for Vercel) ────────────────────
  const allowedOrigins = [
    'https://gsfp-ten.vercel.app',
    'https://gsfp-git-main-desward-technology-s-projects.vercel.app',
    'https://gsfp-pkz9q24a3-desward-technology-s-projects.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.error(`[CORS] Blocked origin: ${origin}`);
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Length', 'X-RateLimit-Limit', 'X-RateLimit-Remaining']
  }));

  app.options('*', cors());

  // ── Body parsers ────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Static uploads ──────────────────────────────────────────
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // ── Request logger (dev only) ────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });
  }

  // ── Health check ─────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({
    status: 'ok',
    service: 'GSFP v2',
    env: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  }));

  // ── API Routes ───────────────────────────────────────────────
  app.use('/api/timetable',        require('./routes/timetable'));
  app.use('/api/expenditure',      require('./routes/expenditure'));
  app.use('/api/school-requests',  require('./routes/schoolRequests'));
  app.use('/api/payment-approval', require('./routes/paymentApproval'));
  app.use('/api/auth',             require('./routes/auth'));
  app.use('/api/password',         require('./routes/password'));
  app.use('/api/regions',          require('./routes/regions'));
  app.use('/api/districts',        require('./routes/districts'));
  app.use('/api/schools',          require('./routes/schools'));
  app.use('/api/users',            require('./routes/users'));
  app.use('/api/reports',          require('./routes/reports'));
  app.use('/api/payments',         require('./routes/payments'));
  app.use('/api/finance',          require('./routes/finance'));
  app.use('/api/analytics',        require('./routes/analytics'));
  app.use('/api/messages',         require('./routes/messages'));
  app.use('/api/audit',            require('./routes/audit'));
  app.use('/api/bulk',             require('./routes/bulkUpload'));
  app.use('/api/chatbot',          require('./routes/chatbot'));
  app.use('/api/disbursements',    require('./routes/disbursements'));
  app.use('/api/agents',           require('./routes/agents'));
  app.use('/api/official-reports', require('./routes/officialReports'));
  app.use('/api/notifications',    require('./routes/notifications'));
  app.use('/api/mfa',              require('./routes/mfa'));
  app.use('/api/enrollment',       require('./routes/enrollment'));
  app.use('/api/ghana-card',       require('./routes/ghanaCard'));

  // ── 404 handler ──────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  // ── Global error handler ─────────────────────────────────────
  app.use(errorHandler);

  // ── Start server ─────────────────────────────────────────────
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log('='.repeat(64));
    console.log('  Ghana School Feeding Programme — Management System v2');
    console.log(`  Listening on http://localhost:${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Allowed Origins: ${allowedOrigins.length}`);
    console.log('='.repeat(64));
  });
}

boot();