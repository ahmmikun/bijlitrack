import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { fetchAllDetails } from '../services/ccms.service.js';
import { performSync } from '../services/sync.service.js';
import { maskSensitiveData, maskString } from '../utils/masking.js';

/**
 * Controller for One-time Reference Lookup (Real-time Fetch)
 */
export const lookupReference = async (req, res) => {
  const { referenceNo } = req.body;

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit numeric reference number' });
  }

  try {
    const data = await fetchAllDetails(referenceNo);
    
    if (!data.success) {
      return res.status(500).json({ message: 'Failed to fetch utility data', error: data.error });
    }

    // Return raw data without masking
    res.json({
      success: true,
      data: {
        referenceNo: referenceNo,
        user: data.user,
        bill: data.bill,
        schedule: data.schedule,
        timestamp: data.timestamp
      }
    });
  } catch (error) {
    console.error('Lookup Error:', error);
    res.status(500).json({ message: 'Internal server error during lookup', error: error.message });
  }
};

/**
 * Controller to start tracking a reference number
 */
export const trackReference = async (req, res) => {
  const { referenceNo, consentGiven } = req.body;

  if (!consentGiven) {
    return res.status(400).json({ message: 'Consent is required for daily tracking' });
  }

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit numeric reference number' });
  }

  try {
    let reference = await Reference.findOne({ userId: req.user.id, referenceNo });
    if (reference) {
      return res.status(400).json({ message: 'This reference number is already being tracked' });
    }

    reference = new Reference({
      userId: req.user.id,
      referenceNo,
      referenceNoLast4: referenceNo.slice(-4),
      trackingEnabled: true,
      consentGivenAt: new Date()
    });

    await reference.save();

    // Trigger initial fetch to populate history immediately
    try {
      await performSync(reference, req.user.id);
    } catch (syncError) {
      console.error('Initial sync failed during tracking:', syncError.message);
      // We still keep the reference, it will be retried by cron or manual sync
    }
    
    // Return full reference number in response
    res.status(201).json(reference);
  } catch (error) {
    console.error('Track Error:', error);
    res.status(500).json({ message: 'Error tracking reference', error: error.message });
  }
};

/**
 * Controller to manually sync data for a reference
 */
export const syncReference = async (req, res) => {
  try {
    const reference = await Reference.findOne({ _id: req.params.id, userId: req.user.id });
    if (!reference) {
      return res.status(404).json({ message: 'Reference not found' });
    }

    await performSync(reference, req.user.id);

    res.json({ message: 'Data synchronized successfully', lastUpdated: reference.lastCheckedAt });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing data', error: error.message });
  }
};

/**
 * Get user's tracked references
 */
export const getMyReferences = async (req, res) => {
  try {
    const references = await Reference.find({ userId: req.user.id });
    // Return raw references with full referenceNo
    res.json(references);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching references', error: error.message });
  }
};

/**
 * Delete a tracked reference
 */
export const deleteReference = async (req, res) => {
  try {
    const reference = await Reference.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!reference) {
      return res.status(404).json({ message: 'Reference not found' });
    }
    await ConsumerSnapshot.deleteMany({ referenceId: req.params.id });
    await BillHistory.deleteMany({ referenceId: req.params.id });
    await OutageHistory.deleteMany({ referenceId: req.params.id });
    await AnalysisReport.deleteMany({ referenceId: req.params.id });
    res.json({ message: 'Reference and all history deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting reference', error: error.message });
  }
};
