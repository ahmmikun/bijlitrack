import { Reference } from '../models/Reference.js';
import { ConsumerSnapshot } from '../models/ConsumerSnapshot.js';
import { BillHistory } from '../models/BillHistory.js';
import { OutageHistory } from '../models/OutageHistory.js';
import { AnalysisReport } from '../models/AnalysisReport.js';
import * as cheerio from 'cheerio';

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
 * Get Expected Restoration Time by scraping CCMS HTML page (server-side)
 * This data is NOT available in the JSON API — only in the rendered HTML.
 * Pattern: <span><b>Expected Restoration Time: </b>03:15 AM</span>
 * 
 * Flow: GET consumer page → extract CSRF _token → POST /getflsinfo
 */
export const getRestorationTime = async (req, res) => {
  try {
    const reference = await verifyOwnership(req.user.id, req.params.referenceId);
    const referenceNo = reference.referenceNo;

    console.log(`[Dashboard] Fetching restoration time for ${referenceNo}`);

    const HEADERS = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Origin': 'https://ccms.pitc.com.pk',
      'Referer': 'https://ccms.pitc.com.pk/',
    };

    // Step 1: Fetch the consumer page to get CSRF token + cookies
    const pageResponse = await fetch(`https://ccms.pitc.com.pk/consumer/${referenceNo}`, {
      headers: HEADERS,
    });
    const pageHtml = await pageResponse.text();

    // Extract CSRF token from <meta name="csrf-token" content="..."> or <input name="_token" value="...">
    let csrfToken = null;
    const metaMatch = pageHtml.match(/name="csrf-token"\s+content="([^"]+)"/);
    if (metaMatch) csrfToken = metaMatch[1];
    if (!csrfToken) {
      const inputMatch = pageHtml.match(/name="_token"\s+value="([^"]+)"/);
      if (inputMatch) csrfToken = inputMatch[1];
    }
    if (!csrfToken) {
      const tokenMatch = pageHtml.match(/_token['"]\s*(?:value|content)\s*=\s*['"]([^'"]+)/);
      if (tokenMatch) csrfToken = tokenMatch[1];
    }

    // Get cookies from the page response for session
    const cookies = pageResponse.headers.get('set-cookie') || '';

    if (!csrfToken) {
      console.warn(`[Dashboard] Could not extract CSRF token for ${referenceNo}`);
      return res.json({ expectedRestorationTime: null, plannedOutage: null, actualOutage: null, historyOutage: null });
    }

    // Step 2: POST to getflsinfo with _token + reference + session cookies
    const postResponse = await fetch('https://ccms.pitc.com.pk/getflsinfo', {
      method: 'POST',
      headers: {
        ...HEADERS,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html, */*',
        ...(cookies ? { 'Cookie': cookies } : {}),
      },
      body: `_token=${encodeURIComponent(csrfToken)}&reference=${referenceNo}`,
    });
    const html = await postResponse.text();

    if (!html || html.length < 100) {
      return res.json({ expectedRestorationTime: null, plannedOutage: null, actualOutage: null, historyOutage: null });
    }

    const $ = cheerio.load(html);

    // Extract Expected Restoration Time
    let expectedRestorationTime = null;
    $('b').each((_, el) => {
      const text = $(el).text();
      if (text.includes('Expected Restoration Time')) {
        const parentSpan = $(el).parent();
        const fullText = parentSpan.text();
        const time = fullText.replace('Expected Restoration Time:', '').trim();
        if (time) expectedRestorationTime = time;
      }
    });

    // Extract outage summary badges
    const plannedOutage = $('#total_off').text().trim() || null;
    const actualOutage = $('#live_off').text().trim() || null;
    const historyOutage = $('#act_off').text().trim() || null;

    console.log(`[Dashboard] Restoration time for ${referenceNo}: ${expectedRestorationTime || 'N/A'} | Planned: ${plannedOutage} | Actual: ${actualOutage} | History: ${historyOutage}`);

    res.json({
      expectedRestorationTime,
      plannedOutage,
      actualOutage,
      historyOutage,
    });
  } catch (error) {
    console.error(`[Dashboard] Restoration time error:`, error.message);
    res.status(500).json({ message: 'Error fetching restoration time', error: error.message });
  }
};
