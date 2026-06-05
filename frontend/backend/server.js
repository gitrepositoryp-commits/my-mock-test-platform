const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// BULLETPROOF CORS INTEGRATION: Unblocks cross-origin requests from Vercel hosting CDNs completely
app.use(cors({
  origin: '*', // Allows secure communication pipelines from any public domain endpoint
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Express standard object parser extensions
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Primary Database Connection Engine Configuration Routing
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("CRITICAL ERROR: MONGO_URI is missing from environment configurations.");
  process.exit(1);
}

mongoose.connect(mongoURI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('MongoDB Cloud Database Connected Successfully.'))
.catch(err => console.error('Database connection error:', err.message));

// Decoupled App Router Mappings
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');

app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);

// Global Server Base Health Route Check
app.get('/', (req, res) => {
  res.json({ message: "Mock Test API is running smoothly." });
});

// Centralized Global Express Exception Handling Fallback
app.use((err, req, res, next) => {
  console.error("UNHANDLED SYSTEM RUNTIME FAULT:", err.stack);
  res.status(500).json({ error: "Internal Server Error Cascade", message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing seamlessly on port ${PORT}`);
});

// Triggering pipeline sync: Forcing backend compilation to register updated frontend script configurations.