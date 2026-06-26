const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examType: {
    type: String,
    required: true,
    trim: true,
    default: 'NTPC_FREE_1'
  },

  question: {
    type: String,
    required: true,
    trim: true
  },

  options: {
    type: [String],
    required: true,
    validate: [arrayLimit, 'A RRB EDU question must have exactly 4 selectable options.']
  },

  correctAnswer: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    default: 'General'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

function arrayLimit(val) {
  return val.length === 4;
}

module.exports = mongoose.model('Question', QuestionSchema);