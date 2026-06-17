import cron from 'node-cron';
import { Reference } from '../models/Reference.js';
import { ScraperLog } from '../models/ScraperLog.js';
import { performSync } from '../services/sync.service.js';

export const initDailyTracker = () => {
  // Run every day at 3 AM
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Starting real-time tracking job...');
    await runTrackingJob();
  });
  console.log('[Cron] Real-time tracking job scheduled (0 3 * * *)');
};

export const runTrackingJob = async () => {
  try {
    const references = await Reference.find({ trackingEnabled: true });
    if (references.length === 0) return;

    for (const ref of references) {
      const jobStartTime = new Date();
      try {
        await performSync(ref, ref.userId);

        // 5. Log Success
        await ScraperLog.create({ 
          jobType: 'daily_track', 
          status: 'success', 
          referenceLast4: ref.referenceNoLast4, 
          startedAt: jobStartTime, 
          finishedAt: new Date() 
        });
        
        // Add a small delay between references to be polite to the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        console.error(`[Cron] Failed to fetch for ${ref.referenceNo}:`, err.message);
        await ScraperLog.create({ 
          jobType: 'daily_track', 
          status: 'failed', 
          referenceLast4: ref.referenceNoLast4, 
          errorDetails: err.message, 
          startedAt: jobStartTime, 
          finishedAt: new Date() 
        });
      }
    }
  } catch (error) {
    console.error('[Cron] Critical error in tracking job:', error);
  }
};
