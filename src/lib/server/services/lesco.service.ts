import axios from 'axios';
import https from 'https';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

export interface LescoPortalPayload {
  batch: string;
  subDiv: string;
  refNo: string;
  ru: string;
  capCode: string;
  cookies: string[];
}

export interface OfficialBillResult {
  success: boolean;
  html?: string;
  error?: string;
  referenceNo?: string;
}

/**
 * Executes steps 1-3 to get the verified CapCode and parameters for LESCO Bill.aspx
 */
export async function getLescoPortalPayload(referenceNo: string): Promise<LescoPortalPayload> {
  const cleanRef = referenceNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanRef.length < 14) {
    throw new Error('Reference number must be at least 14 alphanumeric characters.');
  }

  const batch = cleanRef.slice(0, 2);
  const subDiv = cleanRef.slice(2, 7);
  const refNo = cleanRef.slice(7, 14);
  const ru = cleanRef.slice(14) || 'U';

  const client = axios.create({
    httpsAgent,
    timeout: 15000,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  const cookies: string[] = [];
  const addCookies = (res: any) => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      setCookie.forEach((c: string) => {
        cookies.push(c.split(';')[0]);
      });
    }
  };

  // 1. Initial portal handshake
  const res1 = await client.get(
    'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/CheckBill.asp?nErr=1'
  );
  addCookies(res1);

  // 2. Submit reference to CustomerMenu
  const menuParams = new URLSearchParams({
    txtBatchNo: batch,
    txtSubDiv: subDiv,
    txtRefNo: refNo,
    cmbRU: ru,
  });

  const res2 = await client.post(
    'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/CustomerMenu.asp',
    menuParams.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookies.join('; '),
        Referer: 'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/CheckBill.asp?nErr=1',
      },
    }
  );
  addCookies(res2);

  // 3. Obtain captcha code from codeimage.asp 302 Location header
  const resCaptcha = await client.get(
    'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/codeimage.asp',
    {
      headers: {
        Cookie: cookies.join('; '),
        Referer: 'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/CustomerMenu.asp',
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400,
    }
  );
  addCookies(resCaptcha);

  const location = resCaptcha.headers['location'] || '';
  const match = location.match(/code=([A-Z0-9]+)/i);
  if (!match || !match[1]) {
    throw new Error('Failed to retrieve portal verification token.');
  }
  const capCode = match[1];

  return {
    batch,
    subDiv,
    refNo,
    ru,
    capCode,
    cookies,
  };
}

/**
 * Automatically fetches the official LESCO electricity bill bypassing the captcha
 * and rewrites assets for in-app display and printing.
 */
export async function fetchOfficialLescoBill(referenceNo: string): Promise<OfficialBillResult> {
  try {
    const payload = await getLescoPortalPayload(referenceNo);

    const client = axios.create({
      httpsAgent,
      timeout: 15000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const cookies = [...payload.cookies];
    const addCookies = (res: any) => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie && Array.isArray(setCookie)) {
        setCookie.forEach((c: string) => {
          cookies.push(c.split(';')[0]);
        });
      }
    };

    // 4. Submit to BillPrint.asp
    const printParams = new URLSearchParams({
      nBatchNo: payload.batch,
      nSubDiv: payload.subDiv,
      nRefNo: payload.refNo,
      strRU: payload.ru,
      nCustID: '',
      code: payload.capCode,
    });

    const resPrint = await client.post(
      'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/BillPrint.asp',
      printParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies.join('; '),
          Referer: 'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/CustomerMenu.asp',
        },
        validateStatus: (status) => status < 400,
      }
    );
    addCookies(resPrint);

    // 5. POST to Bill.aspx on port 36260
    const finalParams = new URLSearchParams({
      BatchNo: payload.batch,
      SubDiv: payload.subDiv,
      RefNo: payload.refNo,
      RU: payload.ru,
      CapCode: payload.capCode,
    });

    const resBill = await client.post(
      'https://bill.lesco.gov.pk:36260/Bill.aspx',
      finalParams.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies.join('; '),
          Referer: 'https://bill.lesco.gov.pk:36269/Modules/CustomerBillN/BillPrint.asp',
        },
        validateStatus: (status) => status < 400,
      }
    );

    let html = resBill.data as string;
    if (!html || !html.includes('LESCO')) {
      return { success: false, error: 'LESCO portal returned an empty or invalid bill response.' };
    }

    // 6. Rewrite relative assets (styles, scripts, images) to absolute LESCO URLs
    const BASE_ASSETS = 'https://bill.lesco.gov.pk:36260';
    html = html
      .replace(/src=["'](?!https?:\/\/|data:)\.?\/?([^"']+)["']/gi, `src="${BASE_ASSETS}/$1"`)
      .replace(/href=["'](?!https?:\/\/|data:|javascript:)\.?\/?([^"']+)["']/gi, `href="${BASE_ASSETS}/$1"`);

    // Injected print styles ensuring background graphics and exact A4 portrait dimensions
    const printStyles = `
      <style>
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @media print {
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }
          #printPageButton, .no-print, header, nav, .print-btn {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
        }
      </style>
    `;

    html = html.replace('</head>', `${printStyles}</head>`);

    return {
      success: true,
      html,
      referenceNo: referenceNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
    };
  } catch (error: any) {
    console.error('[LescoService] Bill fetching error:', error?.message);
    return {
      success: false,
      error: error?.message || 'Failed to connect to LESCO bill portal.',
    };
  }
}
