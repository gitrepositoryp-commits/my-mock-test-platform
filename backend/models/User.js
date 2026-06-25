const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },

  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },

  password: {
    type: String,
    required: true,
    minlength: 6
  },

  isAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
  type: Boolean,
  default: true
},

  isPremium: {
    type: Boolean,
    default: false
  },

  premiumStartedAt: {
    type: Date,
    default: null
  },

  premiumExpiresAt: {
    type: Date,
    default: null
  },

  resetOtp: {
    type: String,
    default: null
  },

  resetOtpExpires: {
    type: Date,
    default: null
  },

  resetOtpVerified: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);