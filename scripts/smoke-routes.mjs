import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const routes = [
  "/",
  "/signup",
  "/login",
  "/live",
  "/live/qa-missing-event",
  "/marketplace",
  "/properties/qa-missing-property",
  "/businesses",
  "/businesses/qa-missing-business",
  "/saved",
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/business",
  "/dashboard/properties",
  "/dashboard/services",
  "/dashboard/leads",
  "/dashboard/billing",
  "/admin",
];

const baseUrl = new URL(process.argv[2] ?? process.env.QA_BASE_URL ?? "http://localhost:3000");
const reportFlag = process.argv.indexOf("--report");
const reportPath = resolve(
  reportFlag >= 0 && process.argv[reportFlag + 1]
    ? process.argv[reportFlag + 1]
    : "artifacts/phase6-http-smoke.json",
);

const results = [];
for (const route of routes) {
  const url = new URL(route, baseUrl);
  const started = performance.now();
  try {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
    });
    const body = await response.text();
    const contentType = response.headers.get("content-type") ?? "";
    const pass =
      response.status >= 200 &&
      response.status < 400 &&
      contentType.includes("text/html") &&
      /<html[\s>]/i.test(body) &&
      !body.includes("This page didn't load") &&
      !body.includes("Application unavailable");
    results.push({
      route,
      pass,
      status: response.status,
      durationMs: Math.round(performance.now() - started),
      detail: pass
        ? "HTML route shell rendered"
        : "unexpected status, content type, or error shell",
    });
  } catch (error) {
    results.push({
      route,
      pass: false,
      status: null,
      durationMs: Math.round(performance.now() - started),
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

const report = {
  baseUrl: baseUrl.origin,
  routeCount: routes.length,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).length,
  results,
};
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, ...report }, null, 2));
if (report.failed > 0) process.exitCode = 1;
