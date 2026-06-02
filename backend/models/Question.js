const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correct: { type: String, required: true }
});

module.exports = mongoose.model('Question', QuestionSchema);