const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS CONFIGURATION: Unblocks cross-origin preflight requests from Vercel hosting CDNs
app.use(cors({
  origin: '*', 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Standard middleware object request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection Integration
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("CRITICAL RUNTIME WARNING: MONGO_URI string variable missing from environment definitions.");
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB Cloud Database Connected Successfully.'))
.catch(err => console.error('Database connection error cascade:', err.message));

// Mount Decoupled Routing Elements 
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);

// Base Universal Health Check Endpoint
app.get('/', (req, res) => {
  res.json({ message: "Mock Test API is running smoothly." });
});

// Centralized Express Global Exception Catch Fallback Gateway
app.use((err, req, res, next) => {
  console.error("UNHANDLED SYSTEM RUNTIME FAULT DETECTED:", err.stack);
  res.status(500).json({ error: "Internal Server Error Cascade", message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing seamlessly on port ${PORT}`);
});

// Clean and verified deployment comment check
// Force Sync Deployment for Universal JSON Workspace Array v5.0