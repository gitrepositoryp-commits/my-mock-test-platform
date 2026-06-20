const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Result = require("../models/Result");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

/* =========================
   USER JWT PROTECTION
========================= */

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: "Authorization token missing."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select(
      "username email isPremium premiumExpiresAt"
    );

    if (!user) {
      return res.status(401).json({
        error: "User not found."
      });
    }

    const now = new Date();

    if (
      user.isPremium &&
      user.premiumExpiresAt &&
      user.premiumExpiresAt < now
    ) {
      user.isPremium = false;
      await user.save();
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      isPremium: user.isPremium,
      premiumExpiresAt: user.premiumExpiresAt
    };

    next();

  } catch (err) {
    console.error("AUTH ERROR:", err.message);
    return res.status(401).json({
      error: "Session invalid or expired."
    });
  }
};

/* =========================
   ADMIN JWT PROTECTION
========================= */

const adminProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        error: "Admin token required."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!process.env.ADMIN_EMAIL) {
      return res.status(500).json({
        error: "ADMIN_EMAIL is not configured on server."
      });
    }

    if (decoded.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({
        error: "Admin access only."
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      username: decoded.username
    };

    next();

  } catch (err) {
    console.error("ADMIN AUTH ERROR:", err.message);
    return res.status(401).json({
      error: "Invalid admin session."
    });
  }
};

function isPremiumExam(examType) {
  return String(examType || "").toUpperCase().includes("PREMIUM");
}

function hasValidPremium(user) {
  if (!user || !user.isPremium) return false;

  if (!user.premiumExpiresAt) return true;

  return new Date(user.premiumExpiresAt) > new Date();
}

/* =========================
   ADMIN: ADD SINGLE QUESTION
========================= */

router.post("/questions", adminProtect, async (req, res) => {
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

    const newQuestion = new Question({
      question,
      options,
      correctAnswer,
      examType: examType || "NTPC"
    });

    await newQuestion.save();

    res.status(201).json({
      message: "Question saved successfully!"
    });

  } catch (err) {
    console.error("ADD QUESTION ERROR:", err.message);
    res.status(500).json({
      error: "Failed to save question."
    });
  }
});

/* =========================
   USER: GET QUESTIONS
========================= */
/* =========================
   PUBLIC: QUESTION COUNT ONLY
========================= */

router.get("/count/:examType", async (req, res) => {
  try {
    const examType = req.params.examType;

    const count = await Question.countDocuments({ examType });

    res.status(200).json({
      examType,
      count
    });

  } catch (err) {
    console.error("COUNT ERROR:", err.message);
    res.status(500).json({
      error: "Failed to count questions."
    });
  }
});
router.get("/questions", protect, async (req, res) => {
  try {
    const examType = req.query.exam || "NTPC";

    if (isPremiumExam(examType) && !hasValidPremium(req.user)) {
      return res.status(403).json({
        error: "Premium subscription required."
      });
    }

    const databaseQuestions = await Question.find(
      { examType },
      "-correctAnswer"
    );

    res.status(200).json(databaseQuestions);

  } catch (err) {
    console.error("GET QUESTIONS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to retrieve questions."
    });
  }
});

/* =========================
   USER: SUBMIT TEST
========================= */

router.post("/submit", protect, async (req, res) => {
  try {
    const { answers, examType } = req.body;

    const submittedAnswers = answers || {};
    const selectedExam = examType || "NTPC";

    if (isPremiumExam(selectedExam) && !hasValidPremium(req.user)) {
      return res.status(403).json({
        error: "Premium subscription required."
      });
    }

    const fullQuestionPool = await Question.find({
      examType: selectedExam
    });

    let calculatedScore = 0;
    const dynamicBreakdown = [];

    fullQuestionPool.forEach((q) => {
      const qIDString = q._id.toString();
      const studentSelection = submittedAnswers[qIDString] || "";

      const isCorrectMatch =
        studentSelection.trim() === (q.correctAnswer || "").trim();

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
        ? parseFloat(
            ((calculatedScore / fullQuestionPool.length) * 100).toFixed(2)
          )
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
      message: "Assessment evaluation completed.",
      score: calculatedScore,
      totalQuestions: fullQuestionPool.length,
      percentage: accuracyPercentage,
      resultId: savedResult._id,
      examType: selectedExam
    });

  } catch (err) {
    console.error("SUBMIT TEST ERROR:", err.message);
    res.status(500).json({
      error: "Evaluation failed."
    });
  }
});

/* =========================
   USER: GET SINGLE RESULT
========================= */

router.get("/result/:id", protect, async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);

    if (!result) {
      return res.status(404).json({
        error: "Result not found."
      });
    }

    if (result.userId.toString() !== req.user.id) {
      return res.status(403).json({
        error: "You are not allowed to view this result."
      });
    }

    res.status(200).json(result);

  } catch (err) {
    console.error("GET RESULT ERROR:", err.message);
    res.status(500).json({
      error: "Failed to retrieve result."
    });
  }
});

