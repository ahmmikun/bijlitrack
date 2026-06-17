import mongoose from 'mongoose';

const referenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceNo: { type: String, required: true },
  referenceNoLast4: { type: String },
  feederCode: { type: String }, // Cached feeder code for fast outage lookups
  trackingEnabled: { type: Boolean, default: false },
  trackingDays: { type: Number, default: 30 }, // How many days to track (max 30)
  trackingStartDate: { type: Date }, // When tracking started
  trackingEndDate: { type: Date }, // When tracking should stop (trackingStartDate + trackingDays)
  consentGivenAt: { type: Date },
  lastCheckedAt: { type: Date }
}, { timestamps: true });

export const Reference = mongoose.model('Reference', referenceSchema);
