import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from "node:dns";
import { initDailyTracker } from './jobs/dailyTracker.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import referenceRoutes from './routes/reference.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import complaintRoutes from './routes/complaint.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

// Middleware
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Database Connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('[DB] Connected to MongoDB successfully');
      // Initialize Cron Jobs only after successful DB connection
      initDailyTracker();
    })
    .catch(err => {
      console.error('[DB] MongoDB connection error:', err.message);
      console.warn('[DB] Please ensure your IP is whitelisted in MongoDB Atlas');
    });
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BijliTrack API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/complaints', complaintRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} - ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Server] BijliTrack API running on port ${PORT}`);
  });
}

export default app;
