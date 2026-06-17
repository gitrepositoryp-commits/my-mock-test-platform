const express = require('express');
const router = express.Router();
const Question = require('../models/Question');
const Result = require('../models/Result');
const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Authorization token credentials missing.' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'super_secret_mock_test_key_2026'
    );

    req.user = { id: decoded.id };
    next();

  } catch (err) {
    console.error("MIDDLEWARE EXCEPTION BLOCK:", err.message);
    return res.status(401).json({ error: 'Session signature invalid or expired.' });
  }
};

// 1. ADD SINGLE QUESTION
router.post('/questions', async (req, res) => {
  try {
    const { question, options, correctAnswer, examType } = req.body;

    if (!question || !options || !correctAnswer) {
      return res.status(400).json({
        error: 'Missing mandatory questionnaire properties.'
      });
    }

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      examType: examType || "NTPC"
    });

    await newQuestion.save();

    res.status(201).json({
      message: 'Question saved successfully!'
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to write query record to collection.'
    });
  }
});

// 2. GET QUESTIONS BY EXAM TYPE
router.get('/questions', protect, async (req, res) => {
  try {
    const examType = req.query.exam || "NTPC";

    const databaseQuestions = await Question.find(
      { examType },
      '-correctAnswer'
    );

    res.status(200).json(databaseQuestions);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to retrieve test bank entries securely.'
    });
  }
});

// 3. SUBMIT TEST BY EXAM TYPE
router.post('/submit', protect, async (req, res) => {
  try {
    const { answers, examType } = req.body;
    const submittedAnswers = answers || {};
    const selectedExam = examType || "NTPC";

    const fullQuestionPool = await Question.find({
      examType: selectedExam
    });

    let calculatedScore = 0;
    const dynamicBreakdown = [];

    fullQuestionPool.forEach((q) => {
      const qIDString = q._id
        ? q._id.toString()
        : (q.id ? q.id.toString() : "");

      const studentSelection = submittedAnswers[qIDString] || "";

      const isCorrectMatch =
        studentSelection.trim() === q.correctAnswer.trim();

      if (isCorrectMatch) {
        calculatedScore++;
      }

      dynamicBreakdown.push({
        questionId: qIDString,
        questionText: q.question || "Unknown Question",
        selectedAnswer: studentSelection,
        correctAnswer: q.correctAnswer || "",
        isCorrect: isCorrectMatch,
        examType: selectedExam
      });
    });

    const accuracyPercentage =
      fullQuestionPool.length > 0
        ? parseFloat(((calculatedScore / fullQuestionPool.length) * 100).toFixed(2))
        : 0;

    const resultRecord = new Result({
      userId: req.user.id,
      examType: selectedExam,
      score: calculatedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      answersBreakdown: dynamicBreakdown
    });

    const savedResult = await resultRecord.save();

    res.status(200).json({
      message: "Assessment evaluation finalized cleanly.",
      score: calculatedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      resultId: savedResult._id,
      examType: selectedExam
    });

  } catch (err) {
    console.error('BACKEND GRADING EVALUATION CRASHED:', err.stack);
    res.status(500).json({
      error: 'Evaluation engine crash on transaction save execution.'
    });
  }
});

// 4. GET SINGLE RESULT
router.get('/result/:id', protect, async (req, res) => {
  try {
    const logFile = await Result.findById(req.params.id);

    if (!logFile) {
      return res.status(404).json({
        error: 'Assessment scorecard query not found.'
      });
    }

    res.status(200).json(logFile);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Internal system log retrieval failure.'
    });
  }
});

// 5. LEADERBOARD
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const examType = req.query.exam;

    const filter = examType ? { examType } : {};

    const podiumStandings = await Result.find(filter)
      .populate('userId', 'username')
      .sort({ score: -1, percentage: -1, createdAt: -1 })
      .limit(10);

    res.status(200).json(podiumStandings);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed compiling ranking datasets securely.'
    });
  }
});

