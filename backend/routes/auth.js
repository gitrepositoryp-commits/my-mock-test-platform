const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Please provide all required fields."
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({
        error: "An account with that email or username already exists."
      });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    const token = createToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isPremium: newUser.isPremium || false,
        premiumExpiresAt: newUser.premiumExpiresAt || null
      }
    });

  } catch (err) {
    console.error("REGISTRATION ERROR:", err.message);
    res.status(500).json({
      error: "Server error processing registration."
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide both email and password."
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        error: "Invalid authentication credentials."
      });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        error: "Invalid authentication credentials."
      });
    }

    const token = createToken(user);

    res.status(200).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isPremium: user.isPremium || false,
        premiumExpiresAt: user.premiumExpiresAt || null
      }
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err.message);
    res.status(500).json({
      error: "Server error processing login."
    });
  }
});

// PREMIUM STATUS
router.get("/premium-status/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        error: "User not found"
      });
    }

    res.json({
      isPremium: user.isPremium || false,
      premiumExpiresAt: user.premiumExpiresAt || null
    });

  } catch (err) {
    res.status(500).json({
      error: "Failed to check premium status"
    });
  }
});

module.exports = router;