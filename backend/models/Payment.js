const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  razorpayOrderId: {
    type: String,
    required: true
  },

 razorpayPaymentId: {
  type: String,
  required: true,
  unique: true
},
  amount: {
    type: Number,
    default: 79
  },

  currency: {
    type: String,
    default: "INR"
  },

status: {
  type: String,
  enum: ["success", "failed", "pending"],
  default: "success"
},

  premiumStartedAt: {
    type: Date,
    required: true
  },

  premiumExpiresAt: {
    type: Date,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Payment", PaymentSchema);