const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 1. STUDENT REGISTRATION ENDPOINT
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required registration fields.' });
    }

    // Check if user already exists by email or username
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with that email or username already exists.' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    // Sign a secure authorization token valid for 24 hours
    const token = jwt.sign(
      { id: newUser._id }, 
      process.env.JWT_SECRET || 'super_secret_mock_test_key_2026', 
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: { id: newUser._id, username: newUser.username, email: newUser.email }
    });
  } catch (err) {
    console.error('REGISTRATION ERROR:', err.message);
    res.status(500).json({ error: 'Server error processing student registration profile.' });
  }
});

// 2. STUDENT LOGIN VERIFICATION ENDPOINT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both your email and password credentials.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid account authentication credentials.' });
    }

    // Match entered plaintext password against database hash
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid account authentication credentials.' });
    }

    const token = jwt.sign(
      { id: user._id }, 
      process.env.JWT_SECRET || 'super_secret_mock_test_key_2026', 
      { expiresIn: '24h' }
    );

    res.status(200).json({
      token,
      user: { id: user._id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ error: 'Server error processing verification credentials loop.' });
  }
});

module.exports = router;