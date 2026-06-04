const express = require('express');
const router = express.Router();
const Result = require('../models/Result'); 
const Question = require('../models/Question'); 
const jwt = require('jsonwebtoken');

// Inline Auth Token Verification Middleware
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

// 1. ADMIN ROUTE: Post a new single question
// FIXED: Pluralized path endpoint string to map with admin.html precisely
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body; 

    // Validation safety fallback
    if (!question || !options || !correctAnswer) {
      return res.status(400).json({ message: "Validation Failed: All question fields are required." });
    }

    const count = await Question.countDocuments();
    const newQuestion = new Question({
      id: count + 1,
      question,
      options,
      correctAnswer // Maps aligned key parameter names directly to your schema model
    });

    await newQuestion.save();
    res.status(201).json({ message: "Question added data successfully!" });
  } catch (err) {
    console.error("ADMIN ROUTE ERROR:", err.message);
    res.status(500).json({ message: "Database saving failed.", error: err.message });
  }
});

// 2. STUDENT ROUTE: Fetch test questions safely 
router.get('/questions', protect, async (req, res) => {
  try {
    const dbQuestions = await Question.find({}, '-correctAnswer'); 
    res.json(dbQuestions);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch questions" });
  }
});

// 3. STUDENT ROUTE: Secure Exam Assessment Submission Routing
router.post('/submit', protect, async (req, res) => {
  try {
    const incomingPayload = req.body.answers || req.body;
    let score = 0;
    const answersBreakdown = [];
    const masterQuestions = await Question.find({});

    if (masterQuestions.length === 0) {
      return res.status(400).json({ error: "Database question bank partition is currently empty." });
    }

    masterQuestions.forEach((q) => {
      let selected = null;
      if (incomingPayload[q.id] !== undefined) {
        selected = incomingPayload[q.id];
      } else if (incomingPayload[q._id] !== undefined) {
        selected = incomingPayload[q._id];
      }

      const isCorrect = selected !== null && String(selected).trim() === String(q.correctAnswer).trim();
      if (isCorrect) score++;

      answersBreakdown.push({
        questionId: String(q._id),
        questionText: q.question,
        options: q.options,
        selectedAnswer: selected ? String(selected) : "Unanswered",
        correctAnswer: q.correctAnswer,
        isCorrect: isCorrect
      });
    });

    const totalQuestions = masterQuestions.length;
    const percentage = parseFloat(((score / totalQuestions) * 100).toFixed(2));

    const newResult = new Result({
      user: req.userId,
      score: score,
      totalQuestions: totalQuestions,
      percentage: percentage,
      answersBreakdown: answersBreakdown
    });

    await newResult.save();
    res.status(201).json({ resultId: newResult._id, score, totalQuestions, percentage });
  } catch (err) {
    console.error("EVALUATION FAULT LOGGED:", err.message);
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