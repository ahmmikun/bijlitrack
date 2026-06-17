import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import { performSync } from '../services/sync.service.js';

/**
 * Helper to ensure the user owns the reference
 */
const verifyOwnership = async (userId, referenceId) => {
  const reference = await Reference.findOne({ _id: referenceId, userId });
  if (!reference) {
    throw new Error('Reference not found or not authorized');
  }
  return reference;
};

/**
 * Get full dashboard summary for a reference
 */
export const getDashboardSummary = async (req, res) => {
  try {
    const reference = await verifyOwnership(req.user.id, req.params.referenceId);

    // Get the latest snapshot
    let latestSnapshot = await ConsumerSnapshot.findOne({ referenceId: req.params.referenceId })
      .sort({ scrapedAt: -1 })
      .lean();

    // AUTO-REFRESH LOGIC:
    // If no snapshot exists, or if it's older than 6 hours, try to refresh it in real-time
    const SIX_HOURS = 6 * 60 * 60 * 1000;
    const isStale = !latestSnapshot || (new Date() - new Date(latestSnapshot.scrapedAt) > SIX_HOURS);

    if (isStale) {
      try {
        console.log(`[AutoRefresh] Refreshing stale data for ${reference.referenceNo}...`);
        latestSnapshot = await performSync(reference, req.user.id);
      } catch (syncError) {
        console.error(`[AutoRefresh] Failed: ${syncError.message}`);
        // If sync fails, we still continue with old data if available
      }
    }

    if (!latestSnapshot) {
      return res.json({ message: 'No data available yet. Tracking might be pending.' });
    }

    res.json({
      consumerInfo: latestSnapshot.consumerInfo,
      billingInfo: latestSnapshot.billingInfo,
      feederInfo: latestSnapshot.feederInfo,
      loadManagementInfo: latestSnapshot.loadManagementInfo,
      outageInfo: latestSnapshot.outageInfo,
      lastUpdated: latestSnapshot.scrapedAt
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get billing details and history
 */
export const getBillingHistory = async (req, res) => {
  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const history = await BillHistory.find({ referenceId: req.params.referenceId })
      .sort({ billMonth: -1 }) // Assuming sortable format or date
      .limit(12);

    res.json(history);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get outage and feeder history
 */
export const getOutageHistory = async (req, res) => {
  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const history = await OutageHistory.find({ referenceId: req.params.referenceId })
      .sort({ date: -1 })
      .limit(30); // Last 30 days

    res.json(history);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get latest analysis report
 */
export const getLatestReport = async (req, res) => {
  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const report = await AnalysisReport.findOne({ referenceId: req.params.referenceId })
      .sort({ generatedAt: -1 });

    if (!report) {
      return res.json({ message: 'No report generated yet.' });
    }

    res.json(report);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
