# BijliTrack

Multimodal utility auditing and tariff engine for Pakistani distribution companies (DISCOs).

BijliTrack reads a consumer's electricity bill, checks the charge breakdown against
NEPRA tariff rules, and surfaces overbilling. It also tracks feeder outages from the
CCMS/PITC portal and models the protected-slab cliff so consumers can see a reclassification
coming before it lands on a bill.

All DISCO data comes from the public [CCMS/PITC](https://ccms.pitc.com.pk) portal.
K-Electric is not covered by that portal.

## Core Capabilities

- **Multimodal vision bill parser** — extracts the 14-digit reference number, tariff
  category, consumption split, and the full charge breakdown (cost of electricity, FCA,
  QTA, electricity duty, sales tax, §235 advance income tax) from a PDF or image.
- **NEPRA regulatory audit engine** — reconciles itemised charges against the printed
  total, checks protected-slab entitlement against the 200-unit ceiling, verifies sales
  tax against the taxable base, and flags §235 advance tax applied outside its scope.
- **Statutory dispute notice generator** — drafts a petition addressed to the SDO and the
  NEPRA Consumer Complaints Tribunal, previewable on an A4 sheet with clipboard copy and
  print-to-PDF export.
- **Protected slab cliff simulator** — projects end-of-cycle consumption from the current
  run rate, shows a safe daily budget, and prices the reclassification penalty including
  GST.
- **Appliance peak-arbitrage calculator** — prices eight common appliances at peak
  (Rs. 46.85/kWh) versus off-peak (Rs. 33.10/kWh) and reports the monthly saving from
  shifting load out of the 5–9 PM window.
- **Feeder outage radar** — live ON/OFF status, hourly outage minutes, expected restoration
  time, and complaint history tracking.

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4, shadcn/ui, Radix |
| Language | TypeScript 5 |
| AI | `@anthropic-ai/sdk` — Claude Sonnet (`claude-sonnet-4-6`) |
| Data fetching | TanStack Query, axios |
| Database | MongoDB via Mongoose |
| Hosting | Vercel (serverless + cron) |

## Getting Started

Prerequisites: Node.js >= 20 and npm (or pnpm).

```bash
git clone https://github.com/ahmmikun/bijlitrack.git
cd bijlitrack
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

The app runs at `http://localhost:3000`.

### Verification

```bash
npx tsc --noEmit      # type check, no emit
npm run build         # production build
npx eslint src        # lint
```

`next build` runs the TypeScript check but not ESLint — lint is a separate step.

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string for references, outages and reports |
| `JWT_SECRET` | yes | Signing secret for session tokens |
| `ANTHROPIC_API_KEY` | for AI features | Claude API access for bill parsing, dispute generation and the bill roast |
| `ANTHROPIC_MODEL` | no | Overrides the vision model. Defaults to `claude-sonnet-4-6` |
| `CRON_SECRET` | for cron | Bearer token Vercel Cron must present to `/api/cron/*` |
| `JWT_SECRET`, `SMTP_*` | no | Password-reset email |

If `CRON_SECRET` is set, the cron routes require `Authorization: Bearer <secret>` in every
environment. If it is unset, `/api/cron/daily-audit` refuses to run in production rather
than falling open.

## Architecture

```
src/
  app/
    api/                 Route handlers
      audit/parse        Vision extraction + audit (4.5MB cap, magic-byte verified)
      audit/generate-dispute  Petition drafting
      audit/roast        Consumer-facing commentary
      cron/              Vercel cron targets, CRON_SECRET guarded
    dashboard/           Authenticated app shell
  lib/
    claude/              Anthropic integration
      billSchema.ts        Zod contract for the extraction result
      visionParser.ts      Structured vision call
      auditEngine.ts       NEPRA rule checks, pure and testable
      disputeGenerator.ts  Petition drafting
    tariff/              Pure tariff maths, no React
      slabCalculator.ts    Telescopic slabs and the 200-unit cliff
      applianceCalculator.ts  Run-cost and peak shifting
    ccms.ts              CCMS/PITC portal client (browser-side)
    ccms.types.ts        Upstream response and parsed shapes
    server/              Mongoose models, auth, DB connection
```

### Design Notes

- **Tariff maths is pure and isolated.** `src/lib/tariff/` has no React or I/O, so the slab
  and appliance calculations are unit-testable and cannot drift between the simulator UI
  and server-side advisory logic.
- **CCMS is called from the browser, not a serverless function.** CCMS geo-blocks
  datacenter IP ranges, so proxying through Vercel functions fails.
- **Bill uploads are verified by content, not by the client's declared MIME type.** The
  decoded payload's magic bytes must match the declared media type before anything is
  forwarded to the Anthropic API.
- **Slab rates and tax percentages are estimates.** NEPRA revises both between tariff
  cycles. They are named constants, surfaced in the UI, and must be checked against the
  current tariff schedule before being relied on.

## Accuracy and Limitations

The audit engine and dispute generator produce advisory output. Extracted figures come
from visual model inference and can be wrong on low-quality scans — the parser returns a
confidence score and per-field warnings, and surfaces them in the report.

Dispute notices instruct the model to mark uncertain statutory citations as
`[VERIFY CITATION]` rather than invent SRO numbers, since a fabricated citation in a filed
petition would harm the consumer. Verify all citations before submitting.

## License

MIT — see [LICENSE](./LICENSE).