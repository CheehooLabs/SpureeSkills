import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "image-generation", "SKILL.md"), "utf8");

test("frontmatter name equals the directory", () => {
  assert.match(skill, /^---\nname: image-generation\n/);
});

test("documents the quote, generate and job-reader endpoints", () => {
  for (const heading of [
    "### POST /v1/billing/estimate",
    "### POST /v1/images/text-to-image",
    "### GET /v1/images/text-to-image/{id}",
  ]) {
    assert.ok(skill.includes(`\n${heading}\n`), `missing ${heading}`);
  }
});

test("states the mandatory quote → approve → generate order and that the server does not enforce it", () => {
  assert.match(skill, /## The order is mandatory: quote → show the price → explicit yes → generate/);
  assert.match(skill, /\*\*Nothing on the server enforces step 1–3\.\*\*/);
  assert.match(skill, /an API key is not checked for the `render` scope/);
});

test("requires a stable operationId and the same-id retry rule", () => {
  assert.match(skill, /\| `operationId` \| string \(body\) \| Required by this skill \|/);
  assert.match(skill, /same\s+`operationId` and byte-identical arguments/);
  assert.match(skill, /Never start a new `operationId` to find out what/);
});

test("documents the refusal codes the way the connector tools handle them", () => {
  for (const code of [
    "INSUFFICIENT_CREDITS",
    "PLAN_LIMIT_EXCEEDED",
    "SPEND_NOT_PERMITTED",
    "PROJECT_CREDIT_LIMIT_REACHED",
    "JOB_PROCESSING_FAILED",
    "image_generation_pending",
    "image_generation_failed",
    "image_operation_conflict",
  ]) {
    assert.ok(skill.includes(`\`${code}\``), `missing ${code}`);
  }
});

test("estimate example carries the literal data.spuree.com base URL and the API key header", () => {
  assert.match(skill, /curl -X POST "https:\/\/data\.spuree\.com\/api\/v1\/billing\/estimate"/);
  assert.match(skill, /-H "X-API-Key: \$SPUREE_API_KEY"/);
});

test("the folder decides destination and permission, never the payer", () => {
  assert.doesNotMatch(skill, /with it the workspace that pays/);
  assert.doesNotMatch(skill, /which one pays/);
  assert.match(skill, /It\ndoes not choose the payer\./);
  assert.match(skill, /the payer can differ from the folder's workspace/);
});
