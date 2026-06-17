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
    error: null
  };

  try {
    // 1. Fetch User Details (Name, CNIC, Address, Feeder Code)
    const userRes = await fetch(`https://ccms.pitc.com.pk/api/details/user?reference=${referenceNo}`, { headers: HEADERS });
    const userData = await userRes.json();
    if (userData.message === 'Success') {
      result.user = userData.user;
    } else {
      throw new Error(userData.message || 'User details not found');
    }

    // 2. Fetch Bill Details (Current bill, 12-month history)
    const billRes = await fetch(`https://ccms.pitc.com.pk/api/details/bill?reference=${referenceNo}`, { headers: HEADERS });
    const billData = await billRes.json();
    if (billData.bill) {
      result.bill = billData.bill;
    }

    // 3. Fetch Schedule (Hourly load management, Voltage, Power)
    const feederCode = result.user?.FEEDERCD || result.bill?.basicInfo?.feederCode;
    // Note: Disco code for LESCO is usually 11000
    if (feederCode) {
      const scheduleRes = await fetch(`https://ccms.pitc.com.pk/api/schedule_api?&feeder_code=${feederCode}&disco_code=11000`, { headers: HEADERS });
      const scheduleData = await scheduleRes.json();
      result.schedule = scheduleData;
    }

    result.success = true;
    return result;
  } catch (err) {
    console.error('CCMS API Fetch Error:', err);
    result.error = err.message;
    return result;
  }
};
