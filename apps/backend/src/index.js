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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('Connected to MongoDB');
      // Initialize Cron Jobs only after successful DB connection
      initDailyTracker();
    })
    .catch(err => {
      console.error('MongoDB connection error:', err);
      console.log('Please ensure your IP is whitelisted in MongoDB Atlas.');
    });
}

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'BijliTrack API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reference', referenceRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
