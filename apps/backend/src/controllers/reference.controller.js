import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';

/**
 * Controller to start tracking a reference number
 * No CCMS calls — frontend handles data fetching
 */
export const trackReference = async (req, res) => {
  const { referenceNo, consentGiven, trackingDays } = req.body;

  if (!consentGiven) {
    return res.status(400).json({ message: 'Consent is required for tracking' });
  }

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit numeric reference number' });
  }

  const days = Math.min(Math.max(parseInt(trackingDays) || 30, 1), 30);

  console.log(`[Reference] Track request for: ${referenceNo} by userId: ${req.user.id} (${days} days)`);

  try {
    let reference = await Reference.findOne({ userId: req.user.id, referenceNo });
    if (reference) {
      return res.status(400).json({ message: 'This reference number is already being tracked' });
    }

    const now = new Date();
    reference = new Reference({
      userId: req.user.id,
      referenceNo,
      referenceNoLast4: referenceNo.slice(-4),
      trackingEnabled: true,
      trackingDays: days,
      trackingStartDate: now,
      trackingEndDate: new Date(now.getTime() + days * 24 * 60 * 60 * 1000),
      consentGivenAt: now
    });

    await reference.save();
    console.log(`[Reference] Now tracking: ${referenceNo} (refId: ${reference._id})`);
    
    res.status(201).json(reference);
  } catch (error) {
    console.error(`[Reference] Track error for ${referenceNo}:`, error.message);
    res.status(500).json({ message: 'Error tracking reference', error: error.message });
  }
};

/**
 * Get user's tracked references
 */
export const getMyReferences = async (req, res) => {
  try {
    const references = await Reference.find({ userId: req.user.id });
    console.log(`[Reference] Fetched ${references.length} references for userId: ${req.user.id}`);
    res.json(references);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching references', error: error.message });
  }
};

/**
 * Delete a tracked reference and all its data
 */
export const deleteReference = async (req, res) => {
  console.log(`[Reference] Delete request for refId: ${req.params.id}`);

  try {
    const reference = await Reference.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!reference) {
      return res.status(404).json({ message: 'Reference not found' });
    }
    await ConsumerSnapshot.deleteMany({ referenceId: req.params.id });
    await BillHistory.deleteMany({ referenceId: req.params.id });
    await OutageHistory.deleteMany({ referenceId: req.params.id });
    await AnalysisReport.deleteMany({ referenceId: req.params.id });

    console.log(`[Reference] Deleted ${reference.referenceNo} and all history`);
    res.json({ message: 'Reference and all history deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting reference', error: error.message });
  }
};