/* =========================
   USER: LEADERBOARD
========================= */

router.get("/leaderboard", protect, async (req, res) => {
  try {
    const exam = req.query.exam;
    let filter = {};

    if (exam === "NTPC") {
      filter = { examType: { $regex: "^NTPC" } };
    } else if (exam === "GROUP_D") {
      filter = { examType: { $regex: "^GROUP_D" } };
    } else if (exam === "GROUP_2") {
      filter = { examType: { $regex: "^GROUP_2" } };
    }

    const allResults = await Result.find(filter)
      .populate("userId", "username");

    const bestScores = {};

    allResults.forEach((result) => {
      const userId = result.userId?._id?.toString();

      if (!userId) return;

      if (
        !bestScores[userId] ||
        result.score > bestScores[userId].score
      ) {
        bestScores[userId] = result;
      }
    });

    const leaderboard = Object.values(bestScores)
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);

    res.json(leaderboard);

  } catch (err) {
    console.error("LEADERBOARD ERROR:", err.message);
    res.status(500).json({
      error: "Leaderboard load failed."
    });
  }
});

/* =========================
   ADMIN: BULK UPLOAD QUESTIONS
========================= */

router.post("/bulk-questions", adminProtect, async (req, res) => {
  try {
    const { questionsArray, examType } = req.body;

    if (
      !questionsArray ||
      !Array.isArray(questionsArray) ||
      questionsArray.length === 0
    ) {
      return res.status(400).json({
        error: "Payload must be a non-empty questions array."
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
          error: "Each question must have text, 4 options, and correct answer."
        });
      }
    }

    const finalQuestions = questionsArray.map((q) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      examType: examType || q.examType || "NTPC"
    }));

    const insertedQuestions = await Question.insertMany(finalQuestions);

    res.status(201).json({
      message: `Successfully bulk-uploaded ${insertedQuestions.length} questions.`,
      count: insertedQuestions.length
    });

  } catch (err) {
    console.error("BULK UPLOAD ERROR:", err.message);
    res.status(500).json({
      error: "Bulk upload failed."
    });
  }
});

/* =========================
   ADMIN: DELETE QUESTIONS
========================= */

router.delete("/questions/delete-all", adminProtect, async (req, res) => {
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
    console.error("DELETE QUESTIONS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to delete questions."
    });
  }
});

/* =========================
   ADMIN: DELETE ALL RESULTS
========================= */

router.delete("/results/delete-all", adminProtect, async (req, res) => {
  try {
    const result = await Result.deleteMany({});

    res.status(200).json({
      message: `Successfully deleted ${result.deletedCount} results.`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("DELETE RESULTS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to delete results."
    });
  }
});

/* =========================
   ADMIN: GET QUESTIONS WITH ANSWERS
========================= */

router.get("/admin/questions", adminProtect, async (req, res) => {
  try {
    const examType = req.query.exam;
    const filter = examType ? { examType } : {};

    const questions = await Question.find(filter).sort({
      createdAt: -1
    });

    res.status(200).json(questions);

  } catch (err) {
    console.error("ADMIN QUESTIONS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to fetch admin questions."
    });
  }
});

/* =========================
   ADMIN: UPDATE SINGLE QUESTION
========================= */

router.put("/admin/questions/:id", adminProtect, async (req, res) => {
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
    console.error("UPDATE QUESTION ERROR:", err.message);
    res.status(500).json({
      error: "Failed to update question."
    });
  }
});

/* =========================
   ADMIN: DELETE SINGLE QUESTION
========================= */

router.delete("/admin/questions/:id", adminProtect, async (req, res) => {
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
    console.error("DELETE QUESTION ERROR:", err.message);
    res.status(500).json({
      error: "Failed to delete question."
    });
  }
});

/* =========================
   ADMIN: GET ALL RESULTS
========================= */

router.get("/admin/results", adminProtect, async (req, res) => {
  try {
    const examType = req.query.exam;
    const filter = examType ? { examType } : {};

    const results = await Result.find(filter)
      .populate("userId", "username email")
      .sort({ createdAt: -1 });

    res.status(200).json(results);

  } catch (err) {
    console.error("ADMIN RESULTS ERROR:", err.message);
    res.status(500).json({
      error: "Failed to fetch results."
    });
  }
});

/* =========================
   ADMIN: DELETE SINGLE RESULT
========================= */

router.delete("/admin/results/:id", adminProtect, async (req, res) => {
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
    console.error("DELETE RESULT ERROR:", err.message);
    res.status(500).json({
      error: "Failed to delete result."
    });
  }
});

module.exports = router;