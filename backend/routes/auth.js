const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 1. STUDENT REGISTRATION PORTAL
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'An account with that email or username already exists.' });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

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
    res.status(500).json({ error: 'Server error processing registration parameters.' });
  }
});

// 2. STUDENT LOGIN VERIFICATION PORTAL
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid authentication credentials.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid authentication credentials.' });
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
    res.status(500).json({ error: 'Server error processing authentication verification.' });
  }
});

// CRITICAL EXPORT LINE: Fixes the Express routing middleware crash!
module.exports = router;