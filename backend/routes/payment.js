const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Payment = require("../models/Payment");

/* =========================
   LOCAL PROTECT MIDDLEWARE
========================= */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authorized, token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id: decoded.id || decoded.userId || decoded._id
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Not authorized, token failed" });
  }
};

/* =========================
   RAZORPAY CONFIG
========================= */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

/* =========================
   EMAIL CONFIG
========================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/* =========================
   CREATE ORDER
========================= */
router.post("/create-order", async (req, res) => {
  try {
    const options = {
      amount: 7900,
      currency: "INR",
      receipt: "premium_" + Date.now()
    };

    const order = await razorpay.orders.create(options);
    res.status(200).json(order);

  } catch (err) {
    console.error("RAZORPAY ORDER ERROR:", err);
    res.status(500).json({ error: "Failed to create payment order" });
  }
});

/* =========================
   VERIFY PAYMENT
========================= */
router.post("/verify-payment", async (req, res) => {
  try {
    const {
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        premiumStartedAt: startedAt,
        premiumExpiresAt: expiresAt
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await Payment.create({
      userId: user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: 79,
      currency: "INR",
      status: "success",
      premiumStartedAt: startedAt,
      premiumExpiresAt: expiresAt
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "RRB EDU Premium Activated Successfully",
      html: `
        <h2>Premium Membership Activated ✅</h2>
        <p>Hello ${user.username || "Student"},</p>
        <p>Your RRB EDU Premium Membership has been activated successfully.</p>
        <hr>
        <p><strong>Payment ID:</strong> ${razorpay_payment_id}</p>
        <p><strong>Amount:</strong> ₹79</p>
        <p><strong>Premium Valid Until:</strong> ${expiresAt.toLocaleDateString()}</p>
        <hr>
        <p>Thank you for choosing RRB EDU.</p>
        <p>Website: https://rrbedu.online</p>
      `
    });

    console.log("PAYMENT RECEIPT EMAIL SENT TO:", user.email);

    res.status(200).json({
      message: "Payment verified and premium activated",
      isPremium: user.isPremium,
      premiumExpiresAt: user.premiumExpiresAt
    });

  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    res.status(500).json({ error: "Payment verification failed" });
  }
});

/* =========================
   USER PAYMENT HISTORY
========================= */
router.get("/my-payments", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token missing" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = decoded.id || decoded.userId || decoded._id;

    console.log("PAYMENT HISTORY USER ID:", userId);

    const payments = await Payment.find({
      userId: userId
    }).sort({ createdAt: -1 });

    res.status(200).json(payments);

  } catch (err) {
    console.error("MY PAYMENTS ERROR:", err.message);

    res.status(500).json({
      error: "Failed to load payments"
    });
  }
});

/* =========================
   ADMIN PAYMENTS
========================= */
router.get("/admin/payments", async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);

  } catch (err) {
    console.error("ADMIN PAYMENTS ERROR:", err);
    res.status(500).json({
      error: "Failed to load payments"
    });
  }
});
router.get("/test-email", async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "RRB EDU Test Email",
      html: "<h2>RRB EDU email system is working ✅</h2>"
    });

    console.log("TEST EMAIL SENT TO:", process.env.EMAIL_USER);
    res.status(200).json({ message: "Test email sent successfully" });

  } catch (err) {
    console.error("TEST EMAIL ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;