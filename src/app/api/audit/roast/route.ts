import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRoast, isAIConfigured } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const RoastRequestSchema = z.object({
  totalUnits: z.coerce
    .number()
    .nonnegative('totalUnits cannot be negative')
    .max(100_000, 'totalUnits exceeds the plausible maximum for one billing cycle')
    .default(0),
  totalAmount: z.coerce.number().default(0),
  disco: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'LESCO')),
  isProtected: z.coerce.boolean().default(false),
  billingMonth: z
    .string()
    .nullish()
    .transform((val) => (val && val.trim().length > 0 ? val.trim() : 'Current Month')),
});

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
    console.warn('[Roast] Invalid payload received:', {
      issues: parsed.error.issues,
      rawPayload: raw,
    });
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

  if (!isAIConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Roast service is not configured. Set ANTHROPIC_API_KEY (main) or GEMINI_API_KEY (fallback).',
      },
      { status: 503 }
    );
  }

  const { totalUnits, totalAmount, disco, isProtected, billingMonth } =
    parsed.data;

  const roundedUnits = Math.round(totalUnits);
  const unitRate = roundedUnits > 0 ? totalAmount / roundedUnits : 0;
  const dailyAverage = roundedUnits / 30;

  const userPrompt = `Roast this bill.

DISCO: ${disco}
Billing month: ${billingMonth}
Protected consumer: ${isProtected ? 'yes' : 'no'}
Total units consumed: ${roundedUnits.toLocaleString('en-PK')} kWh
Total billed: PKR ${Math.round(totalAmount).toLocaleString('en-PK')}
Implied all-in rate: PKR ${unitRate.toFixed(2)} per kWh
Daily average: ${dailyAverage.toFixed(1)} kWh/day

Write the roast now.`;

  try {
    const roast = await generateRoast(userPrompt);
    return NextResponse.json({ success: true, roast });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Roast] Generation failed:', message);
    return NextResponse.json(
      {
        success: false,
        error:
          message.includes('API_KEY') || message.includes('configured')
            ? message
            : 'Could not generate the roast right now.',
      },
      { status: 502 }
    );
  }
}