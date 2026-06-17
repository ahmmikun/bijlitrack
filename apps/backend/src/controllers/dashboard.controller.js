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
  console.log(`[Dashboard] Summary request for refId: ${req.params.referenceId} by userId: ${req.user.id}`);

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
        console.log(`[Dashboard] Auto-refreshing stale data for ${reference.referenceNo}...`);
        latestSnapshot = await performSync(reference, req.user.id);
        console.log(`[Dashboard] Auto-refresh completed for ${reference.referenceNo}`);
      } catch (syncError) {
        console.error(`[Dashboard] Auto-refresh failed for ${reference.referenceNo}:`, syncError.message);
        // If sync fails, we still continue with old data if available
      }
    }

    if (!latestSnapshot) {
      console.log(`[Dashboard] No data available yet for refId: ${req.params.referenceId}`);
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
    console.error(`[Dashboard] Summary error for refId ${req.params.referenceId}:`, error.message);
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get billing details and history
 */
export const getBillingHistory = async (req, res) => {
  console.log(`[Dashboard] Billing history request for refId: ${req.params.referenceId}`);

  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const history = await BillHistory.find({ referenceId: req.params.referenceId })
      .sort({ billMonth: -1 }) // Assuming sortable format or date
      .limit(12);

    console.log(`[Dashboard] Returned ${history.length} billing records for refId: ${req.params.referenceId}`);
    res.json(history);
  } catch (error) {
    console.error(`[Dashboard] Billing history error for refId ${req.params.referenceId}:`, error.message);
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get outage and feeder history
 */
export const getOutageHistory = async (req, res) => {
  console.log(`[Dashboard] Outage history request for refId: ${req.params.referenceId}`);

  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const history = await OutageHistory.find({ referenceId: req.params.referenceId })
      .sort({ date: -1 })
      .limit(30); // Last 30 days

    console.log(`[Dashboard] Returned ${history.length} outage records for refId: ${req.params.referenceId}`);
    res.json(history);
  } catch (error) {
    console.error(`[Dashboard] Outage history error for refId ${req.params.referenceId}:`, error.message);
    res.status(404).json({ message: error.message });
  }
};;

/**
 * Get latest analysis report
 */
export const getLatestReport = async (req, res) => {
  console.log(`[Dashboard] Report request for refId: ${req.params.referenceId}`);

  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const report = await AnalysisReport.findOne({ referenceId: req.params.referenceId })
      .sort({ generatedAt: -1 });

    if (!report) {
      console.log(`[Dashboard] No report available for refId: ${req.params.referenceId}`);
      return res.json({ message: 'No report generated yet.' });
    }

    console.log(`[Dashboard] Report returned for refId: ${req.params.referenceId}`);
    res.json(report);
  } catch (error) {
    console.error(`[Dashboard] Report error for refId ${req.params.referenceId}:`, error.message);
    res.status(404).json({ message: error.message });
  }
};
