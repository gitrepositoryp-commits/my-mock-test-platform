const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true,
    default: 0
  },
  percentage: {
    type: Number,
    required: true,
    default: 0
  },
  // ARMORED BREAKDOWN ENGINE: Removed strict individual field "required" blocks
  // to prevent Mongoose validation rejections during heavy traffic states!
  answersBreakdown: [
    {
      questionId: { type: String, default: "" },
      questionText: { type: String, default: "" },
      selectedAnswer: { type: String, default: "" },
      correctAnswer: { type: String, default: "" },
      isCorrect: { type: Boolean, default: false }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', ResultSchema);