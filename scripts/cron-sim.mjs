const WORKER_URL = 'http://localhost:8787';
const CRON_EXPR = '* * * * *';
const INTERVAL_MS = 60_000;
const INITIAL_DELAY_MS = 3_000;

async function trigger() {
  const url = `${WORKER_URL}/__scheduled?cron=${encodeURIComponent(CRON_EXPR)}`;
  try {
    const res = await fetch(url);
    const text = await res.text();
    console.log(`[cron-sim] ${new Date().toISOString()} → ${res.status} ${text.trim()}`);
  } catch (err) {
    console.warn(`[cron-sim] ${new Date().toISOString()} → failed to reach worker: ${err.message}`);
  }
}

console.log(`[cron-sim] starting — will trigger "${CRON_EXPR}" every 60s`);

setTimeout(async () => {
  await trigger();
  setInterval(trigger, INTERVAL_MS);
}, INITIAL_DELAY_MS);
