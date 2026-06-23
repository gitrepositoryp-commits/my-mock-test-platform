const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

/* CREATE JWT TOKEN */
const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin || false
    },
    process.env.JWT_SECRET,
    { expiresIn: "24h" }
  );
};

/* EMAIL TRANSPORTER */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* REGISTER - STUDENTS ONLY */
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: "Please provide all required fields."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters."
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    const existingUser = await User.findOne({
      $or: [
        { email: cleanEmail },
        { username: cleanUsername }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        error: "An account with that email or username already exists."
      });
    }

    const newUser = new User({
      username: cleanUsername,
      email: cleanEmail,
      password,
      isAdmin: false
    });

    await newUser.save();

    const token = createToken(newUser);

    res.status(201).json({
      token,
      isAdmin: false,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        isAdmin: false,
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

/* LOGIN - STUDENT OR ADMIN */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: "Please provide both email and password."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

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
      isAdmin: user.isAdmin || false,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin || false,
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

/* FORGOT PASSWORD - SEND OTP */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: "Email is required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(404).json({
        error: "No account found with this email."
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetOtp = otp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000;
    user.resetOtpVerified = false;

    await user.save();

    await transporter.sendMail({
      from: `"RRB EDU Mock Test" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "RRB EDU Password Reset OTP",
      html: `
        <div style="font-family:Arial;padding:20px;">
          <h2>RRB EDU Password Reset</h2>
          <p>Your OTP is:</p>
          <h1 style="letter-spacing:4px;color:#2563eb;">${otp}</h1>
          <p>This OTP is valid for 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: "OTP sent to your email."
    });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err.message);
    res.status(500).json({
      error: "Failed to send OTP. Check email configuration."
    });
  }
});

/* VERIFY OTP */
router.post("/verify-reset-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: "Email and OTP are required."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({
        error: "OTP not requested or expired."
      });
    }

    if (Date.now() > user.resetOtpExpires) {
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpVerified = false;
      await user.save();

      return res.status(400).json({
        error: "OTP expired. Please request again."
      });
    }

    if (user.resetOtp !== otp.toString()) {
      return res.status(400).json({
        error: "Invalid OTP."
      });
    }

    user.resetOtpVerified = true;
    await user.save();

    res.json({
      success: true,
      message: "OTP verified successfully."
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err.message);
    res.status(500).json({
      error: "OTP verification failed."
    });
  }
});

/* RESET PASSWORD */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        error: "Email, OTP and new password are required."
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters."
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user || !user.resetOtp || !user.resetOtpExpires) {
      return res.status(400).json({
        error: "OTP not requested or expired."
      });
    }

    if (Date.now() > user.resetOtpExpires) {
      user.resetOtp = null;
      user.resetOtpExpires = null;
      user.resetOtpVerified = false;
      await user.save();

      return res.status(400).json({
        error: "OTP expired. Please request again."
      });
    }

    if (user.resetOtp !== otp.toString()) {
      return res.status(400).json({
        error: "Invalid OTP."
      });
    }

    user.password = newPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    user.resetOtpVerified = false;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful. Please login with new password."
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err.message);
    res.status(500).json({
      error: "Password reset failed."
    });
  }
});

/* PREMIUM STATUS */
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