/**
 * CCMS/PITC consumer portal client.
 *
 * Requests are issued from the browser rather than a serverless function
 * because CCMS geo-blocks datacenter IP ranges; a Pakistani-originated request
 * from the user's own device is not blocked.
 */

import type {
  CcmsBillPayload,
  CcmsBundle,
  CcmsFeederMeta,
  CcmsFeederPayload,
  CcmsUserPayload,
  FeederStatusSnapshot,
  ParsedComplaint,
  ParsedDayOutage,
  ParsedLoadInfo,
  RestorationSnapshot,
} from './ccms.types';

const CCMS_BASE = 'https://ccms.pitc.com.pk';

/** Reads a value that may arrive as a string from the upstream JSON. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Narrows an untyped JSON value to an array of numbers. */
function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry));
}

/** CCMS keys history as `dt_YYYYMMDD`; this normalises that to an ISO date. */
function toIsoDate(key: string): string | null {
  const raw = key.replace(/^dt_/, '');
  if (!/^\d{8}$/.test(raw)) return null;
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  return `${year}-${month}-${day}`;
}

/** Three-state hourly status derived from minutes of outage in that hour. */
function toHourlyStatus(minutes: number[]): string[] {
  return minutes.map((mins) => {
    if (mins === 0) return 'ON';
    if (mins >= 60) return 'OFF';
    return 'PARTIAL';
  });
}

function buildDayRecord(
  date: string,
  hourlyMinutes: number[],
  isScheduled: boolean
): ParsedDayOutage {
  const totalOutageMinutes = hourlyMinutes.reduce((sum, v) => sum + v, 0);
  return {
    date,
    hourlyOutageMinutes: hourlyMinutes,
    totalOutageMinutes,
    totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
    hourlyStatus: toHourlyStatus(hourlyMinutes),
    isScheduled,
  };
}

