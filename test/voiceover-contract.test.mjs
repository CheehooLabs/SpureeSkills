import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "voiceover", "SKILL.md"), "utf8");

test("frontmatter name equals the directory", () => {
  assert.match(skill, /^---\nname: voiceover\n/);
});

test("documents the two voice lists, the quote and the generate endpoint", () => {
  for (const heading of [
    "### GET /v1/me/voices",
    "### GET /v1/workspaces/{workspaceId}/voices",
    "### POST /v1/billing/estimate",
    "### POST /v1/audio/text-to-speech",
  ]) {
    assert.ok(skill.includes(`\n${heading}\n`), `missing ${heading}`);
  }
});

test("only listed voice ids may be used and raw provider ids are rejected", () => {
  assert.match(skill, /\*\*Raw provider voice ids are rejected\.\*\*/);
  assert.match(skill, /answers 404\s+`voice_not_found` for any `voiceId` that is not a Spuree voice id/);
  assert.match(skill, /\*\*List again before each voiceover\.\*\*/);
});

test("states the mandatory list → quote → approve → generate order and that the server does not enforce it", () => {
  assert.match(skill, /## The order is mandatory: list → quote → show the price → explicit yes → generate/);
  assert.match(skill, /\*\*Nothing on the server enforces step 2–4\.\*\*/);
  assert.match(skill, /an API key is not checked for the `render` scope/);
});

test("quotes and submits the same trimmed text", () => {
  assert.match(skill, /\*\*Count what the debit counts\.\*\*/);
  assert.match(skill, /identical\s+`text`, `voiceId` and `folderId`/);
});

test("says there is no retry key and sends the agent to the folder before a second call", () => {
  assert.match(skill, /\*\*There is no retry key\.\*\*/);
  assert.match(skill, /a second call is a second paid\s+voiceover/);
  assert.match(skill, /GET \/v1\/sessions\/\{sessionId\}\/files/);
});

test("documents the refusal codes the way the connector tools handle them, including whose credits ran out", () => {
  for (const code of [
    "INSUFFICIENT_CREDITS",
    "PLAN_LIMIT_EXCEEDED",
    "SPEND_NOT_PERMITTED",
    "PROJECT_CREDIT_LIMIT_REACHED",
    "VOICE_NOT_SHARED",
    "SHARE_LIMIT_REACHED",
    "voice_not_found",
    "editor_not_found",
    "editor_has_no_voice",
    "VALIDATION_ERROR",
    "JOB_PROCESSING_FAILED",
  ]) {
    assert.ok(skill.includes(`\`${code}\``), `missing ${code}`);
  }
  assert.match(skill, /`details\.payer: "voice_owner"`/);
  assert.match(skill, /`voice_owner_not_billed`/);
});

test("examples carry the literal data.spuree.com base URL and the API key header", () => {
  assert.match(skill, /curl "https:\/\/data\.spuree\.com\/api\/v1\/me\/voices"/);
  assert.match(skill, /curl -X POST "https:\/\/data\.spuree\.com\/api\/v1\/audio\/text-to-speech"/);
  assert.match(skill, /-H "X-API-Key: \$SPUREE_API_KEY"/);
});
