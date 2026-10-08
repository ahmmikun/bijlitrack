import Anthropic from '@anthropic-ai/sdk';
import {
  resolveDiscoLegalName,
  type DisputeRequest,
} from './disputeSchema';
import { getVisionModel } from './visionParser';

const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = `You draft formal consumer dispute petitions against Pakistani electricity distribution companies (DISCOs) on behalf of individual consumers.

Output requirements:
- Return ONLY the body of the petition as plain text. No markdown headings, no code fences, no bold/italic syntax.
- Use formal third-person impersonal register typical of Pakistani consumer correspondence. Never invent the consumer's voice or add personal pronouns beyond "I/we" where standard.
- Open with the addressee block, then a subject line quoting the reference number and billing month.
- Organise the body under short numbered paragraphs. One numbered point per distinct discrepancy.
- For each discrepancy, state the observed figure, the figure the applicable rule requires, and the resulting monetary difference.
- Cite statutory provisions inline where they genuinely apply. Use these framings:
  * Protected slab entitlement: NEPRA Consumer Eligibility Regulations and the applicable SRO tariff schedule for the consumer's category.
  * Fuel Cost Adjustment (FCA) and Quarterly Tariff Adjustment (QTA): the SRO notification approving that quarter's adjustment, and NEPRA's quarterly review mandate.
  * Section 235 advance income tax: the Income Tax Ordinance 2001 provisions, which apply to commercial and industrial supply above the statutory threshold and not to residential connections.
  * Sales tax: the Sales Tax General Orders applicable to electricity supply.
- Where a provision is genuinely uncertain for the facts given, write the substance of the argument and mark the citation as [VERIFY CITATION] rather than fabricating a section number. Never invent SRO numbers, notification dates, or case citations.
- Close with an explicit request for correction and a corresponding adjustment or credit in the next billing cycle, followed by a signature block for the consumer.

Content requirements:
- Never state a discrepancy was definitively proven. Use measured language such as "appears inconsistent with" or "requires correction".
- Do not include a specific date of issue; the consumer adds it.`;

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

export async function generateDisputeLetter(
  payload: DisputeRequest
): Promise<string> {
  const anthropic = getClient();
  const { billData, auditFindings } = payload;
  const discoName = resolveDiscoLegalName(billData.disco);

  const discrepancyLine =
    Math.abs(auditFindings.discrepancyAmount) >= 1
      ? `PKR ${Math.abs(auditFindings.discrepancyAmount).toLocaleString('en-PK')} (${
          auditFindings.discrepancyAmount > 0
            ? 'over-recovered from the consumer'
            : 'under-recovered in the consumer\'s favour'
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
${auditFindings.issuesDetected.length > 0 ? auditFindings.issuesDetected.map((issue, i) => `${i + 1}. ${issue}`).join('\n') : '1. Itemised charges on the bill do not reconcile to the printed total.'}

Write the petition now.`;

  const message = await anthropic.messages.create({
    model: getVisionModel(),
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const letter = message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!letter) {
    throw new Error('Claude returned an empty dispute letter');
  }

  return letter;
}