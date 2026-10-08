import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

const authHeader = req.headers.get("authorization");
  const expectedSecret = process.env.CRON_SECRET?.trim();

  // Enforced whenever a secret is configured, in every environment. Gating this
  // on NODE_ENV left preview deployments callable by anyone.
  if (expectedSecret) {
    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid execution context" },
        { status: 401 }
      );
    }
  } else if (process.env.NODE_ENV === "production") {
    // Failing closed in production prevents an unset secret from disabling auth.
    console.error("[Cron] CRON_SECRET is unset; refusing to run daily-audit.");
    return NextResponse.json(
      { success: false, error: "Unauthorized: CRON_SECRET is not configured" },
      { status: 401 }
    );
  }

  try {
    const origin = req.nextUrl.origin;

    const scrapeRes = await fetch(`${origin}/api/tariffs/scrape-update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).catch((e) => {
      console.warn("[BijliTrack Cron] Warning on scraper endpoint:", e.message);
      return null;
    });

    const auditRes = await fetch(`${origin}/api/audit/batch-validate`, {
      method: "POST",
    }).catch((e) => {
      console.warn("[BijliTrack Cron] Warning on audit run:", e.message);
      return null;
    });

    return NextResponse.json({
      success: true,
      data: {
        job: "daily-audit-and-tariff-sync",
        executedAt: new Date().toISOString(),
        scrapeStatus: scrapeRes ? "TRIGGERED" : "SKIPPED_LOCAL",
        batchAuditStatus: auditRes ? "TRIGGERED" : "SKIPPED_LOCAL",
        durationMs: Date.now() - startTime,
      },
    });
} catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Error",
      },
      { status: 500 }
    );
  }
}
