import { GoogleGenAI } from '@google/genai';
import {
  ParsedBillSchema,
  type BillMediaType,
  type ParsedBill,
} from '@/lib/claude/billSchema';
import {
  resolveDiscoLegalName,
  type DisputeRequest,
} from '@/lib/claude/disputeSchema';

const DEFAULT_MODEL = 'gemini-3.5-flash';
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-flash-latest',
];

const BILL_SYSTEM_PROMPT = `You extract structured data from Pakistani electricity bills (LESCO, K-Electric, GEPCO, FESCO, IESCO, MEPCO, PESCO, HAZECO, HESCO, SEPCO, QESCO, TESCO).

Rules:
- Return all monetary values in PKR as plain numbers. Strip thousands separators and currency symbols.
- All financialBreakdown fields must be numbers (use 0 for any charge/tax not present or unitemized, never null).
- referenceNo is the 14-digit consumer meter number printed on the bill.
- isProtected is true only when the bill explicitly shows the consumer falling within the protected residential slab (typically <= 200 units for consecutive months).
- sanctionedLoadKw is null when the bill does not state a sanctioned load.
- peakUnits and offPeakUnits are null on flat-rate bills that do not split TOU consumption.
- If a field genuinely is not legible on the bill, use null / empty string / 0 rather than guessing, and add a warning explaining it.
- confidence is your overall certainty in the extraction, between 0 and 1.
- You must output valid JSON matching this schema:
{
  "consumer": {
    "name": "Consumer Name",
    "referenceNo": "14-digit reference number",
    "disco": "DISCO name",
    "billingMonth": "Billing month"
  },
  "tariff": {
    "category": "category string",
    "isProtected": true,
    "sanctionedLoadKw": null
  },
  "consumption": {
    "totalUnits": 0,
    "peakUnits": null,
    "offPeakUnits": null
  },
  "financialBreakdown": {
    "costOfElectricity": 0,
    "fca": 0,
    "qta": 0,
    "electricityDuty": 0,
    "salesTax": 0,
    "advanceIncomeTax": 0,
    "totalAmount": 0
  },
  "confidence": 0.95,
  "warnings": []
}`;

const DISPUTE_SYSTEM_PROMPT = `You draft formal consumer dispute petitions against Pakistani electricity distribution companies (DISCOs) on behalf of individual consumers.

Output requirements:
- Return ONLY the body of the petition as plain text. No markdown headings, no code fences, no bold/italic syntax.
- Use formal third-person impersonal register typical of Pakistani consumer correspondence. Never invent the consumer's voice or add personal pronouns beyond "I/we" where standard.
- Open with the addressee block, then a subject line quoting the reference number and billing month.
- Organise the body under short numbered paragraphs. One numbered point per distinct discrepancy.
- For each discrepancy, state the observed figure, the figure the applicable rule requires, and the resulting monetary difference.
- Cite statutory provisions inline where they genuinely apply:
  * Protected slab entitlement: NEPRA Consumer Eligibility Regulations and the applicable SRO tariff schedule for the consumer's category.
  * Fuel Cost Adjustment (FCA) and Quarterly Tariff Adjustment (QTA): the SRO notification approving that quarter's adjustment, and NEPRA's quarterly review mandate.
  * Section 235 advance income tax: the Income Tax Ordinance 2001 provisions.
  * Sales tax: the Sales Tax General Orders applicable to electricity supply.
- Close with an explicit request for correction and a corresponding adjustment or credit in the next billing cycle, followed by a signature block for the consumer.
- Plain text only.`;

