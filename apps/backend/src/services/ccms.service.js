/**
 * CCMS Service - Real-time Data Fetcher
 * Directly fetches data from public CCMS PITC APIs.
 */

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://ccms.pitc.com.pk',
  'Referer': 'https://ccms.pitc.com.pk/'
};

/**
 * Parse load info data from the get-loadinfo API response.
 * 
 * history_data format: { "dt_YYYYMMDD": [24 values] }
 *   - Each value = minutes of outage in that hour (0 = fully ON, 60 = fully OFF)
 *   - Example: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,20,55,0,0,0,0,0,0,0,0]
 *     means hour 14 had 20min off, hour 15 had 55min off
 * 
 * maintenance_sch: [24 values] - scheduled maintenance (minutes per hour)
 * maintenance_data: { "dt_YYYYMMDD": [24 values] } - scheduled load shedding per day
 * event_logs: [{event_time, event: "ON"/"OFF"}] - actual trip events with timestamps
 * 
 * @param {Object} feederData - The data[0] object from get-loadinfo API
 * @returns {Object} Parsed outage data for all available days
 */
export const parseLoadInfo = (feederData) => {
  const result = {
    feederCode: feederData.feeder_code || null,
    feederName: feederData.feeder || null,
    gridStation: feederData.grid || null,
    currentStatus: feederData.current_status || null,
    currentStatusTime: feederData.current_status_time || null,
    voltage: feederData.voltage || 0,
    current: feederData.current || 0,
    activePower: feederData.active_power_kW || 0,
    powerFactor: feederData.power_factor || 0,
    eventLogs: feederData.event_logs || [],
    // Per-day outage data
    days: {},
    // Today's schedule (maintenance_sch)
    todaySchedule: feederData.maintenance_sch || [],
    // Today's tripping data
    tripping: feederData.tripping || [],
  };

  // Parse history_data - actual outage minutes per hour per day
  if (feederData.history_data) {
    for (const [key, values] of Object.entries(feederData.history_data)) {
      const dateStr = key.replace('dt_', ''); // "20260617"
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? values : [];
      const totalOutageMinutes = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      result.days[date] = {
        date,
        hourlyOutageMinutes: hourlyMinutes, // [0-60] per hour, minutes OFF
        totalOutageMinutes,
        totalOutageHours: parseFloat((totalOutageMinutes / 60).toFixed(2)),
        // Convert to ON/OFF status per hour
        hourlyStatus: hourlyMinutes.map(mins => {
          if (mins === 0) return 'ON';
          if (mins >= 60) return 'OFF';
          return 'PARTIAL'; // Partially off during that hour
        }),
        scheduledMinutes: [],
        scheduledOutageMinutes: 0,
      };
    }
  }

  // Parse maintenance_data - scheduled load shedding per day
  if (feederData.maintenance_data) {
    for (const [key, values] of Object.entries(feederData.maintenance_data)) {
      const dateStr = key.replace('dt_', '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const day = dateStr.slice(6, 8);
      const date = `${year}-${month}-${day}`;

      const hourlyMinutes = Array.isArray(values) ? values : [];
      const totalScheduled = hourlyMinutes.reduce((sum, v) => sum + v, 0);

      if (result.days[date]) {
        result.days[date].scheduledMinutes = hourlyMinutes;
        result.days[date].scheduledOutageMinutes = totalScheduled;
      } else {
        result.days[date] = {
          date,
          hourlyOutageMinutes: new Array(24).fill(0),
          totalOutageMinutes: 0,
          totalOutageHours: 0,
          hourlyStatus: new Array(24).fill('ON'),
          scheduledMinutes: hourlyMinutes,
          scheduledOutageMinutes: totalScheduled,
        };
      }
    }
  }

  return result;
};

/**
 * Fetch load info data for a reference number
 * This is the primary API that gives all outage history, events, and real-time status
 * @param {string} referenceNo 
 */
export const fetchLoadInfo = async (referenceNo) => {
  const result = {
    success: false,
    referenceNo,
    timestamp: new Date().toISOString(),
    data: null,
    error: null
  };

  const start = Date.now();

  try {
    console.log(`[CCMS] Fetching load info for ${referenceNo}...`);
    const res = await fetch(`https://ccms.pitc.com.pk/get-loadinfo/${referenceNo}`, { headers: HEADERS });
    const json = await res.json();
    console.log(`[CCMS] Load info fetched (${Date.now() - start}ms) - Status: ${res.status}`);

    if (json.message !== 'Success' || !json.load?.[0]?.response?.data?.[0]) {
      throw new Error(json.message || 'Load info not found');
    }

    const feederData = json.load[0].response.data[0];
    result.data = parseLoadInfo(feederData);
    result.success = true;

    console.log(`[CCMS] Load info parsed for ${referenceNo} - Status: ${result.data.currentStatus}, Days: ${Object.keys(result.data.days).length}, Events: ${result.data.eventLogs.length}`);
    return result;
  } catch (err) {
    console.error(`[CCMS] Load info error for ${referenceNo} (${Date.now() - start}ms):`, err.message);
    result.error = err.message;
    return result;
  }
};

/**
 * Real-time fetch of all user, bill, and schedule details
 * @param {string} referenceNo 
 */
export const fetchAllDetails = async (referenceNo) => {
  const result = {
    success: false,
    referenceNo,
    timestamp: new Date().toISOString(),
    user: null,
    bill: null,
    schedule: null,
    loadInfo: null,
    error: null
  };

  const totalStart = Date.now();

  try {
    // 1. Fetch User Details (Name, CNIC, Address, Feeder Code)
    console.log(`[CCMS] Fetching user details for ${referenceNo}...`);
    let start = Date.now();
    const userRes = await fetch(`https://ccms.pitc.com.pk/api/details/user?reference=${referenceNo}`, { headers: HEADERS });
    const userData = await userRes.json();
    console.log(`[CCMS] User details fetched (${Date.now() - start}ms) - Status: ${userRes.status}`);

    if (userData.message === 'Success') {
      result.user = userData.user;
    } else {
      throw new Error(userData.message || 'User details not found');
    }

    // 2. Fetch Bill Details (Current bill, 12-month history)
    console.log(`[CCMS] Fetching bill details for ${referenceNo}...`);
    start = Date.now();
    const billRes = await fetch(`https://ccms.pitc.com.pk/api/details/bill?reference=${referenceNo}`, { headers: HEADERS });
    const billData = await billRes.json();
    console.log(`[CCMS] Bill details fetched (${Date.now() - start}ms) - Status: ${billRes.status}`);

    if (billData.bill) {
      result.bill = billData.bill;
    }

    // 3. Fetch Load Info (outages, events, real-time status)
    console.log(`[CCMS] Fetching load info for ${referenceNo}...`);
    start = Date.now();
    const loadRes = await fetch(`https://ccms.pitc.com.pk/get-loadinfo/${referenceNo}`, { headers: HEADERS });
    const loadJson = await loadRes.json();
    console.log(`[CCMS] Load info fetched (${Date.now() - start}ms) - Status: ${loadRes.status}`);

    if (loadJson.message === 'Success' && loadJson.load?.[0]?.response?.data?.[0]) {
      const feederData = loadJson.load[0].response.data[0];
      result.loadInfo = parseLoadInfo(feederData);
      result.schedule = result.loadInfo; // Backward compat
    }

    result.success = true;
    console.log(`[CCMS] All data fetched for ${referenceNo} (total: ${Date.now() - totalStart}ms)`);
    return result;
  } catch (err) {
    console.error(`[CCMS] API fetch error for ${referenceNo} (total: ${Date.now() - totalStart}ms):`, err.message);
    result.error = err.message;
    return result;
  }
};
