const mongoose = require('mongoose');

const ResultSchema = new mongoose.Schema({
 userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true,
  index: true
},

  examType: {
    type: String,
    required: true,
    trim: true,
    default: 'NTPC_FREE_1',
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
  default: 0,
  min: 0,
  max: 100
},

  answersBreakdown: [
    {
      questionId: {
        type: String,
        default: ""
      },

      questionText: {
        type: String,
        default: ""
      },

      selectedAnswer: {
        type: String,
        default: ""
      },

      correctAnswer: {
        type: String,
        default: ""
      },

      isCorrect: {
        type: Boolean,
        default: false
      },

      examType: {
        type: String,
        default: "NTPC_FREE_1"
      }
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Result', ResultSchema);