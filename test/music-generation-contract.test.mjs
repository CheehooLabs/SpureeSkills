import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "music-generation", "SKILL.md"), "utf8");

test("frontmatter name equals the directory", () => {
  assert.match(skill, /^---\nname: music-generation\n/);
});

test("documents the quote and generate endpoints", () => {
  for (const heading of ["### POST /v1/billing/estimate", "### POST /v1/music/text-to-music"]) {
    assert.ok(skill.includes(`\n${heading}\n`), `missing ${heading}`);
  }
});

test("quotes each model under its own requestType", () => {
  assert.match(skill, /`"text_to_music"` for the default model/);
  assert.match(skill, /`"elevenlabs_music_compose"` for `music_v2_5`/);
});

test("states the mandatory quote → approve → generate order and that the server does not enforce it", () => {
  assert.match(skill, /## The order is mandatory: quote → show the price → explicit yes → generate/);
  assert.match(skill, /\*\*Nothing on the server enforces step 1–3\.\*\*/);
  assert.match(skill, /an API key is not checked for the `render` scope/);
});

test("says there is no retry key and sends the agent to the folder before a second call", () => {
  assert.match(skill, /\*\*There is no retry key\.\*\*/);
  assert.match(skill, /a second call is a second paid clip/);
  assert.match(skill, /GET \/v1\/sessions\/\{sessionId\}\/files/);
});

test("documents the refusal codes the way the connector tools handle them", () => {
  for (const code of [
    "INSUFFICIENT_CREDITS",
    "PLAN_LIMIT_EXCEEDED",
    "SPEND_NOT_PERMITTED",
    "PROJECT_CREDIT_LIMIT_REACHED",
    "VALIDATION_ERROR",
    "JOB_PROCESSING_FAILED",
  ]) {
    assert.ok(skill.includes(`\`${code}\``), `missing ${code}`);
  }
  assert.match(skill, /Model 'music_v2_5' is not available\./);
});

test("examples carry the literal data.spuree.com base URL and the API key header", () => {
  assert.match(skill, /curl -X POST "https:\/\/data\.spuree\.com\/api\/v1\/billing\/estimate"/);
  assert.match(skill, /curl -X POST "https:\/\/data\.spuree\.com\/api\/v1\/music\/text-to-music"/);
  assert.match(skill, /-H "X-API-Key: \$SPUREE_API_KEY"/);
});
