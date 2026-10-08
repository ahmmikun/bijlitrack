import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { getVisionModel } from '@/lib/claude/visionParser';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const MAX_TOKENS = 600;

const RoastRequestSchema = z.object({
  totalUnits: z
    .number()
    .int('totalUnits must be a whole number of kWh')
    .positive('totalUnits must be greater than zero')
    .max(100_000, 'totalUnits exceeds the plausible maximum for one billing cycle'),
  totalAmount: z.number().nonnegative('totalAmount cannot be negative'),
  disco: z.string().min(1).max(120),
  isProtected: z.boolean(),
  billingMonth: z.string().min(1).max(60),
});

const SYSTEM_PROMPT = `You write short, funny electricity bill commentary for a Pakistani consumer app called BijliTrack.

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

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const parsed = RoastRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid roast payload.',
        details: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Roast service is not configured. Set ANTHROPIC_API_KEY.',
      },
      { status: 503 }
    );
  }

  const { totalUnits, totalAmount, disco, isProtected, billingMonth } =
    parsed.data;

  const unitRate = totalUnits > 0 ? totalAmount / totalUnits : 0;
  const dailyAverage = totalUnits / 30;

  const userPrompt = `Roast this bill.

DISCO: ${disco}
Billing month: ${billingMonth}
Protected consumer: ${isProtected ? 'yes' : 'no'}
Total units consumed: ${totalUnits.toLocaleString('en-PK')} kWh
Total billed: PKR ${totalAmount.toLocaleString('en-PK')}
Implied all-in rate: PKR ${unitRate.toFixed(2)} per kWh
Daily average: ${dailyAverage.toFixed(1)} kWh/day

Write the roast now.`;

  try {
    const anthropic = getClient();
    const message = await anthropic.messages.create({
      model: getVisionModel(),
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
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

    return NextResponse.json({ success: true, roast });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Roast] Generation failed:', message);
    return NextResponse.json(
      {
        success: false,
        error:
          message.includes('ANTHROPIC_API_KEY')
            ? message
            : 'Could not generate the roast right now.',
      },
      { status: 502 }
    );
  }
}