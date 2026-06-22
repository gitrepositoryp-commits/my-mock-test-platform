const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
require("dotenv").config();
require("dns").setDefaultResultOrder("ipv4first");

const app = express();
app.set("trust proxy", 1);

/* =========================
   SECURITY
========================= */

const allowedOrigins = [
  "https://rrbedu.online",
  "https://www.rrbedu.online",
  "https://my-mock-test-platform.pages.dev",
  "https://my-mock-test-platform.gitrepositoryp.workers.dev"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: {
    success: false,
    message: "Too many requests. Please try again later."
  }
});

app.use("/api", apiLimiter);

/* =========================
   BODY PARSER
========================= */

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================
   DATABASE CONNECTION
========================= */

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("CRITICAL ERROR: MONGO_URI missing.");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => {
    console.log("MongoDB Cloud Database Connected Successfully.");
  })
  .catch((err) => {
    console.error("Database connection error:", err.message);
  });
  app.use((req, res, next) => {
  console.log("REQUEST ORIGIN:", req.headers.origin);
  console.log("REQUEST URL:", req.method, req.originalUrl);
  next();
});

/* =========================
   ROUTES
========================= */

const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/tests");
const paymentRoutes = require("./routes/payment");

app.use("/api/auth", authRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/payment", paymentRoutes);

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RRB EDU Mock Test API is running securely."
  });
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.message);

  res.status(500).json({
    success: false,
    message: "Internal Server Error"
  });
});

/* =========================
   SERVER START
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running securely on port ${PORT}`);
});