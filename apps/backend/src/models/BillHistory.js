import mongoose from 'mongoose';

const billHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reference', required: true },
  billMonth: { type: String, required: true },
  amountDue: { type: Number },
  dueDate: { type: Date },
  latePaymentSurcharge: { type: Number },
  status: { type: String }, // 'Paid', 'Unpaid', etc.
  scrapedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const BillHistory = mongoose.model('BillHistory', billHistorySchema);
