import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { fetchAllDetails } from '../services/ccms.service.js';
import { performSync, performOutageSync } from '../services/sync.service.js';

/**
 * Controller for One-time Reference Lookup (Real-time Fetch)
 */
export const lookupReference = async (req, res) => {
  const { referenceNo } = req.body;

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit numeric reference number' });
  }

  console.log(`[Reference] Lookup request for: ${referenceNo}`);
  const startTime = Date.now();

  try {
    const data = await fetchAllDetails(referenceNo);
    const duration = Date.now() - startTime;
    
    if (!data.success) {
      console.error(`[Reference] Lookup failed for ${referenceNo} (${duration}ms):`, data.error);
      return res.status(500).json({ message: 'Failed to fetch utility data', error: data.error });
    }

    console.log(`[Reference] Lookup successful for ${referenceNo} (${duration}ms)`);

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
    console.error(`[Reference] Lookup error for ${referenceNo}:`, error.message);
    res.status(500).json({ message: 'Internal server error during lookup', error: error.message });
  }
};

/**
 * Controller to start tracking a reference number
 */
export const trackReference = async (req, res) => {
  const { referenceNo, consentGiven, trackingDays } = req.body;

  if (!consentGiven) {
    return res.status(400).json({ message: 'Consent is required for daily tracking' });
  }

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit numeric reference number' });
  }

  // Validate tracking days (1-30)
  const days = Math.min(Math.max(parseInt(trackingDays) || 30, 1), 30);

  console.log(`[Reference] Track request for: ${referenceNo} by userId: ${req.user.id} (${days} days)`);

  try {
    let reference = await Reference.findOne({ userId: req.user.id, referenceNo });
    if (reference) {
      console.warn(`[Reference] Already tracked: ${referenceNo} by userId: ${req.user.id}`);
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
    console.log(`[Reference] Now tracking: ${referenceNo} (refId: ${reference._id}) for ${days} days until ${reference.trackingEndDate.toISOString()}`);

    // Trigger initial full fetch to populate all data immediately
    try {
      await performSync(reference, req.user.id);
      console.log(`[Reference] Initial sync completed for: ${referenceNo}`);
    } catch (syncError) {
      console.error(`[Reference] Initial sync failed for ${referenceNo}:`, syncError.message);
    }
    
    res.status(201).json({
      ...reference.toObject(),
      trackingNote: `Outage tracking active for ${days} days. Only power outages are tracked daily. Bills & consumer info are fetched on-demand.`
    });
  } catch (error) {
    console.error(`[Reference] Track error for ${referenceNo}:`, error.message);
    res.status(500).json({ message: 'Error tracking reference', error: error.message });
  }
};

/**
 * Controller to manually sync data for a reference
 */
export const syncReference = async (req, res) => {
  console.log(`[Reference] Manual sync request for refId: ${req.params.id} by userId: ${req.user.id}`);
  const startTime = Date.now();

  try {
    const reference = await Reference.findOne({ _id: req.params.id, userId: req.user.id });
    if (!reference) {
      console.warn(`[Reference] Sync - reference not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Reference not found' });
    }

    // Full sync (bills + consumer + outage)
    await performSync(reference, req.user.id);
    const duration = Date.now() - startTime;
    console.log(`[Reference] Manual sync completed for ${reference.referenceNo} (${duration}ms)`);

    res.json({ message: 'Data synchronized successfully', lastUpdated: reference.lastCheckedAt });
  } catch (error) {
    console.error(`[Reference] Sync error for refId ${req.params.id}:`, error.message);
    res.status(500).json({ message: 'Error syncing data', error: error.message });
  }
};

/**
 * Get user's tracked references
 */
export const getMyReferences = async (req, res) => {
  try {
    const references = await Reference.find({ userId: req.user.id });
    console.log(`[Reference] Fetched ${references.length} references for userId: ${req.user.id}`);
    // Return raw references with full referenceNo
    res.json(references);
  } catch (error) {
    console.error(`[Reference] Error fetching references for userId ${req.user.id}:`, error.message);
    res.status(500).json({ message: 'Error fetching references', error: error.message });
  }
};

/**
 * Delete a tracked reference
 */
export const deleteReference = async (req, res) => {
  console.log(`[Reference] Delete request for refId: ${req.params.id} by userId: ${req.user.id}`);

  try {
    const reference = await Reference.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!reference) {
      console.warn(`[Reference] Delete - reference not found: ${req.params.id}`);
      return res.status(404).json({ message: 'Reference not found' });
    }
    await ConsumerSnapshot.deleteMany({ referenceId: req.params.id });
    await BillHistory.deleteMany({ referenceId: req.params.id });
    await OutageHistory.deleteMany({ referenceId: req.params.id });
    await AnalysisReport.deleteMany({ referenceId: req.params.id });

    console.log(`[Reference] Deleted ${reference.referenceNo} and all associated history`);
    res.json({ message: 'Reference and all history deleted' });
  } catch (error) {
    console.error(`[Reference] Delete error for refId ${req.params.id}:`, error.message);
    res.status(500).json({ message: 'Error deleting reference', error: error.message });
  }
};
