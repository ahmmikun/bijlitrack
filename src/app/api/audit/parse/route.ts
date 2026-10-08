import { NextRequest, NextResponse } from 'next/server';
import { isBillMediaType } from '@/lib/claude/billSchema';
import { parseUtilityBillWithClaude } from '@/lib/claude/visionParser';
import { auditBill } from '@/lib/claude/auditEngine';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/** Hard ceiling on the decoded payload to stay inside serverless request limits. */
const MAX_PAYLOAD_BYTES = Math.floor(4.5 * 1024 * 1024);
const BASE64_OVERHEAD = 4 / 3;

/**
 * Magic-byte signatures per accepted media type. The client-supplied MIME type
 * is attacker-controlled, so the decoded header is verified before the payload
 * is forwarded to the Anthropic API. Each entry is a list of [offset, byte]
 * pairs, because WebP stores its container type at a fixed offset rather than
 * at the start of the file.
 */
const MAGIC_BYTES: Record<string, readonly (readonly [number, number])[]> = {
  'application/pdf': [[0, 0x25], [1, 0x50], [2, 0x44], [3, 0x46]], // %PDF
  'image/jpeg': [[0, 0xff], [1, 0xd8], [2, 0xff]],
  'image/png': [
    [0, 0x89], [1, 0x50], [2, 0x4e], [3, 0x47],
    [4, 0x0d], [5, 0x0a], [6, 0x1a], [7, 0x0a],
  ],
  'image/webp': [
    [0, 0x52], [1, 0x49], [2, 0x46], [3, 0x46], // RIFF
    [8, 0x57], [9, 0x45], [10, 0x42], [11, 0x50], // WEBP
  ],
};

/** Matches a decoded header against the signature table. */
function sniffMediaType(bytes: Uint8Array): string | null {
  for (const [mediaType, signature] of Object.entries(MAGIC_BYTES)) {
    if (signature.every(([offset, byte]) => bytes[offset] === byte)) {
      return mediaType;
    }
  }
  return null;
}

interface ParseRequestBody {
  fileBase64?: unknown;
  mediaType?: unknown;
}

export async function POST(req: NextRequest) {
  const declaredLength = req.headers.get('content-length');
  if (declaredLength && Number(declaredLength) > MAX_PAYLOAD_BYTES * BASE64_OVERHEAD) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bill exceeds the 4.5MB upload limit. Please upload a smaller file.',
      },
      { status: 413 }
    );
  }

  let body: ParseRequestBody;
  try {
    body = (await req.json()) as ParseRequestBody;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Request body must be valid JSON.' },
      { status: 400 }
    );
  }

  const { fileBase64, mediaType } = body;

  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    return NextResponse.json(
      { success: false, error: 'fileBase64 is required.' },
      { status: 400 }
    );
  }

  if (!isBillMediaType(mediaType)) {
    return NextResponse.json(
      {
        success: false,
        error:
          'mediaType must be application/pdf, image/jpeg, image/png, or image/webp.',
      },
      { status: 400 }
    );
  }

  // Strip any data URL prefix before validating.
  const base64 = fileBase64.includes(',')
    ? fileBase64.slice(fileBase64.indexOf(',') + 1)
    : fileBase64;

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    return NextResponse.json(
      { success: false, error: 'fileBase64 is not valid Base64.' },
      { status: 400 }
    );
  }

  const approxBytes = (base64.length * 3) / 4;
  if (approxBytes > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        error: `Bill exceeds the 4.5MB limit (received ~${(approxBytes / 1024 / 1024).toFixed(1)}MB).`,
      },
      { status: 413 }
    );
  }

  let decoded: Uint8Array;
  try {
    decoded = new Uint8Array(Buffer.from(base64, 'base64'));
  } catch {
    return NextResponse.json(
      { success: false, error: 'Could not decode the uploaded file.' },
      { status: 400 }
    );
  }

  const verifiedMediaType = sniffMediaType(decoded);
  if (!verifiedMediaType) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported file. Upload a PDF, JPEG, PNG, or WebP bill.',
      },
      { status: 400 }
    );
  }

  if (verifiedMediaType !== mediaType) {
    return NextResponse.json(
      {
        success: false,
        error: `File contents are ${verifiedMediaType}, not ${mediaType}.`,
      },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Bill audit service is not configured. Set ANTHROPIC_API_KEY.',
      },
      { status: 503 }
    );
  }

  try {
    const billData = await parseUtilityBillWithClaude(base64, mediaType);
    const auditFindings = auditBill(billData);

    return NextResponse.json({ success: true, billData, auditFindings });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Audit] Claude parse failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: message.includes('ANTHROPIC_API_KEY')
          ? message
          : 'Failed to parse this bill. It may be too low-resolution to read.',
      },
      { status: 502 }
    );
  }
}