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

    const user = await User.findById(decoded.id).select("username email isAdmin");

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

/* DELETE ONE STUDENT */
router.delete("/users/:id", adminProtect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot delete your own admin account." });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({ error: "User not found." });
    }

    res.json({ message: "User deleted successfully." });

  } catch (err) {
    res.status(500).json({ error: "Failed to delete user." });
  }
});

module.exports = router;