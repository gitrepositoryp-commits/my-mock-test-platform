const express = require("express");
const jwt = require("jsonwebtoken");
const Settings = require("../models/Settings");

const router = express.Router();

/* =========================
   ADMIN VERIFY
========================= */
function verifyAdmin(req, res, next) {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token required"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access only"
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }
}

/* =========================
   GET SETTINGS
========================= */
router.get("/", verifyAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load settings"
    });
  }
});

/* =========================
   UPDATE SETTINGS
========================= */
router.put("/", verifyAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create({});
    }

    const allowedFields = [
      "siteName",
      "siteStatus",
      "freeMockLimit",
      "premiumPrice",
      "premiumDays",
      "allowSignup",
      "showLeaderboard",
      "supportEmail"
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    await settings.save();

    res.json({
      success: true,
      message: "Settings updated successfully",
      settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update settings"
    });
  }
});

module.exports = router;