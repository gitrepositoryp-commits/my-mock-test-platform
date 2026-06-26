const express = require("express");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Question = require("../models/Question");
const Result = require("../models/Result");
const Payment = require("../models/Payment");

const router = express.Router();

/* ADMIN PROTECTION */
const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Admin token required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "username email isAdmin isActive"
    );

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access only." });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid admin session." });
  }
};

/* EXPORT USERS */
router.get("/users", adminProtect, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -resetOtp -resetOtpExpires -resetOtpVerified")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      type: "users",
      count: users.length,
      exportedAt: new Date(),
      data: users
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to export users." });
  }
});

/* EXPORT QUESTIONS */
router.get("/questions", adminProtect, async (req, res) => {
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 });

    res.json({
      success: true,
      type: "questions",
      count: questions.length,
      exportedAt: new Date(),
      data: questions
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to export questions." });
  }
});

/* EXPORT RESULTS */
router.get("/results", adminProtect, async (req, res) => {
  try {
    const results = await Result.find({})
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      type: "results",
      count: results.length,
      exportedAt: new Date(),
      data: results
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to export results." });
  }
});

/* EXPORT PAYMENTS */
router.get("/payments", adminProtect, async (req, res) => {
  try {
    const payments = await Payment.find({})
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      type: "payments",
      count: payments.length,
      exportedAt: new Date(),
      data: payments
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to export payments." });
  }
});

module.exports = router;