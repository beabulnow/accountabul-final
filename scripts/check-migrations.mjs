import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationDirectory = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const files = readdirSync(migrationDirectory)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrations = files.map((file) => ({
  file,
  sql: readFileSync(join(migrationDirectory, file), "utf8"),
}));
const droppedTables = new Set(
  migrations.flatMap(({ sql }) =>
    [...sql.toLowerCase().matchAll(/drop\s+table\s+(?:if\s+exists\s+)?public\.([a-z0-9_]+)/g)].map(
      (match) => match[1],
    ),
  ),
);

const failures = [];

if (files.length === 0) failures.push("No SQL migrations were found.");

for (const { file, sql } of migrations) {
  const normalized = sql.toLowerCase();
  const tables = [
    ...normalized.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/g),
  ].map((match) => match[1]);

  if (!/^\d{14}_[a-z0-9_-]+\.sql$/i.test(file)) {
    failures.push(`${file}: migration filename must start with a 14-digit UTC timestamp.`);
  }

  if (/\bauth\.role\s*\(/i.test(sql)) {
    failures.push(`${file}: auth.role() is deprecated; use policy TO clauses.`);
  }

  for (const table of tables) {
    if (
      !new RegExp(
        `alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      ).test(sql)
    ) {
      failures.push(`${file}: public.${table} does not enable RLS in the creating migration.`);
    }
    if (
      !droppedTables.has(table) &&
      !new RegExp(
        `grant[^;]*on(?:\\s+table)?[^;]*\\bpublic\\.${table}\\b[^;]*\\bto\\b[^;]*;`,
        "i",
      ).test(sql)
    ) {
      failures.push(`${file}: public.${table} has no explicit GRANT in the creating migration.`);
    }
  }

  const definers = [
    ...normalized.matchAll(
      /create\s+(?:or\s+replace\s+)?function\s+([^\s(]+)[\s\S]*?security\s+definer[\s\S]*?\$\$;/g,
    ),
  ];
  for (const definition of definers) {
    if (!/set\s+search_path\s*=/.test(definition[0])) {
      failures.push(
        `${file}: SECURITY DEFINER function ${definition[1]} has no fixed search_path.`,
      );
    }
  }
}

if (failures.length > 0) {
  console.error(`Migration checks failed:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`Migration checks passed for ${files.length} file(s).`);