/** Today's date in Pakistan Standard Time (UTC+5), not the browser's zone. */
function todayInPakistan(): string {
  const now = new Date();
  const pkOffsetMinutes = 5 * 60;
  const local = new Date(
    now.getTime() + (pkOffsetMinutes + now.getTimezoneOffset()) * 60_000
  );
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(
    local.getDate()
  ).padStart(2, '0')}`;
}

const parseLoadInfo = (
  feederData: CcmsFeederPayload,
  feederMeta?: CcmsFeederMeta | null
): ParsedLoadInfo => {
  const result: ParsedLoadInfo = {
    feederCode: feederData.feeder_code ?? null,
    feederName: feederData.feeder ?? null,
    gridStation: feederData.grid ?? null,
    currentStatus: feederData.current_status ?? null,
    currentStatusTime: feederData.current_status_time ?? null,
    expectedRestorationTime:
      feederMeta?.time ?? feederData.expected_restoration_time ?? null,
    expectedRestorationDate: feederMeta?.date ?? null,
    expectedRestorationDuration: feederMeta?.duration ?? null,
    voltage: toNumber(feederData.voltage),
    current: toNumber(feederData.current),
    activePower: toNumber(feederData.active_power_kW),
    powerFactor: toNumber(feederData.power_factor),
    eventLogs: feederData.event_logs ?? [],
    days: {},
    todaySchedule: feederData.maintenance_sch ?? [],
    tripping: toNumberArray(feederData.tripping),
  };

  for (const [key, values] of Object.entries(feederData.history_data ?? {})) {
    const date = toIsoDate(key);
    if (!date) continue;
    result.days[date] = buildDayRecord(date, toNumberArray(values), false);
  }

  // Live tripping data is the current day's record, so it wins over the
  // history entry whenever it carries equal or greater outage minutes.
  const tripping = result.tripping;
  const today = todayInPakistan();
  const existing = result.days[today];
  const trippingTotal = tripping.reduce((sum, v) => sum + v, 0);

  if (!existing) {
    result.days[today] = buildDayRecord(today, tripping, false);
  } else if (trippingTotal > 0 && trippingTotal >= (existing.totalOutageMinutes || 0)) {
    result.days[today] = buildDayRecord(today, tripping, false);
  }

  for (const [key, values] of Object.entries(feederData.maintenance_data ?? {})) {
    const date = toIsoDate(key);
    if (!date) continue;
    // Never overwrite recorded actuals with a forward-looking schedule.
    if (result.days[date]) continue;
    result.days[date] = buildDayRecord(date, toNumberArray(values), true);
  }

  return result;
};

/**
 * Fetch user details (consumer info)
 */
export const fetchUserDetails = async (
  referenceNo: string
): Promise<CcmsUserPayload> => {
  const res = await fetch(`${CCMS_BASE}/api/details/user?reference=${referenceNo}`);
  const data = await res.json();
  if (data?.message !== 'Success' || !data.user) {
    throw new Error(data?.message || 'User not found');
  }
  return data.user as CcmsUserPayload;
};

/** Lightweight feeder poll used by the dashboard's live status query. */
export const fetchFeederStatus = async (
  referenceNo: string
): Promise<FeederStatusSnapshot> => {
  const res = await fetch(`${CCMS_BASE}/get-loadinfo/${referenceNo}`);
  const data = await res.json();
  const d = data?.load?.[0]?.response?.data?.[0] as CcmsFeederPayload | undefined;
  if (data?.message !== 'Success' || !d) {
    throw new Error('Status unavailable');
  }
  const feederMeta = (data.feeder ?? null) as CcmsFeederMeta | null;
  return {
    currentStatus: d.current_status ?? 'OFF',
    currentStatusTime: d.current_status_time ?? null,
    expectedRestorationTime: feederMeta?.time ?? d.expected_restoration_time ?? null,
    expectedRestorationDate: feederMeta?.date ?? null,
    expectedRestorationDuration: feederMeta?.duration ?? null,
    voltage: toNumber(d.voltage),
    powerFactor: toNumber(d.power_factor),
    activePower: toNumber(d.active_power_kW),
    feederName: d.feeder ?? null,
  };
};

export const fetchBillDetails = async (
  referenceNo: string
): Promise<CcmsBillPayload | null> => {
  const res = await fetch(`${CCMS_BASE}/api/details/bill?reference=${referenceNo}`);
  const data = await res.json();
  return (data.bill as CcmsBillPayload | null) ?? null;
};

export const fetchLoadInfo = async (referenceNo: string): Promise<ParsedLoadInfo> => {
  const res = await fetch(`${CCMS_BASE}/get-loadinfo/${referenceNo}`);
  const data = await res.json();
  const payload = data?.load?.[0]?.response?.data?.[0] as CcmsFeederPayload | undefined;
  if (data?.message !== 'Success' || !payload) {
    throw new Error('Load info not available');
  }
  return parseLoadInfo(payload, (data.feeder ?? null) as CcmsFeederMeta | null);
};

/**
 * Fetches user, bill and load info together. A partial failure is tolerated:
 * each branch resolves to null and records its own error rather than rejecting
 * the whole bundle.
 */
export const fetchAllCCMSData = async (referenceNo: string): Promise<CcmsBundle> => {
  const [user, bill, loadInfo] = await Promise.allSettled([
    fetchUserDetails(referenceNo),
    fetchBillDetails(referenceNo),
    fetchLoadInfo(referenceNo),
  ]);

  const reason = (result: PromiseRejectedResult): string | null =>
    result.reason instanceof Error ? result.reason.message : String(result.reason);

  return {
    user: user.status === 'fulfilled' ? user.value : null,
    bill: bill.status === 'fulfilled' ? bill.value : null,
    loadInfo: loadInfo.status === 'fulfilled' ? loadInfo.value : null,
    errors: {
      user: user.status === 'rejected' ? reason(user) : null,
      bill: bill.status === 'rejected' ? reason(bill) : null,
      loadInfo: loadInfo.status === 'rejected' ? reason(loadInfo) : null,
    },
  };
};

/**
 * Scrapes Expected Restoration Time from the load-management HTML page. The
 * value is only present in rendered markup, never in the JSON API, and only
 * while the feeder is off.
 *
 * Requires the XSRF-TOKEN cookie CCMS sets on first contact; without it the
 * POST is rejected, so this returns null rather than throwing.
 */
export const fetchExpectedRestorationTime = async (
  referenceNo: string
): Promise<RestorationSnapshot | null> => {
  try {
    // Get XSRF-TOKEN from cookie (set by CCMS when user visits any CCMS page/API)
    const cookieMatch = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    if (!cookieMatch) {
      // No XSRF cookie yet — hit CCMS homepage to set it
      await fetch(`${CCMS_BASE}/`, { credentials: 'include' });
    }

    const xsrfToken = decodeURIComponent(
      document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] || ''
    );

    if (!xsrfToken) {
      console.warn('[CCMS] No XSRF-TOKEN cookie available');
      return null;
    }

    // POST to getflsinfo with X-XSRF-TOKEN header + session cookie
    const res = await fetch(`${CCMS_BASE}/getflsinfo`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-XSRF-TOKEN': xsrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'text/html, */*',
      },
      credentials: 'include',
      body: `reference=${referenceNo}`,
    });

    const html = await res.text();
    if (html && html.length > 500 && html.includes('glaxy_status')) {
      return parseRestorationHTML(html);
    }
  } catch (err) {
    console.warn('[CCMS] Failed to fetch restoration time:', err);
  }

  return null;
};

/**
 * Parse the getflsinfo HTML response to extract restoration time and outage stats
 */
const parseRestorationHTML = (html: string): RestorationSnapshot => {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  let expectedRestorationTime: string | null = null;
  for (const bold of doc.querySelectorAll('b')) {
    if (!bold.textContent?.includes('Expected Restoration Time')) continue;
    const time = (bold.parentElement?.textContent ?? '')
      .replace('Expected Restoration Time:', '')
      .trim();
    if (time) expectedRestorationTime = time;
    break;
  }

  // Fallback for markup where the label is split across elements.
  if (!expectedRestorationTime) {
    const match = html.match(/Expected Restoration Time:\s*<\/b>\s*([^<]+)/i);
    if (match?.[1]) expectedRestorationTime = match[1].trim();
  }

  return {
    expectedRestorationTime,
    plannedOutage: doc.getElementById('total_off')?.textContent?.trim() || null,
    actualOutage: doc.getElementById('live_off')?.textContent?.trim() || null,
    historyOutage: doc.getElementById('act_off')?.textContent?.trim() || null,
  };
};

/**
 * Reads the complaint history table. Mirrors the server-side cheerio parser but
 * runs against DOMParser so it can execute in the browser.
 */
const parseComplaintHTML = (html: string): ParsedComplaint[] => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const complaints: ParsedComplaint[] = [];

  doc.querySelectorAll('table#dynamic-table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return;

    const text = (index: number): string => cells[index]?.textContent?.trim() ?? '';
    const badge = (index: number): string =>
      cells[index]?.querySelector('.badge')?.textContent?.trim() ?? '';

    const historyCell = cells[7];
    const history: string[] = [];
    if (historyCell) {
      for (const part of (historyCell.innerHTML || '').split(/<br\s*\/?>/i)) {
        const holder = document.createElement('div');
        holder.innerHTML = part;
        const clean = holder.textContent?.trim();
        if (clean) history.push(clean);
      }
    }

    complaints.push({
      ticketNo: text(0),
      status: badge(1),
      reopened: text(1).includes('Reopened'),
      refNo: text(2),
      nature: text(3),
      type: text(4),
      source: text(5),
      feedback: badge(6),
      history,
    });
  });

  return complaints;
};

/**
 * Fetch complaints by reference number (client-side, avoids geo-blocking)
 */
export const fetchComplaintsByReference = async (referenceNo: string) => {
  const res = await fetch(`${CCMS_BASE}/complainthistory?reference=${referenceNo}`);
  const html = await res.text();
  return parseComplaintHTML(html);
};

/**
 * Fetch complaint by ticket number (client-side, avoids geo-blocking)
 */
export const fetchComplaintByTicket = async (ticketNo: string) => {
  const res = await fetch(`${CCMS_BASE}/tracking/ticket?ticket_no=${ticketNo}`);
  const html = await res.text();
  return parseComplaintHTML(html);
};
