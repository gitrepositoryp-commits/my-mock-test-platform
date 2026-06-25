const mongoose = require("mongoose");

const settingsSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      default: "RRB EDU"
    },

    siteStatus: {
      type: String,
      enum: ["active", "maintenance"],
      default: "active"
    },

    freeMockLimit: {
      type: Number,
      default: 3
    },

    premiumPrice: {
      type: Number,
      default: 79
    },

    premiumDays: {
      type: Number,
      default: 30
    },

    allowSignup: {
      type: Boolean,
      default: true
    },

    showLeaderboard: {
      type: Boolean,
      default: true
    },

    supportEmail: {
      type: String,
      default: "support@rrbedu.online"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Settings", settingsSchema);