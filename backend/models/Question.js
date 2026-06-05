const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
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

// Structural helper function validating target option array bounds
function arrayLimit(val) {
  return val.length === 4;
}

module.exports = mongoose.model('Question', QuestionSchema);