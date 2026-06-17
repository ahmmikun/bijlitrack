import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { fetchAllDetails, fetchLoadInfo } from './ccms.service.js';

/**
 * Synchronize ALL reference data from CCMS (user, bill, load info)
 * Used for initial setup and manual full-sync
 * @param {Object} reference - The Reference document
 * @param {string} userId - The User ID
 */
export const performSync = async (reference, userId) => {
  console.log(`[Sync] Starting full sync for ${reference.referenceNo} (refId: ${reference._id})`);
  const startTime = Date.now();

  const data = await fetchAllDetails(reference.referenceNo);
  if (!data.success) {
    console.error(`[Sync] CCMS fetch failed for ${reference.referenceNo}: ${data.error}`);
    throw new Error(data.error || 'Failed to fetch latest data');
  }

  // 1. Save Snapshot
  const snapshot = new ConsumerSnapshot({
    userId: userId,
    referenceId: reference._id,
    consumerInfo: data.user,
    billingInfo: data.bill,
    feederInfo: data.loadInfo ? {
      code: data.loadInfo.feederCode,
      name: data.loadInfo.feederName,
      grid: data.loadInfo.gridStation,
    } : null,
    loadManagementInfo: data.loadInfo,
    outageInfo: data.loadInfo,
    scrapedAt: new Date()
  });
  await snapshot.save();
  console.log(`[Sync] Snapshot saved for ${reference.referenceNo}`);

  // 2. Sync Bill History
  if (data.bill?.histInfo) {
    const hist = data.bill.histInfo;
    const historyPromises = [];
    let billCount = 0;
    for (let i = 1; i <= 13; i++) {
      const month = hist[`gbHistMM${i}`];
      const amount = hist[`gbHistAssment${i}`];
      const payment = hist[`payment${i}`];
      if (month) {
        billCount++;
        historyPromises.push(BillHistory.findOneAndUpdate(
          { referenceId: reference._id, billMonth: month },
          { 
            userId: userId, 
            amountDue: parseFloat(amount) || 0,
            status: payment ? 'Paid' : 'Unpaid',
            scrapedAt: new Date()
          },
          { upsert: true }
        ));
      }
    }
    await Promise.all(historyPromises);
    console.log(`[Sync] Upserted ${billCount} bill history records for ${reference.referenceNo}`);
  }

  // 3. Save outage data for all available days from history_data
  if (data.loadInfo) {
    await saveOutageRecords(reference, userId, data.loadInfo);
    
    // Cache feeder code on reference
    if (data.loadInfo.feederCode && !reference.feederCode) {
      reference.feederCode = data.loadInfo.feederCode;
    }
  }

  reference.lastCheckedAt = new Date();
  await reference.save();

  const duration = Date.now() - startTime;
  console.log(`[Sync] Full sync completed for ${reference.referenceNo} (${duration}ms)`);

  return snapshot;
};

/**
 * Track outages only - lightweight daily job
 * Only fetches load info (outages, events, status)
 * @param {Object} reference - The Reference document
 * @param {string} userId - The User ID
 */
export const performOutageSync = async (reference, userId) => {
  console.log(`[Sync] Starting outage-only sync for ${reference.referenceNo}`);
  const startTime = Date.now();

  const data = await fetchLoadInfo(reference.referenceNo);
  
  if (!data.success) {
    console.error(`[Sync] Outage fetch failed for ${reference.referenceNo}: ${data.error}`);
    throw new Error(data.error || 'Failed to fetch outage data');
  }

  // Save outage records for all available days
  await saveOutageRecords(reference, userId, data.data);

  // Cache feeder code on reference
  if (data.data.feederCode && !reference.feederCode) {
    reference.feederCode = data.data.feederCode;
  }

  reference.lastCheckedAt = new Date();
  await reference.save();

  const duration = Date.now() - startTime;
  console.log(`[Sync] Outage sync completed for ${reference.referenceNo} (${duration}ms) - Status: ${data.data.currentStatus}, Days saved: ${Object.keys(data.data.days).length}`);

  return data.data;
};

/**
 * Save outage records for all available days from parsed load info
 * @param {Object} reference 
 * @param {string} userId 
 * @param {Object} loadInfo - Parsed load info from parseLoadInfo
 */
const saveOutageRecords = async (reference, userId, loadInfo) => {
  const promises = [];

  for (const [dateStr, dayData] of Object.entries(loadInfo.days)) {
    const dayDate = new Date(dateStr + 'T00:00:00');
    const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000);

    promises.push(OutageHistory.findOneAndUpdate(
      { 
        referenceId: reference._id, 
        date: { $gte: dayDate, $lt: nextDay }
      },
      {
        userId: userId,
        referenceId: reference._id,
        feederCode: loadInfo.feederCode,
        feederName: loadInfo.feederName,
        date: dayDate,
        feederStatus: loadInfo.currentStatus,
        // Store hourly outage minutes (the raw data from API)
        hourlyOutageMinutes: dayData.hourlyOutageMinutes,
        hourlyStatus: dayData.hourlyStatus,
        scheduledMinutes: dayData.scheduledMinutes || [],
        // Calculated totals
        totalOutageMinutes: dayData.totalOutageMinutes,
        actualOutageHours: dayData.totalOutageHours,
        scheduledOutageHours: parseFloat(((dayData.scheduledOutageMinutes || 0) / 60).toFixed(2)),
        scrapedAt: new Date()
      },
      { upsert: true }
    ));
  }

  // Also save event logs as metadata on today's record
  if (loadInfo.eventLogs && loadInfo.eventLogs.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    promises.push(OutageHistory.findOneAndUpdate(
      { referenceId: reference._id, date: { $gte: today, $lt: tomorrow } },
      { $set: { eventLogs: loadInfo.eventLogs } },
      { upsert: false }
    ));
  }

  await Promise.all(promises);
  console.log(`[Sync] Saved outage records for ${Object.keys(loadInfo.days).length} days for ${reference.referenceNo}`);
};
