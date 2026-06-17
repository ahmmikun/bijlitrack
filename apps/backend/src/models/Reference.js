import mongoose from 'mongoose';

const referenceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceNo: { type: String, required: true }, // In a real app, this should be encrypted
  referenceNoLast4: { type: String },
  trackingEnabled: { type: Boolean, default: false },
  consentGivenAt: { type: Date },
  lastCheckedAt: { type: Date }
}, { timestamps: true });

export const Reference = mongoose.model('Reference', referenceSchema);
