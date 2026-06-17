const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  examType: {
    type: String,
    required: true,
    enum: ['NTPC', 'GROUP_D', 'GROUP_2'],
    default: 'NTPC'
  },

  question: {
    type: String,
    required: true,
    trim: true
  },

  options: {
    type: [String],
    required: true,
    validate: [arrayLimit, 'A mock exam question must have exactly 4 selectable options.']
  },

  correctAnswer: {
    type: String,
    required: true,
    trim: true
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