const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("MONGO_URI is missing from environment definitions.");
  process.exit(1);
}

mongoose.connect(mongoURI)
.then(() => console.log('MongoDB Cloud Database Connected Successfully.'))
.catch(err => console.error('Database connection error:', err.message));

// Loading clean sub-router modules securely
const authRoutes = require('./routes/auth');
const testRoutes = require('./routes/tests');

// Line 39-40: Mount the router functions natively
app.use('/api/auth', authRoutes);
app.use('/api/tests', testRoutes);

app.get('/', (req, res) => {
  res.json({ message: "Mock Test API is running smoothly." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server executing seamlessly on port ${PORT}`);
});

// Trigger Auto-Deploy for Smart PDF Parser Patch v2.0