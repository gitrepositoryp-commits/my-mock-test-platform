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
  answersBreakdown: [
    {
      questionId: { type: String, required: true },
      questionText: { type: String, required: true },
      selectedAnswer: { type: String, default: "" },
      correctAnswer: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', ResultSchema);