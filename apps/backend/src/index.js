import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import dns from "node:dns";

// Routes
import authRoutes from "./routes/auth.routes.js";
import referenceRoutes from "./routes/reference.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import complaintRoutes from "./routes/complaint.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// DNS fix for MongoDB Atlas / Railway
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

// CORS setup
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow Postman/server-to-server requests where origin is undefined
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log(`[CORS BLOCKED] Origin not allowed: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    );
  });

  next();
});

// Health route
app.get("/", (req, res) => {
  res.json({
    message: "BijliTrack API is running",
    status: "ok",
  });
});

// Database connection
if (process.env.NODE_ENV !== "test") {
  if (!process.env.MONGODB_URI) {
    console.error("[DB] MONGODB_URI is missing in environment variables");
  } else {
    mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => {
        console.log("[DB] Connected to MongoDB successfully");
      })
      .catch((err) => {
        console.error("[DB] MongoDB connection error:", err.message);
        console.warn("[DB] Please check MongoDB Atlas network access and URI");
      });
  }
}

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/reference", referenceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/complaints", complaintRoutes);

// 404 route
app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message}`);

  res.status(500).json({
    message: "Something went wrong!",
    error: err.message,
  });
});

// Start server
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`[Server] BijliTrack API running on port ${PORT}`);
  });
}

export default app;