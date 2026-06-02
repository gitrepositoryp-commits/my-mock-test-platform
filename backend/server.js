const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Cloud Database Connected Successfully.'))
  .catch(err => {
    console.error('Database connection error:', err.message);
    process.exit(1);
  });

// Base Route for Health Check
app.get('/', (req, res) => {
  res.json({ message: "Mock Test API is running smoothly." });
});

// Import Routes (To be created next)
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);

// Global Error Handler to catch unexpected issues without crashing
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing seamlessly on port ${PORT}`);
});