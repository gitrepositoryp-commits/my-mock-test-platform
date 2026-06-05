const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Result = require('../models/Result');
const jwt = require('jsonwebtoken');

// LOGICAL GATEWAY MIDDLEWARE: Verifies student authentication state context
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authorization token credentials missing.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_mock_test_key_2026');
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("MIDDLEWARE EXCEPTION BLOCK:", err.message);
    return res.status(401).json({ error: 'Session signature invalid or expired.' });
  }
};

// 1. INSTRUCTOR PORTAL: Add mock question to database cluster
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body;
    
    if (!question || !options || !correctAnswer) {
      return res.status(400).json({ error: 'Missing mandatory questionnaire properties.' });
    }

    const newQuestion = new Question({ question, options, correctAnswer });
    await newQuestion.save();
    res.status(201).json({ message: 'Question saved successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to write query record to collection.' });
  }
});

// 2. STUDENT PIPELINE: Downloads available questions pool (Hiding true answers)
router.get('/questions', protect, async (req, res) => {
  try {
    const databaseQuestions = await Question.find({}, '-correctAnswer');
    res.status(200).json(databaseQuestions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to retrieve test bank entries securely.' });
  }
});

// 3. PERFORMANCE ARCHITECTURE: Scores incoming answers, updates leaderboard collections
router.post('/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; 
    const studentAnswers = answers || {};

    const fullQuestionPool = await Question.find({});
    let computedScore = 0;
    const computedBreakdown = [];

    fullQuestionPool.forEach((q) => {
      const qIDStr = q._id ? q._id.toString() : "";
      const studentSelection = studentAnswers[qIDStr] || "";
      const isCorrectMatch = studentSelection.trim() === q.correctAnswer.trim();

      if (isCorrectMatch) {
        computedScore++;
      }

      computedBreakdown.push({
        questionId: qIDStr,
        questionText: q.question || "Blank Item",
        selectedAnswer: studentSelection,
        correctAnswer: q.correctAnswer || "",
        isCorrect: isCorrectMatch
      });
    });

    const accuracyPercentage = fullQuestionPool.length > 0 
      ? parseFloat(((computedScore / fullQuestionPool.length) * 100).toFixed(2)) 
      : 0;

    const resultRecord = new Result({
      userId: req.user.id,
      score: computedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      answersBreakdown: computedBreakdown
    });

    const savedDoc = await resultRecord.save();

    res.status(200).json({
      message: "Assessment evaluation finalized cleanly.",
      score: computedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      resultId: savedDoc._id
    });
  } catch (err) {
    console.error('CRITICAL BACKEND EVALUATION CRASH:', err.stack);
    res.status(500).json({ error: 'Evaluation engine crash on transaction save execution.' });
  }
});

// 4. DIAGNOSTIC INTERFACE: Pulls single scorecard log file for review metrics layout
router.get('/result/:id', protect, async (req, res) => {
  try {
    const logFile = await Result.findById(req.params.id);
    if (!logFile) {
      return res.status(404).json({ error: 'Assessment scorecard query not found.' });
    }
    res.status(200).json(logFile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal system log retrieval failure.' });
  }
});

// 5. GLOBAL PUBLIC PLACEMENTS: Pulls top ten sorted percentage results fields
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const podiumStandings = await Result.find({})
      .populate('userId', 'username')
      .sort({ percentage: -1, createdAt: -1 })
      .limit(10);
      
    res.status(200).json(podiumStandings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed compiling ranking datasets securely.' });
  }
});

// CRITICAL EXPORT LINE: Fixes the Express routing middleware crash!
module.exports = router;