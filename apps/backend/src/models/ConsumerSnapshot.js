import mongoose from 'mongoose';

const snapshotSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },
  consumerInfo: { type: Object },
  billingInfo: { type: Object },
  feederInfo: { type: Object },
  loadManagementInfo: { type: Object },
  outageInfo: { type: Object },
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const ConsumerSnapshot = mongoose.model('ConsumerSnapshot', snapshotSchema);
