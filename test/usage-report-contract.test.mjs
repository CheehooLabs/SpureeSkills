import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "usage-report", "SKILL.md"), "utf8");

test("usage-report error table documents HTTP 400", () => {
  assert.match(skill, /\|\s*400\s*\|.*Malformed id/);
});

test("workspace endpoint status table documents HTTP 400", () => {
  assert.match(skill, /\|\s*400\s*\|.*workspaceId.*ObjectId/);
});

test("organization endpoint status table documents HTTP 400", () => {
  assert.match(skill, /\|\s*400\s*\|.*organizationId.*ObjectId/);
});
