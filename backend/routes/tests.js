const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Question = require('../models/Question'); // Import the new Question Model
const jwt = require('jsonwebtoken');

// In-line Auth Middleware
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Not authorized' });
    }
  }
  if (!token) return res.status(401).json({ error: 'Not authorized, no token' });
};

// 1. ADMIN ROUTE: Post a new question to the database
router.post('/add-question', async (req, res) => {
  try {
    const { question, options, correct } = req.body;
    
    // Auto-increment simple ID system based on current count
    const count = await Question.countDocuments();
    
    const newQuestion = new Question({
      id: count + 1,
      question,
      options,
      correct
    });

    await newQuestion.save();
    res.status(201).json({ message: "Question added to database successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to add question", message: err.message });
  }
});

// 2. STUDENT ROUTE: Fetch questions (hiding the 'correct' answer field)
router.get('/questions', protect, async (req, res) => {
  try {
    const dbQuestions = await Question.find({}, '-correct'); // Excludes the correct answer field for safety
    res.json(dbQuestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// 3. STUDENT ROUTE: Evaluate answers securely against DB records
router.post('/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; 
    let score = 0;
    const answersBreakdown = [];

    const masterQuestions = await Question.find({});

    masterQuestions.forEach((q) => {
      const selected = answers[q.id] || null;
      const isCorrect = selected === q.correct;
      if (isCorrect) score++;

      answersBreakdown.push({
        questionId: q.id,
        questionText: q.question,
        options: q.options,
        selectedAnswer: selected,
        correctAnswer: q.correct,
        isCorrect
      });
    });

    const totalQuestions = masterQuestions.length;
    const percentage = parseFloat(((score / totalQuestions) * 100).toFixed(2));

    const newResult = new Result({
      user: req.userId,
      score,
      totalQuestions,
      percentage,
      answersBreakdown
    });

    await newResult.save();
    res.status(201).json({ resultId: newResult._id, score, totalQuestions, percentage });
  } catch (err) {
    res.status(500).json({ error: "Evaluation processing failure", message: err.message });
  }
});

// 4. LEADERBOARD ROUTE
router.get('/leaderboard', async (req, res) => {
  try {
    const rankings = await Result.find().populate('user', 'username').sort({ score: -1 }).limit(10);
    const organizedRankings = rankings.map((r, i) => ({
      rank: i + 1,
      username: r.user ? r.user.username : 'Anonymous User',
      score: r.score,
      totalQuestions: r.totalQuestions,
      percentage: r.percentage,
      date: r.submittedAt
    }));
    res.json(organizedRankings);
  } catch (err) {
    res.status(500).json({ error: "Leaderboard collection error" });
  }
});

// 5. SINGLE RESULT ROUTE
router.get('/result/:id', protect, async (req, res) => {
  try {
    const record = await Result.findById(req.params.id);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Retrieval processing failure" });
  }
});

module.exports = router;