const ROAST_SYSTEM_PROMPT = `You write short, funny electricity bill commentary for a Pakistani consumer app called BijliTrack.

Tone:
- Warm and self-deprecating. Roast the consumer's habits, never their intelligence, never their finances in a cruel way, and never their family or religion.
- Use light Pakistani cultural texture naturally: LESCO and K-Electric names, load shedding frustration, geyser season, AC economics, "protected slab" anxiety, summer temperature complaints.
- Genuinely funny. Do not be corny or forced. Two sentences maximum for the roast.

Structure (output plain text, no markdown headings or bold):
- First: exactly 2 punchy sentences roasting the consumption profile. Ground it in the actual numbers given.
- Then a line "Tips to cut your bill:" followed by exactly 2 bullet points starting with "- ".

Hard rules:
- Do not invent line items or figures. Only reference numbers supplied in the prompt.
- Tips must be realistic for a Pakistani household and actionable within one billing cycle.
- Plain text only. No code fences, no emoji.`;

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Resilient content generator that attempts primary model and fails over to candidates on 503/404 errors.
 */
async function generateWithFallback(
  ai: GoogleGenAI,
  primaryModel: string,
  params: {
    contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents'];
    config?: Parameters<GoogleGenAI['models']['generateContent']>[0]['config'];
  }
) {
  const modelsToTry = [
    primaryModel,
    ...CANDIDATE_MODELS.filter((m) => m !== primaryModel),
  ];

  let lastError: unknown;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        ...params,
        model,
      });
      return response;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Gemini] Attempt with model '${model}' failed:`, msg);
      lastError = err;
      if (
        msg.includes('503') ||
        msg.includes('404') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('NOT_FOUND') ||
        msg.includes('no longer available')
      ) {
        continue;
      }
      if (msg.includes('API_KEY') || msg.includes('API key')) {
        throw err;
      }
    }
  }
  throw lastError;
}

/**
 * Normalizes raw Gemini output into strict types conforming to ParsedBillSchema.
 */
function sanitizeParsedBill(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const record = raw as Record<string, unknown>;

  const num = (v: unknown, def = 0): number => {
    if (v === null || v === undefined) return def;
    if (typeof v === 'number') return isNaN(v) ? def : v;
    if (typeof v === 'string') {
      const parsed = parseFloat(v.replace(/[^0-9.-]/g, ''));
      return isNaN(parsed) ? def : parsed;
    }
    return def;
  };

  const numOrNull = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    return num(v, 0);
  };

  const consumer = (record.consumer || {}) as Record<string, unknown>;
  const tariff = (record.tariff || {}) as Record<string, unknown>;
  const consumption = (record.consumption || {}) as Record<string, unknown>;
  const fb = (record.financialBreakdown || {}) as Record<string, unknown>;

  return {
    consumer: {
      name: String(consumer.name || 'Consumer').trim(),
      referenceNo: String(consumer.referenceNo || '').replace(/\D/g, '').slice(0, 14),
      disco: String(consumer.disco || 'LESCO').trim(),
      billingMonth: String(consumer.billingMonth || '').trim(),
    },
    tariff: {
      category: String(tariff.category || 'A1-R Residential').trim(),
      isProtected: Boolean(tariff.isProtected),
      sanctionedLoadKw: numOrNull(tariff.sanctionedLoadKw),
    },
    consumption: {
      totalUnits: num(consumption.totalUnits, 0),
      peakUnits: numOrNull(consumption.peakUnits),
      offPeakUnits: numOrNull(consumption.offPeakUnits),
    },
    financialBreakdown: {
      costOfElectricity: num(fb.costOfElectricity, 0),
      fca: num(fb.fca, 0),
      qta: num(fb.qta, 0),
      electricityDuty: num(fb.electricityDuty, 0),
      salesTax: num(fb.salesTax, 0),
      advanceIncomeTax: num(fb.advanceIncomeTax, 0),
      totalAmount: num(fb.totalAmount, 0),
    },
    confidence: typeof record.confidence === 'number' && !isNaN(record.confidence)
      ? Math.max(0, Math.min(1, record.confidence))
      : 0.9,
    warnings: Array.isArray(record.warnings) ? record.warnings.map(String) : [],
  };
}

export async function parseUtilityBillWithGemini(
  base64Payload: string,
  mediaType: BillMediaType
): Promise<ParsedBill> {
  const ai = getGeminiClient();

  const response = await generateWithFallback(ai, getGeminiModel(), {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: mediaType,
              data: base64Payload,
            },
          },
          {
            text: 'Extract the structured electricity bill data from this document following the schema strictly.',
          },
        ],
      },
    ],
    config: {
      systemInstruction: BILL_SYSTEM_PROMPT,
      responseMimeType: 'application/json',
    },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Gemini returned no output for this bill');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      raw = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('Gemini output could not be parsed as JSON');
    }
  }

  const sanitized = sanitizeParsedBill(raw);
  return ParsedBillSchema.parse(sanitized);
}

export async function generateDisputeLetterWithGemini(
  payload: DisputeRequest
): Promise<string> {
  const ai = getGeminiClient();
  const { billData, auditFindings } = payload;
  const discoName = resolveDiscoLegalName(billData.disco);

  const discrepancyLine =
    Math.abs(auditFindings.discrepancyAmount) >= 1
      ? `PKR ${Math.abs(auditFindings.discrepancyAmount).toLocaleString('en-PK')} (${
          auditFindings.discrepancyAmount > 0
            ? 'over-recovered from the consumer'
            : "under-recovered in the consumer's favour"
        })`
      : 'an amount pending verification';

  const userPrompt = `Draft a dispute petition with these facts.

