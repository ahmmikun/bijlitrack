import mongoose from 'mongoose';

const outageHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },
  feederCode: { type: String },
  date: { type: Date, required: true },
  scheduledOutageHours: { type: Number, default: 0 },
  actualOutageHours: { type: Number, default: 0 },
  feederStatus: { type: String }, // 'ON', 'OFF'
  expectedRestorationTime: { type: Date },
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const OutageHistory = mongoose.model('OutageHistory', outageHistorySchema);
