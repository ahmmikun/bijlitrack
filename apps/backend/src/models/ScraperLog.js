import mongoose from 'mongoose';

const scraperLogSchema = new mongoose.Schema({
  jobType: { type: String, required: true }, // 'lookup', 'daily_track'
  status: { type: String, enum: ['success', 'failed'], required: true },
  message: { type: String },
  referenceLast4: { type: String },
  errorDetails: { type: String },
  startedAt: { type: Date, required: true },
  finishedAt: { type: Date }
}, { timestamps: true });

export const ScraperLog = mongoose.model('ScraperLog', scraperLogSchema);