// 6. BULK UPLOAD QUESTIONS BY EXAM TYPE
router.post('/bulk-questions', async (req, res) => {
  try {
    const { questionsArray, examType } = req.body;

    if (!questionsArray || !Array.isArray(questionsArray) || questionsArray.length === 0) {
      return res.status(400).json({
        error: 'Payload must be a non-empty array of structured questions.'
      });
    }

    for (const q of questionsArray) {
      if (
        !q.question ||
        !q.options ||
        !Array.isArray(q.options) ||
        q.options.length !== 4 ||
        !q.correctAnswer
      ) {
        return res.status(400).json({
          error: 'One or more questions are structurally invalid. Ensure each has text, 4 options, and a correct answer match.'
        });
      }
    }

    const finalQuestions = questionsArray.map(q => ({
      ...q,
      examType: examType || q.examType || "NTPC"
    }));

    const insertedQuestions = await Question.insertMany(finalQuestions);

    res.status(201).json({
      message: `Successfully bulk-uploaded ${insertedQuestions.length} questions into ${examType || "NTPC"} database cluster!`,
      count: insertedQuestions.length
    });

  } catch (err) {
    console.error('CRITICAL BULK UPLOAD CRASH:', err.message);
    res.status(500).json({
      error: 'Database transaction failed during batch insertion operations.'
    });
  }
});

// 7. DELETE ALL QUESTIONS OR BY EXAM TYPE
router.delete('/questions/delete-all', async (req, res) => {
  try {
    const examType = req.query.exam;

    const filter = examType ? { examType } : {};

    const result = await Question.deleteMany(filter);

    res.status(200).json({
      message: examType
        ? `Successfully deleted ${result.deletedCount} ${examType} questions.`
        : `Successfully deleted ${result.deletedCount} questions.`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("DELETE ALL ERROR:", err);
    res.status(500).json({
      error: "Failed to delete questions."
    });
  }
});

// 8. DELETE ALL RESULTS
router.delete('/results/delete-all', async (req, res) => {
  try {
    const result = await Result.deleteMany({});

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} results.`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("DELETE RESULTS ERROR:", err);
    res.status(500).json({
      error: "Failed to delete results."
    });
  }
});

// 9. ADMIN GET QUESTIONS WITH ANSWERS
router.get('/admin/questions', async (req, res) => {
  try {
    const examType = req.query.exam;

    const filter = examType ? { examType } : {};

    const questions = await Question.find(filter).sort({
      createdAt: -1
    });

    res.status(200).json(questions);

  } catch (err) {
    console.error("ADMIN QUESTIONS ERROR:", err);
    res.status(500).json({
      error: "Failed to fetch admin questions."
    });
  }
});

// 10. ADMIN UPDATE SINGLE QUESTION
router.put('/admin/questions/:id', async (req, res) => {
  try {
    const { question, options, correctAnswer, examType } = req.body;

    if (
      !question ||
      !options ||
      !Array.isArray(options) ||
      options.length !== 4 ||
      !correctAnswer
    ) {
      return res.status(400).json({
        error: "Question, 4 options, and correct answer are required."
      });
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      req.params.id,
      {
        question,
        options,
        correctAnswer,
        examType: examType || "NTPC"
      },
      { new: true }
    );

    if (!updatedQuestion) {
      return res.status(404).json({
        error: "Question not found."
      });
    }

    res.status(200).json({
      message: "Question updated successfully.",
      question: updatedQuestion
    });

  } catch (err) {
    console.error("UPDATE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to update question."
    });
  }
});

// 11. ADMIN DELETE SINGLE QUESTION
router.delete('/admin/questions/:id', async (req, res) => {
  try {
    const deletedQuestion = await Question.findByIdAndDelete(req.params.id);

    if (!deletedQuestion) {
      return res.status(404).json({
        error: "Question not found."
      });
    }

    res.status(200).json({
      message: "Question deleted successfully."
    });

  } catch (err) {
    console.error("DELETE QUESTION ERROR:", err);
    res.status(500).json({
      error: "Failed to delete question."
    });
  }
});

// 12. ADMIN GET ALL RESULTS
router.get('/admin/results', async (req, res) => {
  try {
    const examType = req.query.exam;

    const filter = examType ? { examType } : {};

    const results = await Result.find(filter)
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.status(200).json(results);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Failed to fetch results.'
    });
  }
});

// 13. ADMIN DELETE SINGLE RESULT
router.delete('/admin/results/:id', async (req, res) => {
  try {
    const deletedResult = await Result.findByIdAndDelete(req.params.id);

    if (!deletedResult) {
      return res.status(404).json({
        error: "Result not found."
      });
    }

    res.status(200).json({
      message: "Result deleted successfully."
    });

  } catch (err) {
    console.error("DELETE RESULT ERROR:", err);
    res.status(500).json({
      error: "Failed to delete result."
    });
  }
});

module.exports = router;