/**
 * CCMS Service - Direct client-side fetcher
 * Calls CCMS/PITC APIs directly from the user's browser/phone
 * This avoids geo-blocking since the request originates from a Pakistani IP
 */

const CCMS_BASE = 'https://ccms.pitc.com.pk';

/**
 * Parse load info data from get-loadinfo API
 */
const parseLoadInfo = (feederData: any, feederMeta?: any) => {
  const result: any = {
    feederCode: feederData.feeder_code || null,
    feederName: feederData.feeder || null,
    gridStation: feederData.grid || null,
    currentStatus: feederData.current_status || null,
    currentStatusTime: feederData.current_status_time || null,
    expectedRestorationTime: feederMeta?.time || feederData.expected_restoration_time || null,
    expectedRestorationDate: feederMeta?.date || null,
    expectedRestorationDuration: feederMeta?.duration || null,
    voltage: feederData.voltage || 0,
    current: feederData.current || 0,
    activePower: feederData.active_power_kW || 0,
    powerFactor: feederData.power_factor || 0,
    eventLogs: feederData.event_logs || [],
    days: {},
    todaySchedule: feederData.maintenance_sch || [],
    tripping: feederData.tripping || [],
  };

  // Parse history_data — actual outage minutes per hour per day
  if (feederData.history_data) {
    for (const [key, values] of Object.entries(feederData.history_data)) {
      const dateStr = key.replace('dt_', '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? values as number[] : [];
      const totalOutageMinutes = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      result.days[date] = {
        date,
        hourlyOutageMinutes: hourlyMinutes,
        totalOutageMinutes,
        totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
        hourlyStatus: hourlyMinutes.map(mins => {
          if (mins === 0) return 'ON';
          if (mins >= 60) return 'OFF';
          return 'PARTIAL';
        }),
      };
    }
  }

  // Add today's tripping data as today's record (real-time outage for current day)
  if (feederData.tripping && Array.isArray(feederData.tripping)) {
    // Use local date (Pakistan Standard Time, UTC+5) not UTC
    const now = new Date();
    const pkOffset = 5 * 60; // PKT is UTC+5
    const localTime = new Date(now.getTime() + (pkOffset + now.getTimezoneOffset()) * 60000);
    const today = `${localTime.getFullYear()}-${String(localTime.getMonth() + 1).padStart(2, '0')}-${String(localTime.getDate()).padStart(2, '0')}`;
    
    const hourlyMinutes = feederData.tripping as number[];
    const totalOutageMinutes = hourlyMinutes.reduce((sum: number, v: number) => sum + v, 0);

    // Only set tripping as today's record if today doesn't already have history_data
    // OR if tripping has more recent/complete data for today
    if (!result.days[today]) {
      result.days[today] = {
        date: today,
        hourlyOutageMinutes: hourlyMinutes,
        totalOutageMinutes,
        totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
        hourlyStatus: hourlyMinutes.map((mins: number) => {
          if (mins === 0) return 'ON';
          if (mins >= 60) return 'OFF';
          return 'PARTIAL';
        }),
      };
    } else if (totalOutageMinutes > 0) {
      // Today exists from history_data — merge: use tripping if it has more data
      // (tripping is real-time and may have newer hours filled in)
      const existingTotal = result.days[today].totalOutageMinutes || 0;
      if (totalOutageMinutes >= existingTotal) {
        result.days[today] = {
          ...result.days[today],
          hourlyOutageMinutes: hourlyMinutes,
          totalOutageMinutes,
          totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
          hourlyStatus: hourlyMinutes.map((mins: number) => {
            if (mins === 0) return 'ON';
            if (mins >= 60) return 'OFF';
            return 'PARTIAL';
          }),
        };
      }
    }
  }

  // Parse maintenance_data — scheduled load shedding per day (includes tomorrow)
  if (feederData.maintenance_data) {
    for (const [key, values] of Object.entries(feederData.maintenance_data)) {
      const dateStr = key.replace('dt_', '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? values as number[] : [];
      const totalScheduledMinutes = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      // If this date doesn't have a record yet (e.g. tomorrow), add it
      if (!result.days[date]) {
        result.days[date] = {
          date,
          hourlyOutageMinutes: hourlyMinutes, // scheduled = expected outage
          totalOutageMinutes: totalScheduledMinutes,
          totalOutageHours: parseFloat((totalScheduledMinutes / 60).toFixed(2)),
          hourlyStatus: hourlyMinutes.map(mins => {
            if (mins === 0) return 'ON';
            if (mins >= 60) return 'OFF';
            return 'PARTIAL';
          }),
          isScheduled: true, // Flag to differentiate from actual data
        };
      }
    }
  }

  return result;
};

/**
 * Fetch user details (consumer info)
 */
export const fetchUserDetails = async (referenceNo: string) => {
  const res = await fetch(`${CCMS_BASE}/api/details/user?reference=${referenceNo}`);
  const data = await res.json();
  if (data.message !== 'Success') throw new Error(data.message || 'User not found');
  return data.user;
};

/**
 * Fetch just the feeder status (lightweight, for live polling)
 * Returns: { currentStatus, voltage, powerFactor, currentStatusTime, feederName }
 */
export const fetchFeederStatus = async (referenceNo: string) => {
  const res = await fetch(`${CCMS_BASE}/get-loadinfo/${referenceNo}`);
  const data = await res.json();
  if (data.message !== 'Success' || !data.load?.[0]?.response?.data?.[0]) {
    throw new Error('Status unavailable');
  }
  const d = data.load[0].response.data[0];
  const feederMeta = data.feeder || null;
  return {
    currentStatus: d.current_status || 'OFF',
    currentStatusTime: d.current_status_time || null,
    expectedRestorationTime: feederMeta?.time || d.expected_restoration_time || null,
    expectedRestorationDate: feederMeta?.date || null,
    expectedRestorationDuration: feederMeta?.duration || null,
    voltage: d.voltage || 0,
    powerFactor: d.power_factor || 0,
    activePower: d.active_power_kW || 0,
    feederName: d.feeder || null,
  };
};

/**
 * Fetch bill details
 */
export const fetchBillDetails = async (referenceNo: string) => {
  const res = await fetch(`${CCMS_BASE}/api/details/bill?reference=${referenceNo}`);
  const data = await res.json();
  return data.bill || null;
};

/**
 * Fetch load info (outages, feeder status, history)
 */
export const fetchLoadInfo = async (referenceNo: string) => {
  const res = await fetch(`${CCMS_BASE}/get-loadinfo/${referenceNo}`);
  const data = await res.json();
  if (data.message !== 'Success' || !data.load?.[0]?.response?.data?.[0]) {
    throw new Error('Load info not available');
  }
  return parseLoadInfo(data.load[0].response.data[0], data.feeder || null);
};

/**
 * Fetch all data at once (user + bill + load info)
 */
export const fetchAllCCMSData = async (referenceNo: string) => {
  const [user, bill, loadInfo] = await Promise.allSettled([
    fetchUserDetails(referenceNo),
    fetchBillDetails(referenceNo),
    fetchLoadInfo(referenceNo),
  ]);

  return {
    user: user.status === 'fulfilled' ? user.value : null,
    bill: bill.status === 'fulfilled' ? bill.value : null,
    loadInfo: loadInfo.status === 'fulfilled' ? loadInfo.value : null,
    errors: {
      user: user.status === 'rejected' ? user.reason?.message : null,
      bill: bill.status === 'rejected' ? bill.reason?.message : null,
      loadInfo: loadInfo.status === 'rejected' ? loadInfo.reason?.message : null,
    }
  };
};

/**
 * Parse complaint table HTML into structured data (client-side)
 * Mirrors the backend cheerio logic but uses DOMParser for browser
 */
const parseComplaintHTML = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const complaints: any[] = [];

  const rows = doc.querySelectorAll('table#dynamic-table tbody tr');
  rows.forEach((row) => {
    const cells = row.querySelectorAll('td');
    if (cells.length < 7) return;

    const ticketNo = cells[0]?.textContent?.trim() || '';
    const statusBadge = cells[1]?.querySelector('.badge')?.textContent?.trim() || '';
    const reopened = cells[1]?.textContent?.includes('Reopened') || false;
    const refNo = cells[2]?.textContent?.trim() || '';
    const nature = cells[3]?.textContent?.trim() || '';
    const type = cells[4]?.textContent?.trim() || '';
    const source = cells[5]?.textContent?.trim() || '';
    const feedback = cells[6]?.querySelector('.badge')?.textContent?.trim() || '';

    // Parse history from last column
    const historyCell = cells[7];
    const historyEntries: string[] = [];
    if (historyCell) {
      const historyHTML = historyCell.innerHTML || '';
      const parts = historyHTML.split(/<br\s*\/?>/i);
      for (const part of parts) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = part;
        const clean = tempDiv.textContent?.trim() || '';
        if (clean) historyEntries.push(clean);
      }
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
      history: historyEntries,
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
