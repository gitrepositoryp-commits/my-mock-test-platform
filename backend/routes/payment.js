const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const User = require("../models/User");

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

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

module.exports = router;