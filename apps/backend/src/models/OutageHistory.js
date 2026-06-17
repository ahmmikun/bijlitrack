import mongoose from 'mongoose';

const outageHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },
  feederCode: { type: String },
  feederName: { type: String },
  date: { type: Date, required: true },
  feederStatus: { type: String }, // Current status: 'ON', 'OFF'
  // Hourly outage data (24 values, each = minutes of outage in that hour, 0-60)
  hourlyOutageMinutes: { type: [Number], default: [] },
  // Hourly status derived from minutes ('ON', 'OFF', 'PARTIAL')
  hourlyStatus: { type: [String], default: [] },
  // Scheduled maintenance minutes per hour (24 values)
  scheduledMinutes: { type: [Number], default: [] },
  // Calculated totals
  totalOutageMinutes: { type: Number, default: 0 },
  actualOutageHours: { type: Number, default: 0 },
  scheduledOutageHours: { type: Number, default: 0 },
  // Event logs (trip ON/OFF events with timestamps)
  eventLogs: { type: [Object], default: [] },
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const OutageHistory = mongoose.model('OutageHistory', outageHistorySchema);
