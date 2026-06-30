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

/**
 * Generate AI-powered analysis report using OpenRouter (DeepSeek)
 * Limit: 2 reports per user per day
 */
export const generateReport = async (req, res) => {
  try {
    const reference = await verifyOwnership(req.user.id, req.params.referenceId);

    console.log(`[Report] Generating AI report for ${reference.referenceNo} (user: ${req.user.id})`);

    // Check daily limit: 2 reports per user per day
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReportCount = await AnalysisReport.countDocuments({
      userId: req.user.id,
      generatedAt: { $gte: todayStart, $lte: todayEnd }
    });

    if (todayReportCount >= 2) {
      return res.status(429).json({ message: 'Daily limit reached. You can generate up to 2 reports per day. Try again tomorrow.' });
    }

    // Gather data for the report
    const [billHistory, outageHistory, latestSnapshot] = await Promise.all([
      BillHistory.find({ referenceId: reference._id }).sort({ billMonth: -1 }).limit(13).lean(),
      OutageHistory.find({ referenceId: reference._id }).sort({ date: -1 }).limit(30).lean(),
      ConsumerSnapshot.findOne({ referenceId: reference._id }).sort({ scrapedAt: -1 }).lean(),
    ]);

    // Build concise data summary for the AI prompt
    const billSummary = billHistory.map(b => ({
      month: b.billMonth,
      amount: b.amountDue,
      status: b.status,
    }));

    const outageSummary = outageHistory.map(o => ({
      date: new Date(o.date).toISOString().split('T')[0],
      totalMinutes: o.totalOutageMinutes,
      hours: o.actualOutageHours,
    }));

    const feederInfo = latestSnapshot?.outageInfo || latestSnapshot?.loadManagementInfo || {};
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

    // Call Groq API (free tier) — OpenAI-compatible endpoint
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'AI service not configured. Set GROQ_API_KEY in environment.' });
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error(`[Report] Groq API error (${aiResponse.status}): ${errText}`);
      return res.status(502).json({ message: 'AI service temporarily unavailable. Try again.' });
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';

    // Parse AI response
    let parsed;
    try {
      // Try to extract JSON from the response (in case AI wraps it in markdown)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : aiContent);
    } catch (parseErr) {
      console.error(`[Report] Failed to parse AI response:`, aiContent);
      return res.status(500).json({ message: 'Failed to parse AI report. Try again.' });
    }

    // Save report to DB
    const report = new AnalysisReport({
      userId: req.user.id,
      referenceId: reference._id,
      reportType: 'daily',
      summary: parsed.summary || 'Report generated.',
      billingInsights: parsed.billingInsights || [],
      outageInsights: parsed.outageInsights || [],
      recommendations: parsed.recommendations || [],
      generatedAt: new Date(),
    });
    await report.save();

    console.log(`[Report] AI report saved for ${reference.referenceNo} (reportId: ${report._id})`);

    res.status(201).json(report);
  } catch (error) {
    console.error(`[Report] Generation error:`, error.message);
    res.status(500).json({ message: 'Error generating report', error: error.message });
  }
};
