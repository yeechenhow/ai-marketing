import { NextRequest, NextResponse } from "next/server";
import { runWorkflowTick } from "@/lib/workflows/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Drives the workflow execution engine. Called on an interval by the PM2
 * worker (worker.mjs). Protected by WORKFLOW_TICK_SECRET when set.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.WORKFLOW_TICK_SECRET?.trim();
  if (secret) {
    const provided = request.headers.get("x-tick-secret");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runWorkflowTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[workflow tick]", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Tick failed" },
      { status: 500 },
    );
  }
}
