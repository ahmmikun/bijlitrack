import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/server/db';
import {
  Reference,
  BillHistory,
  OutageHistory,
  ConsumerSnapshot,
  AnalysisReport,
} from '@/lib/server/models';
import { verifyAuth } from '@/lib/server/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ referenceId: string }> }
) {
  try {
    const authUser = verifyAuth(req);
    await connectDB();

    const { referenceId } = await params;

    const reference = await Reference.findOne({ _id: referenceId, userId: authUser.id });
    if (!reference) {
      return NextResponse.json(
        { message: 'Reference not found or not authorized' },
        { status: 404 }
      );
    }

    // Check daily limit: 2 reports per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReportCount = await AnalysisReport.countDocuments({
      userId: authUser.id,
      generatedAt: { $gte: todayStart, $lte: todayEnd },
    });

    if (todayReportCount >= 2) {
      return NextResponse.json(
        {
          message:
            'Daily limit reached. You can generate up to 2 reports per day. Try again tomorrow.',
        },
        { status: 429 }
      );
    }

    const [billHistory, outageHistory, latestSnapshot] = await Promise.all([
      BillHistory.find({ referenceId: reference._id })
        .sort({ billMonth: -1 })
        .limit(13)
        .lean(),
      OutageHistory.find({ referenceId: reference._id })
        .sort({ date: -1 })
        .limit(30)
        .lean(),
      ConsumerSnapshot.findOne({ referenceId: reference._id })
        .sort({ scrapedAt: -1 })
        .lean(),
    ]);

    const billSummary = billHistory.map((b) => ({
      month: b.billMonth,
      amount: b.amountDue,
      status: b.status,
    }));

    const outageSummary = outageHistory.map((o) => ({
      date: new Date(o.date).toISOString().split('T')[0],
      totalMinutes: o.totalOutageMinutes,
      hours: o.actualOutageHours,
    }));

    const feederInfo =
      latestSnapshot?.outageInfo || latestSnapshot?.loadManagementInfo || {};
    const consumerInfo = latestSnapshot?.consumerInfo || {};
    const billingInfo = latestSnapshot?.billingInfo?.basicInfo || {};

    const prompt = `You are an electricity consumption analyst for Pakistani consumers. Analyze this data and provide a SHORT, actionable report.

CONSUMER: ${consumerInfo.NAME || 'Unknown'} | Tariff: ${consumerInfo.TARIFF || 'N/A'} | Load: ${consumerInfo.SLOAD || 'N/A'} kW
FEEDER: ${feederInfo.feederName || 'N/A'} | Grid: ${feederInfo.gridStation || 'N/A'} | Voltage: ${feederInfo.voltage || 0}kV | PF: ${feederInfo.powerFactor || 0}%
CURRENT BILL: Rs.${billingInfo.netBill || 0} | Units: ${billingInfo.totCurCons || billingInfo.totConsum || 0} kWh | Due: ${billingInfo.billDueDate || 'N/A'}

BILL HISTORY (last 12 months): ${JSON.stringify(billSummary)}

OUTAGE HISTORY (last 30 days): ${JSON.stringify(outageSummary)}

Respond in EXACTLY this JSON format (no markdown, no code blocks, just raw JSON):
{
  "summary": "2-3 sentence executive summary of their electricity situation",
  "billingInsights": ["insight 1", "insight 2", "insight 3"],
  "outageInsights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}

Keep each insight/recommendation under 20 words. Be specific with numbers. Focus on patterns and anomalies.`;

    const { isAIConfigured, generateDailyReport } = await import(
      '@/lib/ai/provider'
    );

    if (!isAIConfigured()) {
      return NextResponse.json(
        {
          message:
            'AI report service is not configured. Set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback) in environment variables.',
        },
        { status: 503 }
      );
    }

    let parsed;
    try {
      parsed = await generateDailyReport(prompt);
    } catch (err: unknown) {
      console.error('[Report] AI report generation failed:', err);
      return NextResponse.json(
        { message: 'Failed to generate AI report. Try again.' },
        { status: 502 }
      );
    }

    const report = new AnalysisReport({
      userId: authUser.id,
      referenceId: reference._id,
      reportType: 'daily',
      summary: parsed.summary || 'Report generated.',
      billingInsights: parsed.billingInsights || [],
      outageInsights: parsed.outageInsights || [],
      recommendations: parsed.recommendations || [],
      generatedAt: new Date(),
    });
    await report.save();

    return NextResponse.json(report, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes('Not authorized') ? 401 : 500;
    return NextResponse.json(
      { message: message || 'Error generating report' },
      { status }
    );
  }
}
