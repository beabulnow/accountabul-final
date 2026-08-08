import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const routeFiles = [
  "src/routes/index.tsx",
  "src/routes/signup.tsx",
  "src/routes/login.tsx",
  "src/routes/live.index.tsx",
  "src/routes/live.$slug.tsx",
  "src/routes/marketplace.tsx",
  "src/routes/properties.$slug.tsx",
  "src/routes/businesses.index.tsx",
  "src/routes/businesses.$slug.tsx",
  "src/routes/saved.tsx",
  "src/routes/dashboard.index.tsx",
  "src/routes/dashboard.profile.tsx",
  "src/routes/dashboard.business.tsx",
  "src/routes/dashboard.properties.tsx",
  "src/routes/dashboard.services.tsx",
  "src/routes/dashboard.leads.tsx",
  "src/routes/dashboard.billing.tsx",
  "src/routes/admin.tsx",
];

function check(name, pass, detail) {
  return { name, pass: Boolean(pass), detail };
}

export async function runStaticQa() {
  const results = [];
  const sources = new Map();

  for (const file of routeFiles) {
    try {
      sources.set(file, await readFile(resolve(projectRoot, file), "utf8"));
      results.push(check(`route:${file}`, true, "route file exists"));
    } catch (error) {
      results.push(check(`route:${file}`, false, String(error)));
    }
  }

  for (const [file, source] of sources) {
    const requiredMetadata = ["head:", "title:", 'name: "description"', 'property: "og:title"'];
    const missing = requiredMetadata.filter((token) => !source.includes(token));
    results.push(
      check(
        `metadata:${file}`,
        missing.length === 0,
        missing.length === 0
          ? "title, description, and Open Graph title present"
          : `missing ${missing.join(", ")}`,
      ),
    );
  }

  const root = await readFile(resolve(projectRoot, "src/routes/__root.tsx"), "utf8");
  const sharedSources = await Promise.all(
    [
      "src/components/fallback-image.tsx",
      "src/components/site-header.tsx",
      "src/components/site-footer.tsx",
      "src/components/page-shell.tsx",
    ].map((file) => readFile(resolve(projectRoot, file), "utf8")),
  );
  const allApplicationSource = [root, ...sharedSources, ...sources.values()].join("\n");
  const imageTags = [...allApplicationSource.matchAll(/<img\b[\s\S]*?>/g)].map((match) => match[0]);
  const buttons = [...allApplicationSource.matchAll(/<button\b[\s\S]*?>/g)].map(
    (match) => match[0],
  );

  results.push(
    check("a11y:language", root.includes('<html lang="en">'), "document language declared"),
  );
  results.push(
    check(
      "a11y:skip-link",
      root.includes('href="#main-content"') && root.includes('id="main-content"'),
      "keyboard bypass link targets the main landmark",
    ),
  );
  results.push(
    check(
      "a11y:image-alt",
      imageTags.every((tag) => /\balt=/.test(tag)),
      `${imageTags.length} image tag(s) inspected`,
    ),
  );
  results.push(
    check(
      "a11y:button-type",
      buttons.every((tag) => /\btype=/.test(tag)),
      `${buttons.length} raw button tag(s) inspected`,
    ),
  );
  results.push(
    check(
      "a11y:iframe-title",
      !allApplicationSource.includes("<iframe") ||
        /<iframe[\s\S]*?\btitle=/.test(allApplicationSource),
      "embedded player has an accessible title",
    ),
  );

  const liveRoom = sources.get("src/routes/live.$slug.tsx") ?? "";
  for (const state of [
    "Connecting to the stream",
    "Connection lost — reconnecting",
    "The video provider is unavailable",
    "The stream has ended",
    "Retry chat",
  ]) {
    results.push(check(`live-state:${state}`, liveRoom.includes(state), `explicit ${state} UI`));
  }
  results.push(
    check(
      "chat:server-only",
      !/from\(["']chat_messages["']\)[\s\S]{0,180}\.insert\(/.test(liveRoom) &&
        liveRoom.includes("sendChatMessage"),
      "route sends through authenticated server function and contains no direct insert",
    ),
  );

  const migration = await readFile(
    resolve(projectRoot, "supabase/migrations/20260808115351_server_chat_gateway.sql"),
    "utf8",
  );
  results.push(
    check(
      "chat:database-guard",
      migration.includes("is_chat_banned") &&
        migration.includes("pg_advisory_xact_lock") &&
        migration.includes("Chat rate limit exceeded") &&
        migration.includes("revoke all on function"),
      "moderation, atomic rate limit, and RPC grants inspected",
    ),
  );

  const failures = results.filter((result) => !result.pass);
  return {
    scope: "credential-free static route, accessibility, live-state, and chat-boundary checks",
    routeCount: routeFiles.length,
    passed: results.length - failures.length,
    failed: failures.length,
    results,
  };
}

async function main() {
  const reportFlag = process.argv.indexOf("--report");
  const reportPath = resolve(
    projectRoot,
    reportFlag >= 0 && process.argv[reportFlag + 1]
      ? process.argv[reportFlag + 1]
      : "artifacts/phase6-static-qa.json",
  );
  const report = await runStaticQa();
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, ...report }, null, 2));
  if (report.failed > 0) process.exitCode = 1;
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isCli) await main();
