import mongoose from 'mongoose';

const analysisReportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },
  reportType: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
  summary: { type: String },
  billingInsights: { type: [String] },
  outageInsights: { type: [String] },
  recommendations: { type: [String] },
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const AnalysisReport = mongoose.model('AnalysisReport', analysisReportSchema);
