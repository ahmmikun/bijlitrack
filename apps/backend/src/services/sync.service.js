import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { fetchAllDetails } from './ccms.service.js';

/**
 * Synchronize reference data from CCMS and save to database
 * @param {Object} reference - The Reference document
 * @param {string} userId - The User ID
 */
export const performSync = async (reference, userId) => {
  const data = await fetchAllDetails(reference.referenceNo);
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch latest data');
  }

  // 1. Save Snapshot
  const snapshot = new ConsumerSnapshot({
    userId: userId,
    referenceId: reference._id,
    consumerInfo: data.user,
    billingInfo: data.bill,
    feederInfo: data.schedule?.feederinfo,
    loadManagementInfo: data.schedule?.loaddata,
    outageInfo: data.schedule,
    scrapedAt: new Date()
  });
  await snapshot.save();

  // 2. Sync Bill History
  if (data.bill?.histInfo) {
    const hist = data.bill.histInfo;
    const historyPromises = [];
    for (let i = 1; i <= 13; i++) {
      const month = hist[`gbHistMM${i}`];
      const amount = hist[`gbHistAssment${i}`];
      const payment = hist[`payment${i}`];
      if (month) {
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
  }

  // 3. Save Today's Outage Record
  if (data.schedule) {
    await OutageHistory.create({
      userId: userId,
      referenceId: reference._id,
      feederCode: data.schedule.feederinfo?.code,
      date: new Date(),
      feederStatus: data.schedule.current_status,
      scrapedAt: new Date()
    });
  }

  reference.lastCheckedAt = new Date();
  await reference.save();

  return snapshot;
};
