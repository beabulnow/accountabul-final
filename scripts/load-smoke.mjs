import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const baseUrl = new URL(process.argv[2] ?? process.env.QA_BASE_URL ?? "http://localhost:3000");
const targetPath = process.env.QA_LOAD_PATH ?? "/marketplace";
const requestCount = Number(process.env.QA_LOAD_REQUESTS ?? 100);
const concurrency = Number(process.env.QA_LOAD_CONCURRENCY ?? 10);
const reportFlag = process.argv.indexOf("--report");
const reportPath = resolve(
  reportFlag >= 0 && process.argv[reportFlag + 1]
    ? process.argv[reportFlag + 1]
    : "artifacts/phase6-load-smoke.json",
);

if (!Number.isSafeInteger(requestCount) || requestCount < 1 || requestCount > 10_000) {
  throw new Error("QA_LOAD_REQUESTS must be an integer between 1 and 10000.");
}
if (!Number.isSafeInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error("QA_LOAD_CONCURRENCY must be an integer between 1 and 100.");
}

const url = new URL(targetPath, baseUrl);
const durations = [];
let nextRequest = 0;
let failures = 0;

async function worker() {
  while (nextRequest < requestCount) {
    nextRequest += 1;
    const started = performance.now();
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      await response.arrayBuffer();
      if (!response.ok) failures += 1;
    } catch {
      failures += 1;
    } finally {
      durations.push(performance.now() - started);
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, requestCount) }, () => worker()));
durations.sort((a, b) => a - b);
const percentile = (value) =>
  durations[Math.min(durations.length - 1, Math.ceil(value * durations.length) - 1)];
const report = {
  url: url.href,
  requests: requestCount,
  concurrency,
  failures,
  p50Ms: Math.round(percentile(0.5)),
  p95Ms: Math.round(percentile(0.95)),
  maxMs: Math.round(durations.at(-1)),
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
if (failures > 0) process.exitCode = 1;
