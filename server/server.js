// server.js - Main entry point for your notification server

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
  console.log('NODE_ENV not set, defaulting to development');
}

// Import Firebase Admin from the centralized initialization file
const admin = require('./firebaseAdmin');

// Log the Firebase project ID to verify initialization
console.log("==============================");
console.log("SERVER FIREBASE PROJECT ID:", admin.app().options.projectId);
console.log("==============================");

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(morgan('dev')); // Request logging

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    firebase: 'initialized',
    env: process.env.NODE_ENV,
    projectId: admin.app().options.projectId
  });
});

// Import routes
let notificationRoutes, reservationRoutes, debugRoutes;
try {
  const cronService = require('./services/cronService');
  cronService.initCronJobs();
  console.log('Cron jobs initialized');
} catch (error) {
  console.error('Error initializing cron jobs:', error);
}
try {
  // Standard API routes
  notificationRoutes = require('./routes/notifications');
  reservationRoutes = require('./routes/reservations');
  
  // Debug routes (only active in development)
  if (process.env.NODE_ENV === 'development') {
    debugRoutes = require('./routes/debug');
    app.use('/debug', debugRoutes);
    console.log('🔧 Debug routes enabled (DEVELOPMENT ONLY)');
  }
  
  // Add main API routes
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reservations', reservationRoutes);
  
  console.log('Routes initialized successfully');
} catch (error) {
  console.error('Error loading routes:', error);
  // Continue with limited functionality
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500
    }
  });
});

// Start cron jobs if available
try {
  const cronService = require('./services/cronService');
  cronService.initCronJobs();
  console.log('Cron jobs initialized');
} catch (error) {
  console.error('Error initializing cron jobs, continuing without them:', error.message);
}

// Show development mode warning
if (process.env.NODE_ENV === 'development') {
  console.log('\n⚠️  RUNNING IN DEVELOPMENT MODE');
  console.log('📌 Debug endpoints are enabled');
  console.log('📌 Testing features are available');
  console.log('📌 Test notifications with: curl -X POST http://localhost:5007/debug/send-notification -H "Content-Type: application/json" -d \'{"userId":"YOUR_USER_ID","title":"Test","body":"This is a test notification"}\'');
  console.log('📌 Get a test token with: curl http://localhost:5007/debug/token/YOUR_USER_ID\n');
}

// Start server
const PORT = process.env.PORT || 5007;
app.listen(PORT, () => {
  console.log(`Notification server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app; // For testing