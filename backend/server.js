const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS CONFIGURATION
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// BODY PARSERS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// DATABASE CONNECTION
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("CRITICAL RUNTIME WARNING: MONGO_URI missing.");
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => {
  console.log('MongoDB Cloud Database Connected Successfully.');
})
.catch((err) => {
  console.error('Database connection error cascade:', err.message);
});

// ROUTES
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');
const paymentRoutes = require('./routes/payment');

// API ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/payment', paymentRoutes);

// HEALTH CHECK
app.get('/', (req, res) => {
  res.json({
    message: "Mock Test API is running smoothly."
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error(
    "UNHANDLED SYSTEM RUNTIME FAULT DETECTED:",
    err.stack
  );

  res.status(500).json({
    error: "Internal Server Error Cascade",
    message: err.message
  });
});

// SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server executing seamlessly on port ${PORT}`);
});
//Force Sync Deployment for Universal JSON Workspace Array v5.0