import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import {
  ParsedBillSchema,
  type BillMediaType,
  type ParsedBill,
} from './billSchema';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You extract structured data from Pakistani electricity bills (LESCO, K-Electric, GEPCO, FESCO, IESCO, MEPCO, PESCO, HAZECO, HESCO, SEPCO, QESCO, TESCO).

Rules:
- Return all monetary values in PKR as plain numbers. Strip thousands separators and currency symbols.
- referenceNo is the 14-digit consumer meter number printed on the bill.
- isProtected is true only when the bill explicitly shows the consumer falling within the protected residential slab.
- sanctionedLoadKw is null when the bill does not state a sanctioned load.
- peakUnits and offPeakUnits are null on flat-rate bills that do not split TOU consumption.
- If a field genuinely is not legible on the bill, use null / empty string / 0 rather than guessing, and add a warning explaining it.
- confidence is your overall certainty in the extraction, between 0 and 1.`;

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

export function getVisionModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

export async function parseUtilityBillWithClaude(
  base64Payload: string,
  mediaType: BillMediaType
): Promise<ParsedBill> {
  const anthropic = getClient();

  const source =
    mediaType === 'application/pdf'
      ? ({
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64Payload,
          },
        } as const)
      : ({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64Payload,
          },
        } as const);

  const message = await anthropic.messages.parse({
    model: getVisionModel(),
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract the structured bill data from this document.' },
          source,
        ],
      },
    ],
    output_config: {
      format: zodOutputFormat(ParsedBillSchema),
    },
  });

  const parsed = message.parsed_output;
  if (!parsed) {
    throw new Error('Claude returned no structured output for this bill');
  }

  return ParsedBillSchema.parse(parsed);
}