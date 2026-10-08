import { type BillMediaType, type ParsedBill } from '@/lib/claude/billSchema';
import { type DisputeRequest } from '@/lib/claude/disputeSchema';
import {
  parseUtilityBillWithGemini,
  generateDisputeLetterWithGemini,
  generateRoastWithGemini,
  generateDailyReportWithGemini,
  isGeminiConfigured,
  getGeminiModel,
} from '@/lib/gemini/geminiClient';
import {
  parseUtilityBillWithClaude,
  getVisionModel as getClaudeModel,
} from '@/lib/claude/visionParser';
import { generateDisputeLetter as generateDisputeLetterWithClaude } from '@/lib/claude/disputeGenerator';

export type AIProvider = 'claude' | 'gemini';

export interface ParsedBillExecutionResult {
  billData: ParsedBill;
  provider: AIProvider;
  model: string;
}

export interface DailyReportResult {
  summary: string;
  billingInsights: string[];
  outageInsights: string[];
  recommendations: string[];
}

export function isClaudeConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

export function isGeminiConfiguredSafe(): boolean {
  return isGeminiConfigured();
}

export function isAIConfigured(): boolean {
  return isClaudeConfigured() || isGeminiConfigured();
}

/**
 * Determines the primary active AI provider.
 * Priority:
 * 1. Explicit AI_PROVIDER setting (if valid & configured)
 * 2. Claude (Main)
 * 3. Gemini (Fallback)
 */
export function getActiveAIProvider(): AIProvider | null {
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasClaude = isClaudeConfigured();
  const hasGemini = isGeminiConfigured();

  if (preferred === 'gemini' && hasGemini) return 'gemini';
  if (preferred === 'claude' && hasClaude) return 'claude';

  if (hasClaude) return 'claude';
  if (hasGemini) return 'gemini';

  return null;
}

export function getActiveModelInfo(): { provider: AIProvider; model: string } | null {
  const provider = getActiveAIProvider();
  if (provider === 'claude') {
    return { provider: 'claude', model: getClaudeModel() };
  }
  if (provider === 'gemini') {
    return { provider: 'gemini', model: getGeminiModel() };
  }
  return null;
}

/**
 * Returns prioritized list of providers to attempt:
 * Default: Claude -> Gemini.
 */
function getExecutionOrder(): AIProvider[] {
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (preferred === 'gemini') {
    return ['gemini', 'claude'];
  }
  return ['claude', 'gemini'];
}

/**
 * Parses utility bill with Claude as primary and Gemini as fallback.
 */
export async function parseUtilityBill(
  base64Payload: string,
  mediaType: BillMediaType
): Promise<ParsedBillExecutionResult> {
  const hasClaude = isClaudeConfigured();
  const hasGemini = isGeminiConfigured();

  if (!hasClaude && !hasGemini) {
    throw new Error(
      'AI service is not configured. Please set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback) in your environment.'
    );
  }

  const order = getExecutionOrder();
  let lastError: unknown;

  for (const provider of order) {
    if (provider === 'claude' && hasClaude) {
      try {
        console.log('[AI Provider] Parsing bill with Claude (Main)...');
        const billData = await parseUtilityBillWithClaude(base64Payload, mediaType);
        return { billData, provider: 'claude', model: getClaudeModel() };
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Claude attempt failed (${msg}). Falling back to Gemini...`);
      }
    } else if (provider === 'gemini' && hasGemini) {
      try {
        console.log('[AI Provider] Parsing bill with Gemini (Fallback)...');
        const billData = await parseUtilityBillWithGemini(base64Payload, mediaType);
        return { billData, provider: 'gemini', model: getGeminiModel() };
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Gemini attempt failed: ${msg}`);
      }
    }
  }

  throw lastError;
}

/**
 * Generates formal dispute petition with Claude as primary and Gemini as fallback.
 */
