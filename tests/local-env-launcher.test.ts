import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("local environment launcher starts npm without a command shell", () => {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "accountabul-env-launcher-"));
  const envFile = join(temporaryDirectory, "dev.env");
  writeFileSync(
    envFile,
    [
      "SUPABASE_URL=https://example.supabase.co",
      "SUPABASE_PUBLISHABLE_KEY=sb_publishable_test",
    ].join("\n"),
    "utf8",
  );

  try {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/run-with-local-env.mjs"), "--", "npm", "--version"],
      {
        cwd: resolve("."),
        encoding: "utf8",
        env: { ...process.env, ACCOUNTABUL_ENV_FILE: envFile },
        shell: false,
      },
    );

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.match(result.stdout.trim(), /^\d+\.\d+\.\d+/);
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
});
