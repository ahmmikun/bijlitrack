/**
 * CCMS Service - Direct client-side fetcher
 * Calls CCMS/PITC APIs directly from the user's browser/phone
 * This avoids geo-blocking since the request originates from a Pakistani IP
 */

const CCMS_BASE = 'https://ccms.pitc.com.pk';

/**
 * Parse load info data from get-loadinfo API
 */
const parseLoadInfo = (feederData: any) => {
  const result: any = {
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
  return parseLoadInfo(data.load[0].response.data[0]);
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
