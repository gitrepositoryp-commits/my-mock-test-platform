const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  answersBreakdown: [
    {
      questionId: { type: Number, required: true },
      questionText: { type: String, required: true },
      options: [{ type: String }],
      selectedAnswer: { type: String, default: null },
      correctAnswer: { type: String, required: true },
      isCorrect: { type: Boolean, required: true }
    }
  ],
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', ResultSchema);