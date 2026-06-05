const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Result = require('../models/Result');
const jwt = require('jsonwebtoken');

// LOCAL SECURITY GATEWAY MIDDLEWARE: Verifies active student login status
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Session credentials missing. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_mock_test_key_2026');
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error('MIDDLEWARE AUTH BLOCK:', err.message);
    return res.status(401).json({ error: 'Your login token signature has expired or is invalid.' });
  }
};

// 1. ADMIN PANEL ROUTE: Injects a single question into the database cluster
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body;
    
    if (!question || !options || !correctAnswer) {
      return res.status(400).json({ error: 'Compulsory form parameter arrays missing.' });
    }

    const newQuestion = new Question({ question, options, correctAnswer });
    await newQuestion.save();
    res.status(201).json({ message: 'Question added data successfully!' });
  } catch (err) {
    console.error('ADMIN PORTAL POST ERROR:', err.message);
    res.status(500).json({ error: 'Failed to write your new question into the database.' });
  }
});

// 2. STUDENT ROUTE: Downloads available exam bank documents (Answers hidden from view)
router.get('/questions', protect, async (req, res) => {
  try {
    // Exclude 'correctAnswer' string to protect assessment contents from browser source inspectors
    const databaseQuestions = await Question.find({}, '-correctAnswer');
    res.status(200).json(databaseQuestions);
  } catch (err) {
    console.error('FETCH QUESTIONS ERROR:', err.message);
    res.status(500).json({ error: 'Failed to retrieve test bank entries securely.' });
  }
});

// 3. EXAM EVALUATION SPRINT ENGINE ROUTE: Validates choices, scores items, and writes logs
router.post('/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; 
    const submittedAnswers = answers || {};

    const fullQuestionPool = await Question.find({});
    let calculatedScore = 0;
    const dynamicBreakdown = [];

    fullQuestionPool.forEach((q) => {
      // Handles parsing across standard MongoDB ObjectIDs or sequential key types
      const qIDString = q._id ? q._id.toString() : (q.id ? q.id.toString() : "");
      const studentSelection = submittedAnswers[qIDString] || "";
      const isCorrectMatch = studentSelection.trim() === q.correctAnswer.trim();

      if (isCorrectMatch) {
        calculatedScore++;
      }

      dynamicBreakdown.push({
        questionId: qIDString,
        questionText: q.question || "Unknown Question",
        selectedAnswer: studentSelection,
        correctAnswer: q.correctAnswer || "",
        isCorrect: isCorrectMatch
      });
    });

    const accuracyPercentage = fullQuestionPool.length > 0 
      ? parseFloat(((calculatedScore / fullQuestionPool.length) * 100).toFixed(2)) 
      : 0;

    const resultRecord = new Result({
      userId: req.user.id,
      score: calculatedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      answersBreakdown: dynamicBreakdown
    });

    // EXECUTION HANDSHAKE: Commits cleanly to the cloud partition
    const savedResult = await resultRecord.save();

    res.status(200).json({
      message: "Assessment evaluation finalized cleanly.",
      score: calculatedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      resultId: savedResult._id
    });
  } catch (err) {
    console.error('BACKEND GRADING EVALUATION CRASHED:', err.stack);
    res.status(500).json({ error: 'Evaluation engine crash on transaction save execution.' });
  }
});