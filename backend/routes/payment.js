const express = require("express");
const router = express.Router();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const Payment = require("../models/Payment");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_KEY
  }
});

async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token required." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "username email isAdmin isPremium premiumExpiresAt"
    );

    if (!user) {
      return res.status(401).json({ error: "User not found." });
    }

    req.user = user;
    next();

  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

async function adminProtect(req, res, next) {
  try {
    await protect(req, res, async () => {
      if (!req.user.isAdmin && req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: "Admin access only." });
      }
      next();
    });
  } catch {
    return res.status(401).json({ error: "Invalid admin session." });
  }
}

/* CREATE RAZORPAY ORDER */
router.post("/create-order", protect, async (req, res) => {
  try {
    const options = {
      amount: 100,
      currency: "INR",
      receipt: `prem_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json(order);

  } catch (err) {
    console.error("RAZORPAY ORDER ERROR FULL:", err);
console.error("RAZORPAY ORDER ERROR MESSAGE:", err.message);
console.error("RAZORPAY ORDER ERROR DESCRIPTION:", err.error?.description);
    res.status(500).json({ error: "Failed to create payment order." });
  }
});

/* VERIFY PAYMENT */
router.post("/verify-payment", protect, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: "Payment details missing." });
    }

    const duplicatePayment = await Payment.findOne({
      razorpayPaymentId: razorpay_payment_id
    });

    if (duplicatePayment) {
      return res.status(400).json({ error: "Payment already verified." });
    }

    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ error: "Invalid payment signature." });
    }

    const startedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    req.user.isPremium = true;
    req.user.premiumStartedAt = startedAt;
    req.user.premiumExpiresAt = expiresAt;

    await req.user.save();

    await Payment.create({
      userId: req.user._id,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: 79,
      currency: "INR",
      status: "success",
      premiumStartedAt: startedAt,
      premiumExpiresAt: expiresAt
    });

    try {
      await transporter.sendMail({
        from: `"RRB EDU" <${process.env.BREVO_FROM_EMAIL}>`,
        to: req.user.email,
        subject: "RRB EDU Premium Activated Successfully",
        html: `
          <h2>Premium Membership Activated ✅</h2>
          <p>Hello ${req.user.username || "Student"},</p>
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
    } catch (emailErr) {
      console.error("EMAIL RECEIPT FAILED:", emailErr.message);
    }

    res.status(200).json({
      message: "Payment verified and premium activated.",
      isPremium: true,
      premiumExpiresAt: expiresAt
    });

  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err.message);
    res.status(500).json({ error: "Payment verification failed." });
  }
});

/* USER PAYMENT HISTORY */
router.get("/my-payments", protect, async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(payments);
  } catch (err) {
    console.error("MY PAYMENTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to load payments." });
  }
});

/* ADMIN PAYMENT HISTORY */
router.get("/admin/payments", adminProtect, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(payments);
  } catch (err) {
    console.error("ADMIN PAYMENTS ERROR:", err.message);
    res.status(500).json({ error: "Failed to load payments." });
  }
});

module.exports = router;