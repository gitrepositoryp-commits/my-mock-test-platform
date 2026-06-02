const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  question: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true } //  FIXED: Changed 'correct' to 'correctAnswer'
});

module.exports = mongoose.model('Question', questionSchema);