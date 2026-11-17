const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const alertRoutes = require('./routes/alertRoutes');
const automataRoutes = require('./routes/automataRoutes');
const { seedSampleTraffic } = require('./utils/seedData');

const app = express();

// Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline styles & fonts in dev
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-ID'],
  })
);

// Express rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this client IP, please try again later.',
  },
});
app.use('/api/', limiter);

// Request body size limits & JSON parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ONLINE',
    service: 'Intelligent API Security and Request Validation Platform',
    timestamp: new Date(),
  });
});

// Seed traffic endpoint for demo control
app.post('/api/demo/seed', async (req, res, next) => {
  try {
    await seedSampleTraffic();
    res.status(200).json({
      success: true,
      message: 'Demonstration traffic generated successfully.',
    });
  } catch (err) {
    next(err);
  }
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/automata', automataRoutes);

// Static Frontend Serving (if built in client/dist)
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api') || req.originalUrl === '/health') {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  // 404 Route Handler for API endpoints
  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `API endpoint "${req.originalUrl}" not found on server.`,
    });
  });
}

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
