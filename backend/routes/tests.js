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
    const submittedAnswers = answers || {};

    const fullQuestionPool = await Question.find({});
    let calculatedScore = 0;
    const dynamicBreakdown = [];

    fullQuestionPool.forEach((q) => {
      // Handles parsing safely across standard MongoDB ObjectIDs or sequential keys
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

    // EXECUTION HANDSHAKE: Commits cleanly to your remote database cluster
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
      .sort({ score: -1, percentage: -1, createdAt: -1 })
      .limit(10);
      
    res.status(200).json(podiumStandings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed compiling ranking datasets securely.' });
  }
});


// 6. ADMIN BULK UPLOADER ROUTE: Injects an array of 100 questions instantly
router.post('/bulk-questions', async (req, res) => {
  try {
    const { questionsArray } = req.body;

    if (!questionsArray || !Array.isArray(questionsArray) || questionsArray.length === 0) {
      return res.status(400).json({ error: 'Payload must be a non-empty array of structured questions.' });
    }

    // Validate that every question in the batch meets structural criteria
    for (const q of questionsArray) {
      if (!q.question || !q.options || !Array.isArray(q.options) || q.options.length !== 4 || !q.correctAnswer) {
        return res.status(400).json({ 
          error: 'One or more questions are structurally invalid. Ensure each has text, 4 options, and a correct answer match.' 
        });
      }
    }

    // Insert the entire dataset into MongoDB Atlas simultaneously
    const insertedQuestions = await Question.insertMany(questionsArray);

    res.status(201).json({
      message: `Successfully bulk-uploaded ${insertedQuestions.length} questions into the database cluster!`,
      count: insertedQuestions.length
    });
  } catch (err) {
    console.error('CRITICAL BULK UPLOAD CRASH:', err.message);
    res.status(500).json({ error: 'Database transaction failed during batch insertion operations.' });
  }
});
// CRITICAL EXPORT LINE: Fixes the Express routing middleware crash!
// 7. ADMIN DELETE ALL QUESTIONS
router.delete('/questions/delete-all', async (req, res) => {
  try {

    const result = await Question.deleteMany({});

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} questions.`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("DELETE ALL ERROR:", err);

    res.status(500).json({
      error: "Failed to delete questions."
    });
  }
});
// 8. ADMIN DELETE ALL RESULTS
router.delete('/results/delete-all', async (req, res) => {
  try {
    const result = await Result.deleteMany({});

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} results.`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("DELETE RESULTS ERROR:", err);
    res.status(500).json({ error: "Failed to delete results." });
  }
});
// 9. ADMIN GET ALL QUESTIONS WITH ANSWERS
router.get('/admin/questions', async (req, res) => {
  try {
    const questions = await Question.find({}).sort({ createdAt: -1 });

    res.status(200).json(questions);

  } catch (err) {
    console.error("ADMIN QUESTIONS ERROR:", err);
    res.status(500).json({ error: "Failed to fetch admin questions." });
  }
});
// 10. ADMIN UPDATE SINGLE QUESTION
router.put('/admin/questions/:id', async (req, res) => {
  try {
    const { question, options, correctAnswer } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length !== 4 || !correctAnswer) {
      return res.status(400).json({
        error: "Question, 4 options, and correct answer are required."
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      { question, options, correctAnswer },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({ error: "Question not found." });
    }

    res.status(200).json({
      message: "Question updated successfully.",
      question: updatedQuestion
    });

  } catch (err) {
    console.error("UPDATE QUESTION ERROR:", err);
    res.status(500).json({ error: "Failed to update question." });
  }
});
module.exports = router;