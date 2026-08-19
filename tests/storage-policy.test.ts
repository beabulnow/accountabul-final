import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL("../supabase/migrations/20260808120229_property_media_storage.sql", import.meta.url),
  "utf8",
).toLowerCase();

test("property media bucket remains private and image-bounded", () => {
  assert.match(sql, /'property-media',[\s\S]*?false,[\s\S]*?10485760/);
  assert.match(sql, /image\/jpeg/);
  assert.match(sql, /image\/png/);
});

test("property media has explicit read, upload, update, and delete policies", () => {
  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(sql, new RegExp(`on storage\\.objects[\\s\\S]*?for ${operation}`));
  }
  assert.match(sql, /can_manage_property_media_object/);
  assert.match(sql, /can_read_public_property_media_object/);
  assert.match(sql, /profile_status = 'published'/);
  assert.match(sql, /p\.status = 'published'/);
});
