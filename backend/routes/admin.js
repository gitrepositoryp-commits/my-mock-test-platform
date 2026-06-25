const express = require("express");
const router = express.Router();

const User = require("../models/User");
const jwt = require("jsonwebtoken");

/* ADMIN PROTECTION */
const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "Admin token required." });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("username email isAdmin isActive");

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access only." });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid admin session." });
  }
};

/* GET ALL STUDENTS */
router.get("/users", adminProtect, async (req, res) => {
  try {
    const users = await User.find({})
      .select("-password -resetOtp -resetOtpExpires")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to load users." });
  }
});

/* DEACTIVATE STUDENT */
router.put("/users/:id/deactivate", adminProtect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot deactivate your own admin account." });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select("-password -resetOtp -resetOtpExpires");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      success: true,
      message: "Student deactivated successfully.",
      user
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to deactivate user." });
  }
});

/* ACTIVATE STUDENT */
router.put("/users/:id/activate", adminProtect, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select("-password -resetOtp -resetOtpExpires");

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({
      success: true,
      message: "Student activated successfully.",
      user
    });

  } catch (err) {
    res.status(500).json({ error: "Failed to activate user." });
  }
});

/* OLD DELETE BLOCKED FOR SAFETY */
router.delete("/users/:id", adminProtect, async (req, res) => {
  return res.status(403).json({
    success: false,
    message: "Permanent delete is disabled. Use deactivate instead."
  });
});

module.exports = router;