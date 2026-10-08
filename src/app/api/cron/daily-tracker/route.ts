import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { Reference, ScraperLog } from '@/lib/server/models';
import { performOutageSync } from '@/lib/server/services/sync.service';

export const maxDuration = 60; // 60 seconds maximum execution on Vercel Pro/Hobby

export async function GET(req: NextRequest) {
  // Optional security check if CRON_SECRET is set
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  }

  const jobStart = Date.now();
  console.log('[Cron] Starting daily outage tracking job...');

  try {
    await connectDB();
    const now = new Date();

    const references = await Reference.find({ trackingEnabled: true });
    console.log(`[Cron] Found ${references.length} references to check`);

    if (references.length === 0) {
      return NextResponse.json({ message: 'No active references to track', count: 0 });
    }

    let successCount = 0;
    let failCount = 0;
    let expiredCount = 0;

    for (const ref of references) {
      if (ref.trackingEndDate && now > ref.trackingEndDate) {
        ref.trackingEnabled = false;
        await ref.save();
        expiredCount++;
        console.log(`[Cron] Tracking expired for ${ref.referenceNo}`);
        continue;
      }

      const jobStartTime = new Date();
      try {
        await performOutageSync(ref, ref.userId.toString());
        successCount++;

        await ScraperLog.create({
          jobType: 'daily_outage_track',
          status: 'success',
          referenceLast4: ref.referenceNoLast4,
          startedAt: jobStartTime,
          finishedAt: new Date(),
        });

        // Small 1s delay
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (err: unknown) {
        failCount++;
        const reason = err instanceof Error ? err.message : 'Unknown sync failure';
        console.error(`[Cron] Failed for ${ref.referenceNo}:`, reason);

        await ScraperLog.create({
          jobType: 'daily_outage_track',
          status: 'failed',
          referenceLast4: ref.referenceNoLast4,
          errorDetails: reason,
          startedAt: jobStartTime,
          finishedAt: new Date(),
        });
      }
    }

    const totalDuration = Date.now() - jobStart;
    return NextResponse.json({
      success: true,
      totalDurationMs: totalDuration,
      successCount,
      failCount,
      expiredCount,
    });
  } catch (error: unknown) {
    console.error('[Cron Error]', error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : 'Critical error in tracking job',
      },
      { status: 500 }
    );
  }
}