ADDRESSEE
Distribution company: ${discoName}
Also for escalation: NEPRA Consumer Complaints Tribunal

CONSUMER
Name: ${billData.consumerName}
Reference number: ${billData.referenceNo}
Billing month: ${billData.billingMonth}

BILL UNDER DISPUTE
Total billed amount: PKR ${billData.totalAmount.toLocaleString('en-PK')}

AUDIT FINDINGS
Quantified discrepancy: ${discrepancyLine}
Recommended action: ${auditFindings.recommendedAction}

Issues identified:
${
  auditFindings.issuesDetected.length > 0
    ? auditFindings.issuesDetected.map((issue, i) => `${i + 1}. ${issue}`).join('\n')
    : '1. Itemised charges on the bill do not reconcile to the printed total.'
}

Write the petition now.`;

  const response = await generateWithFallback(ai, getGeminiModel(), {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: DISPUTE_SYSTEM_PROMPT,
    },
  });

  const letter = (response.text || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!letter) {
    throw new Error('Gemini returned an empty dispute letter');
  }

  return letter;
}

export async function generateRoastWithGemini(userPrompt: string): Promise<string> {
  const ai = getGeminiClient();

  const response = await generateWithFallback(ai, getGeminiModel(), {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    config: {
      systemInstruction: ROAST_SYSTEM_PROMPT,
    },
  });

  const roast = (response.text || '')
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!roast) {
    throw new Error('Gemini returned an empty roast');
  }

  return roast;
}

export async function generateDailyReportWithGemini(prompt: string): Promise<{
  summary: string;
  billingInsights: string[];
  outageInsights: string[];
  recommendations: string[];
}> {
  const ai = getGeminiClient();

  const response = await generateWithFallback(ai, getGeminiModel(), {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
    },
  });

  const text = response.text?.trim() || '';
  type ReportResponse = {
    summary: string;
    billingInsights: string[];
    outageInsights: string[];
    recommendations: string[];
  };
  let parsed: ReportResponse;
  try {
    parsed = JSON.parse(text) as ReportResponse;
  } catch {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]) as ReportResponse;
    } else {
      throw new Error('Failed to parse Gemini report response');
    }
  }

  return {
    summary: parsed.summary || 'Daily analysis report generated.',
    billingInsights: Array.isArray(parsed.billingInsights) ? parsed.billingInsights : [],
    outageInsights: Array.isArray(parsed.outageInsights) ? parsed.outageInsights : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
  };
}
