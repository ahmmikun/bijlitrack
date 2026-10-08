import { NextRequest, NextResponse } from 'next/server';
import { DisputeRequestSchema } from '@/lib/claude/disputeSchema';
import { generateDisputeLetter } from '@/lib/claude/disputeGenerator';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

  const parsed = DisputeRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid dispute payload.',
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
        error: 'Dispute generator is not configured. Set ANTHROPIC_API_KEY.',
      },
      { status: 503 }
    );
  }

  try {
    const disputeLetter = await generateDisputeLetter(parsed.data);
    return NextResponse.json({ success: true, disputeLetter });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Dispute] Generation failed:', message);
    return NextResponse.json(
      {
        success: false,
        error:
          message.includes('ANTHROPIC_API_KEY')
            ? message
            : 'Could not draft the dispute notice. Please try again.',
      },
      { status: 502 }
    );
  }
}