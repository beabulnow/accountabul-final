import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SUPPORTED_TABLES = new Set(["businesses", "properties", "services"]);
const UUID_NAMESPACE = "accountabul-legacy-import-v1";
const ALLOWED_FIELDS = {
  businesses: new Set([
    "slug",
    "legal_name",
    "display_name",
    "headline",
    "description",
    "logo_path",
    "cover_path",
    "website_url",
    "public_email",
    "public_phone",
    "year_founded",
    "employee_count_range",
    "primary_industry",
    "address_city",
    "address_state",
    "address_country",
    "service_areas",
  ]),
  properties: new Set([
    "business_id",
    "slug",
    "title",
    "description",
    "property_type",
    "address_line1",
    "address_city",
    "address_state",
    "address_country",
    "postal_code",
    "latitude",
    "longitude",
    "bedrooms",
    "bathrooms",
    "area_sqft",
    "price_minor",
    "currency",
    "cover_path",
  ]),
  services: new Set([
    "business_id",
    "slug",
    "name",
    "summary",
    "description",
    "category",
    "price_minor",
    "currency",
    "price_note",
    "service_areas",
  ]),
};

export function deterministicTargetId(sourceSystem, targetTable, legacyId) {
  const bytes = createHash("sha256")
    .update(`${UUID_NAMESPACE}\0${sourceSystem}\0${targetTable}\0${legacyId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateRequiredFields(record) {
  const data = record.data ?? {};
  const missing = [];
  if (record.targetTable === "businesses") {
    for (const key of ["slug", "legal_name", "display_name"]) {
      if (!nonEmptyString(data[key])) missing.push(key);
    }
  } else if (record.targetTable === "properties") {
    for (const key of ["business_id", "slug", "title"]) {
      if (!nonEmptyString(data[key])) missing.push(key);
    }
  } else if (record.targetTable === "services") {
    for (const key of ["business_id", "slug", "name"]) {
      if (!nonEmptyString(data[key])) missing.push(key);
    }
  }
  return missing;
}

function validateRecordData(record) {
  const issues = [];
  const allowed = ALLOWED_FIELDS[record.targetTable];
  for (const key of Object.keys(record.data)) {
    if (!allowed.has(key)) issues.push(`field is not importable: ${key}`);
  }
  if ("price_minor" in record.data) {
    const amount = record.data.price_minor;
    if (!Number.isSafeInteger(amount) || amount < 0) {
      issues.push("price_minor must be a non-negative safe integer");
    }
  }
  if ("currency" in record.data && !/^[A-Z]{3}$/.test(String(record.data.currency))) {
    issues.push("currency must be a three-letter uppercase code");
  }
  return issues;
}

function safeLifecycleFields(targetTable) {
  if (targetTable === "businesses") {
    return {
      profile_status: "draft",
      verification_status: "unverified",
      public_profile_enabled: false,
      published_at: null,
    };
  }
  return { status: "draft", published_at: null };
}

export function buildImportPlan(input) {
  if (!input || typeof input !== "object") throw new Error("Import input must be a JSON object.");
  if (!nonEmptyString(input.sourceSystem)) throw new Error("sourceSystem is required.");
  if (!Array.isArray(input.records)) throw new Error("records must be an array.");

  const seen = new Set();
  const accepted = [];
  const skipped = [];
  const unresolvedIdentities = [];
  const assetIssues = [];

  input.records.forEach((record, index) => {
    const location = `records[${index}]`;
    if (!record || typeof record !== "object") {
      skipped.push({ location, reason: "record must be an object" });
      return;
    }
    if (!nonEmptyString(record.legacyId)) {
      skipped.push({ location, reason: "legacyId is required" });
      return;
    }
    if (!SUPPORTED_TABLES.has(record.targetTable)) {
      skipped.push({ location, legacyId: record.legacyId, reason: "unsupported targetTable" });
      return;
    }
    if (!record.data || typeof record.data !== "object" || Array.isArray(record.data)) {
      skipped.push({ location, legacyId: record.legacyId, reason: "data must be an object" });
      return;
    }

    const identityKey = `${input.sourceSystem}\0${record.targetTable}\0${record.legacyId}`;
    if (seen.has(identityKey)) {
      skipped.push({ location, legacyId: record.legacyId, reason: "duplicate legacy identity" });
      return;
    }
    seen.add(identityKey);

    const missing = validateRequiredFields(record);
    const dataIssues = validateRecordData(record);
    if (missing.length > 0 || dataIssues.length > 0) {
      skipped.push({
        location,
        legacyId: record.legacyId,
        reason: [
          ...(missing.length > 0 ? [`missing required fields: ${missing.join(", ")}`] : []),
          ...dataIssues,
        ].join("; "),
      });
      return;
    }

    for (const identity of record.unresolvedIdentities ?? []) {
      unresolvedIdentities.push({
        legacyId: record.legacyId,
        targetTable: record.targetTable,
        identity: String(identity),
      });
    }
    for (const asset of record.assets ?? []) {
      if (!nonEmptyString(asset?.path) || !nonEmptyString(asset?.sha256)) {
        assetIssues.push({
          legacyId: record.legacyId,
          targetTable: record.targetTable,
          path: asset?.path ?? null,
          reason: "asset requires path and sha256",
        });
      }
    }

    accepted.push({
      legacyId: record.legacyId,
      targetTable: record.targetTable,
      targetId: deterministicTargetId(input.sourceSystem, record.targetTable, record.legacyId),
      data: { ...record.data, ...safeLifecycleFields(record.targetTable) },
    });
  });

  const priceTotalMinor = accepted.reduce((total, record) => {
    const amount = record.data.price_minor;
    return total + (typeof amount === "number" ? amount : 0);
  }, 0);
  if (
    input.expectedPriceTotalMinor !== undefined &&
    (!Number.isSafeInteger(input.expectedPriceTotalMinor) || input.expectedPriceTotalMinor < 0)
  ) {
    throw new Error("expectedPriceTotalMinor must be a non-negative safe integer.");
  }
  const moneyReconciles =
    input.expectedPriceTotalMinor === undefined ||
    input.expectedPriceTotalMinor === priceTotalMinor;

  return {
    sourceSystem: input.sourceSystem.trim(),
    counts: {
      input: input.records.length,
      accepted: accepted.length,
      skipped: skipped.length,
      unresolvedIdentities: unresolvedIdentities.length,
      assetIssues: assetIssues.length,
      priceTotalMinor,
    },
    expectedPriceTotalMinor: input.expectedPriceTotalMinor ?? null,
    moneyReconciles,
    accepted,
    skipped,
    unresolvedIdentities,
    assetIssues,
  };
}

async function applyPlan(plan) {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Apply mode requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  if (
    plan.skipped.length > 0 ||
    plan.unresolvedIdentities.length > 0 ||
    plan.assetIssues.length > 0 ||
    !plan.moneyReconciles
  ) {
    throw new Error(
      "Apply refused: resolve every skipped row, identity, asset, and money mismatch in the dry-run report.",
    );
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const batchId = randomUUID();
  const startedAt = new Date().toISOString();
  const batch = await supabase.from("migration_batches").insert({
    id: batchId,
    source_system: plan.sourceSystem,
    status: "running",
    dry_run: false,
    notes: `Input ${plan.counts.input}; accepted ${plan.counts.accepted}; skipped ${plan.counts.skipped}`,
    started_at: startedAt,
  });
  if (batch.error) throw batch.error;

  let created = 0;
  let updated = 0;
  try {
    for (const record of plan.accepted) {
      const existing = await supabase
        .from("migration_record_map")
        .select("target_id")
        .eq("source_system", plan.sourceSystem)
        .eq("legacy_id", record.legacyId)
        .eq("target_table", record.targetTable)
        .maybeSingle();
      if (existing.error) throw existing.error;

      const write = await supabase
        .from(record.targetTable)
        .upsert({ ...record.data, id: record.targetId }, { onConflict: "id" });
      if (write.error) throw write.error;
      if (existing.data) updated += 1;
      else created += 1;

      const mapping = await supabase.from("migration_record_map").upsert(
        {
          batch_id: batchId,
          source_system: plan.sourceSystem,
          legacy_id: record.legacyId,
          target_table: record.targetTable,
          target_id: record.targetId,
          migrated_at: new Date().toISOString(),
        },
        { onConflict: "source_system,legacy_id,target_table" },
      );
      if (mapping.error) throw mapping.error;
    }

    const finished = await supabase
      .from("migration_batches")
      .update({ status: "complete", finished_at: new Date().toISOString() })
      .eq("id", batchId);
    if (finished.error) throw finished.error;
    const mapped = await supabase
      .from("migration_record_map")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId);
    if (mapped.error) throw mapped.error;
    if (mapped.count !== plan.accepted.length) {
      throw new Error(
        `Reconciliation failed: expected ${plan.accepted.length} mappings, found ${mapped.count ?? 0}.`,
      );
    }
    return { batchId, created, updated, reconciledMappings: mapped.count };
  } catch (error) {
    await supabase
      .from("migration_batches")
      .update({ status: "failed", finished_at: new Date().toISOString(), notes: String(error) })
      .eq("id", batchId);
    throw error;
  }
}

async function main() {
  const [, , inputPath, ...flags] = process.argv;
  if (!inputPath || flags.includes("--help")) {
    console.log("Usage: node scripts/legacy-import.mjs <input.json> [--apply] [--report <path>]");
    console.log("Default mode is a credential-free dry run. --apply requires server credentials.");
    return;
  }

  const reportFlag = flags.indexOf("--report");
  const reportPath =
    reportFlag >= 0 && flags[reportFlag + 1]
      ? resolve(flags[reportFlag + 1])
      : resolve("artifacts", `${basename(inputPath, ".json")}-reconciliation.json`);
  const input = JSON.parse(await readFile(resolve(inputPath), "utf8"));
  const plan = buildImportPlan(input);
  const report = {
    generatedAt: new Date().toISOString(),
    mode: flags.includes("--apply") ? "apply" : "dry-run",
    ...plan,
  };
  if (flags.includes("--apply")) report.apply = await applyPlan(plan);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, mode: report.mode, counts: report.counts }, null, 2));
  if (
    plan.skipped.length > 0 ||
    plan.unresolvedIdentities.length > 0 ||
    plan.assetIssues.length > 0
  ) {
    process.exitCode = flags.includes("--apply") ? 1 : 2;
  }
}

const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isCli) await main();
