import assert from "node:assert/strict";
import test from "node:test";

import { runStaticQa } from "../scripts/qa-static.mjs";

test("all route, accessibility, live-state, and chat-boundary static QA checks pass", async () => {
  const report = await runStaticQa();
  assert.equal(
    report.failed,
    0,
    report.results
      .filter((result) => !result.pass)
      .map((result) => `${result.name}: ${result.detail}`)
      .join("\n"),
  );
  assert.equal(report.routeCount, 18);
});
