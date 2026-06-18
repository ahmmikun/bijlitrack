import * as cheerio from 'cheerio';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
};

/**
 * Parse complaint table HTML into structured data
 */
const parseComplaintTable = (html) => {
  const $ = cheerio.load(html);
  const complaints = [];

  $('table#dynamic-table tbody tr').each((_, row) => {
    const cells = $(row).find('td');
    if (cells.length < 7) return;

    const ticketNo = $(cells[0]).text().trim();
    const statusBadge = $(cells[1]).find('.badge').first().text().trim();
    const reopened = $(cells[1]).text().includes('Reopened');
    const refNo = $(cells[2]).text().trim();
    const nature = $(cells[3]).text().trim();
    const type = $(cells[4]).text().trim();
    const source = $(cells[5]).text().trim();
    const feedback = $(cells[6]).find('.badge').text().trim();

    // Parse history from last column
    const historyHtml = $(cells[7]).html() || '';
    const historyEntries = [];
    const historyParts = historyHtml.split('<br>');
    for (const part of historyParts) {
      const clean = cheerio.load(part).text().trim();
      if (clean) historyEntries.push(clean);
    }

    complaints.push({
      ticketNo,
      status: statusBadge,
      reopened,
      refNo,
      nature,
      type,
      source,
      feedback,
      history: historyEntries
    });
  });

  return complaints;
};

/**
 * Track complaints by reference number
 */
export const trackByReference = async (req, res) => {
  const { referenceNo } = req.query;

  if (!referenceNo || referenceNo.length !== 14 || !/^\d+$/.test(referenceNo)) {
    return res.status(400).json({ message: 'Invalid 14-digit reference number' });
  }

  console.log(`[Complaint] Track by reference: ${referenceNo}`);
  const start = Date.now();

  try {
    const response = await fetch(
      `https://ccms.pitc.com.pk/complainthistory?reference=${referenceNo}`,
      { headers: HEADERS }
    );
    const html = await response.text();
    const complaints = parseComplaintTable(html);

    console.log(`[Complaint] Found ${complaints.length} complaints for ${referenceNo} (${Date.now() - start}ms)`);
    res.json({ success: true, referenceNo, complaints });
  } catch (error) {
    console.error(`[Complaint] Track by reference error:`, error.message);
    res.status(500).json({ message: 'Failed to fetch complaint history', error: error.message });
  }
};

/**
 * Track complaint by ticket number
 */
export const trackByTicket = async (req, res) => {
  const { ticketNo } = req.query;

  if (!ticketNo || !ticketNo.trim()) {
    return res.status(400).json({ message: 'Ticket number is required' });
  }

  console.log(`[Complaint] Track by ticket: ${ticketNo}`);
  const start = Date.now();

  try {
    const response = await fetch(
      `https://ccms.pitc.com.pk/tracking/ticket?ticket_no=${ticketNo.trim()}`,
      { headers: HEADERS }
    );
    const html = await response.text();
    const complaints = parseComplaintTable(html);

    console.log(`[Complaint] Found ${complaints.length} result(s) for ticket ${ticketNo} (${Date.now() - start}ms)`);
    res.json({ success: true, ticketNo, complaints });
  } catch (error) {
    console.error(`[Complaint] Track by ticket error:`, error.message);
    res.status(500).json({ message: 'Failed to fetch ticket status', error: error.message });
  }
};
