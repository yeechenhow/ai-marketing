// Workflow execution worker.
//
// A tiny always-on process (run under PM2) that pings the app's workflow tick
// endpoint on an interval. Keeping the engine inside the Next.js runtime means
// it shares the same Prisma client, AI config, and channel senders.
//
// Run locally:   node worker.mjs
// Run on server: pm2 start worker.mjs --name ai-marketing-worker
//
// Env:
//   TICK_URL                 default http://127.0.0.1:3000/api/workflows/tick
//   WORKFLOW_TICK_SECRET     must match the app's secret (recommended in prod)
//   WORKFLOW_TICK_INTERVAL_MS default 10000

const TICK_URL = process.env.TICK_URL || "http://127.0.0.1:3000/api/workflows/tick";
const SECRET = process.env.WORKFLOW_TICK_SECRET || "";
const INTERVAL = Number(process.env.WORKFLOW_TICK_INTERVAL_MS || 10000);

let running = false;

async function tick() {
  if (running) return; // avoid overlap on slow ticks
  running = true;
  try {
    const res = await fetch(TICK_URL, {
      method: "POST",
      headers: SECRET ? { "x-tick-secret": SECRET } : {},
    });
    if (!res.ok) {
      console.error(`[worker] tick HTTP ${res.status}`);
    } else {
      const body = await res.json().catch(() => ({}));
      if (body && body.processed > 0) {
        console.log(
          `[worker] processed=${body.processed} completed=${body.completed} failed=${body.failed}`,
        );
      }
    }
  } catch (error) {
    console.error("[worker] tick error:", error?.message || error);
  } finally {
    running = false;
  }
}

console.log(`[worker] starting — ${TICK_URL} every ${INTERVAL}ms`);
tick();
setInterval(tick, INTERVAL);
