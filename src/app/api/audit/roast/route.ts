import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { generateRoast, isAIConfigured } from '@/lib/ai/provider';

export const runtime = 'nodejs';
export const maxDuration = 30;
export const dynamic = 'force-dynamic';

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