export async function generateDispute(payload: DisputeRequest): Promise<string> {
  const hasClaude = isClaudeConfigured();
  const hasGemini = isGeminiConfigured();

  if (!hasClaude && !hasGemini) {
    throw new Error(
      'AI service is not configured. Please set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback) in your environment.'
    );
  }

  const order = getExecutionOrder();
  let lastError: unknown;

  for (const provider of order) {
    if (provider === 'claude' && hasClaude) {
      try {
        console.log('[AI Provider] Drafting dispute letter with Claude (Main)...');
        return await generateDisputeLetterWithClaude(payload);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Claude dispute drafting failed (${msg}). Falling back to Gemini...`);
      }
    } else if (provider === 'gemini' && hasGemini) {
      try {
        console.log('[AI Provider] Drafting dispute letter with Gemini (Fallback)...');
        return await generateDisputeLetterWithGemini(payload);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Gemini dispute drafting failed: ${msg}`);
      }
    }
  }

  throw lastError;
}

async function generateRoastWithClaude(userPrompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const anthropic = new Anthropic({ apiKey });

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
- If consumption is modest, roast mildly rather than inventing a problem.
- No medical, legal, or financial advice. No mention of other people's data.
- Plain text only. No code fences, no emoji.`;

  const message = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 600,
    system: ROAST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const roast = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!roast) {
    throw new Error('Claude returned an empty roast');
  }

  return roast;
}

/**
 * Generates bill roast with Claude as primary and Gemini as fallback.
 */
export async function generateRoast(userPrompt: string): Promise<string> {
  const hasClaude = isClaudeConfigured();
  const hasGemini = isGeminiConfigured();

  if (!hasClaude && !hasGemini) {
    throw new Error(
      'AI service is not configured. Please set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback) in your environment.'
    );
  }

  const order = getExecutionOrder();
  let lastError: unknown;

  for (const provider of order) {
    if (provider === 'claude' && hasClaude) {
      try {
        console.log('[AI Provider] Generating roast with Claude (Main)...');
        return await generateRoastWithClaude(userPrompt);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Claude roast failed (${msg}). Falling back to Gemini...`);
      }
    } else if (provider === 'gemini' && hasGemini) {
      try {
        console.log('[AI Provider] Generating roast with Gemini (Fallback)...');
        return await generateRoastWithGemini(userPrompt);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Gemini roast failed: ${msg}`);
      }
    }
  }

  throw lastError;
}

async function generateDailyReportWithClaude(prompt: string): Promise<DailyReportResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: getClaudeModel(),
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const raw = JSON.parse(jsonMatch ? jsonMatch[0] : text) as Partial<DailyReportResult>;

  return {
    summary: raw.summary || 'Daily analysis report generated.',
    billingInsights: Array.isArray(raw.billingInsights) ? raw.billingInsights : [],
    outageInsights: Array.isArray(raw.outageInsights) ? raw.outageInsights : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations : [],
  };
}

/**
 * Generates daily analysis report with Claude as primary and Gemini as fallback.
 */
export async function generateDailyReport(prompt: string): Promise<DailyReportResult> {
  const hasClaude = isClaudeConfigured();
  const hasGemini = isGeminiConfigured();

  if (!hasClaude && !hasGemini) {
    throw new Error(
      'AI report service is not configured. Set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback) in environment variables.'
    );
  }

  const order = getExecutionOrder();
  let lastError: unknown;

  for (const provider of order) {
    if (provider === 'claude' && hasClaude) {
      try {
        console.log('[AI Provider] Generating daily report with Claude (Main)...');
        return await generateDailyReportWithClaude(prompt);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Claude report generation failed (${msg}). Falling back to Gemini...`);
      }
    } else if (provider === 'gemini' && hasGemini) {
      try {
        console.log('[AI Provider] Generating daily report with Gemini (Fallback)...');
        return await generateDailyReportWithGemini(prompt);
      } catch (err: unknown) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Provider] Gemini report generation failed: ${msg}`);
      }
    }
  }

  throw lastError;
}
