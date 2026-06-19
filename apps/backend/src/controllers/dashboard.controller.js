import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';

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
 * Get latest saved snapshot for a reference (no CCMS calls)
 */
export const getDashboardSummary = async (req, res) => {
  console.log(`[Dashboard] Summary request for refId: ${req.params.referenceId}`);

  try {
    await verifyOwnership(req.user.id, req.params.referenceId);

    const latestSnapshot = await ConsumerSnapshot.findOne({ referenceId: req.params.referenceId })
      .sort({ scrapedAt: -1 })
      .lean();

    if (!latestSnapshot) {
      return res.json({ message: 'No data saved yet. Please sync from the app.' });
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
    console.error(`[Dashboard] Summary error:`, error.message);
    res.status(404).json({ message: error.message });
  }
};

/**
 * Save snapshot from frontend (frontend fetches CCMS, sends data here to store)
 */
export const saveSnapshot = async (req, res) => {
  console.log(`[Dashboard] Save snapshot for refId: ${req.params.referenceId}`);

  try {
    const reference = await verifyOwnership(req.user.id, req.params.referenceId);
    const { consumerInfo, billingInfo, outageInfo } = req.body;

    if (!consumerInfo && !billingInfo && !outageInfo) {
      return res.status(400).json({ message: 'No data provided to save' });
    }

    // Save snapshot
    const snapshot = new ConsumerSnapshot({
      userId: req.user.id,
      referenceId: reference._id,
      consumerInfo: consumerInfo || null,
      billingInfo: billingInfo || null,
      feederInfo: outageInfo ? {
        code: outageInfo.feederCode,
        name: outageInfo.feederName,
        grid: outageInfo.gridStation,
      } : null,
      loadManagementInfo: outageInfo || null,
      outageInfo: outageInfo || null,
      scrapedAt: new Date()
    });
    await snapshot.save();

    // Upsert bill history if billing data provided
    if (billingInfo?.histInfo) {
      const hist = billingInfo.histInfo;
      const promises = [];
      for (let i = 1; i <= 13; i++) {
        const month = hist[`gbHistMM${i}`];
        const amount = hist[`gbHistAssment${i}`];
        const payment = hist[`payment${i}`];
        if (month) {
          promises.push(BillHistory.findOneAndUpdate(
            { referenceId: reference._id, billMonth: month },
            { userId: req.user.id, amountDue: parseFloat(amount) || 0, status: payment ? 'Paid' : 'Unpaid', scrapedAt: new Date() },
            { upsert: true }
          ));
        }
      }
      await Promise.all(promises);
    }

    // Save outage records if outage data provided
    if (outageInfo?.days) {
      const outagePromises = [];
      for (const [dateStr, dayData] of Object.entries(outageInfo.days)) {
        const dayDate = new Date(dateStr + 'T00:00:00');
        const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);
        outagePromises.push(OutageHistory.findOneAndUpdate(
          { referenceId: reference._id, date: { $gte: dayDate, $lt: nextDay } },
          {
            userId: req.user.id,
            referenceId: reference._id,
            feederCode: outageInfo.feederCode,
            feederName: outageInfo.feederName,
            date: dayDate,
            feederStatus: outageInfo.currentStatus,
            hourlyOutageMinutes: dayData.hourlyOutageMinutes || [],
            hourlyStatus: dayData.hourlyStatus || [],
            totalOutageMinutes: dayData.totalOutageMinutes || 0,
            actualOutageHours: dayData.totalOutageHours || 0,
            scrapedAt: new Date()
          },
          { upsert: true }
        ));
      }
      await Promise.all(outagePromises);
    }

    // Update reference lastCheckedAt
    reference.lastCheckedAt = new Date();
    if (outageInfo?.feederCode) reference.feederCode = outageInfo.feederCode;
    await reference.save();

    console.log(`[Dashboard] Snapshot saved for ${reference.referenceNo}`);
    res.json({ message: 'Data saved successfully', lastUpdated: snapshot.scrapedAt });
  } catch (error) {
    console.error(`[Dashboard] Save snapshot error:`, error.message);
    res.status(500).json({ message: 'Error saving data', error: error.message });
  }
};

/**
 * Get billing history from DB
 */
export const getBillingHistory = async (req, res) => {
  try {
    await verifyOwnership(req.user.id, req.params.referenceId);
    const history = await BillHistory.find({ referenceId: req.params.referenceId })
      .sort({ billMonth: -1 })
      .limit(13);
    res.json(history);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

/**
 * Get outage history from DB
 */
export const getOutageHistory = async (req, res) => {
  try {
    await verifyOwnership(req.user.id, req.params.referenceId);
    const history = await OutageHistory.find({ referenceId: req.params.referenceId })
      .sort({ date: -1 })
      .limit(30);
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
    if (!report) return res.json({ message: 'No report generated yet.' });
    res.json(report);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
