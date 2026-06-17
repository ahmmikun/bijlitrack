import cron from 'node-cron';
import { Reference } from '../models/Reference.js';
import { ScraperLog } from '../models/ScraperLog.js';
import { performOutageSync } from '../services/sync.service.js';

export const initDailyTracker = () => {
  // Run every day at 3 AM — tracks power outages only
  cron.schedule('0 3 * * *', async () => {
    console.log('[Cron] Starting daily outage tracking job...');
    await runTrackingJob();
  });
  console.log('[Cron] Daily outage tracking job scheduled (0 3 * * *)');
};

export const runTrackingJob = async () => {
  const jobStart = Date.now();
  try {
    const now = new Date();
    
    // Find references that are enabled AND not expired
    const references = await Reference.find({ trackingEnabled: true });
    console.log(`[Cron] Found ${references.length} references to check`);

    if (references.length === 0) return;

    let successCount = 0;
    let failCount = 0;
    let expiredCount = 0;

    for (const ref of references) {
      // Check if tracking has expired
      if (ref.trackingEndDate && now > ref.trackingEndDate) {
        ref.trackingEnabled = false;
        await ref.save();
        expiredCount++;
        console.log(`[Cron] Tracking expired for ${ref.referenceNo} (was ${ref.trackingDays} days)`);
        continue;
      }

      const jobStartTime = new Date();
      try {
        // Only track outages, not full data
        await performOutageSync(ref, ref.userId);
        successCount++;

        await ScraperLog.create({ 
          jobType: 'daily_outage_track', 
          status: 'success', 
          referenceLast4: ref.referenceNoLast4, 
          startedAt: jobStartTime, 
          finishedAt: new Date() 
        });
        
        // Add a small delay between references to be polite to the API
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (err) {
        failCount++;
        console.error(`[Cron] Failed to track outage for ${ref.referenceNo}:`, err.message);
        await ScraperLog.create({ 
          jobType: 'daily_outage_track', 
          status: 'failed', 
          referenceLast4: ref.referenceNoLast4, 
          errorDetails: err.message, 
          startedAt: jobStartTime, 
          finishedAt: new Date() 
        });
      }
    }

    const totalDuration = Date.now() - jobStart;
    console.log(`[Cron] Outage tracking completed in ${totalDuration}ms - Success: ${successCount}, Failed: ${failCount}, Expired: ${expiredCount}`);
  } catch (error) {
    console.error('[Cron] Critical error in outage tracking job:', error.message);
  }
};
