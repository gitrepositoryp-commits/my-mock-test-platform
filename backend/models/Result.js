const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  examType: {
    type: String,
    enum: ['NTPC', 'GROUP_D', 'GROUP_2'],
    default: 'NTPC',
    index: true
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
      questionId: { type: String, default: "" },
      questionText: { type: String, default: "" },
      selectedAnswer: { type: String, default: "" },
      correctAnswer: { type: String, default: "" },
      isCorrect: { type: Boolean, default: false },
      examType: { type: String, default: "NTPC" }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', ResultSchema);