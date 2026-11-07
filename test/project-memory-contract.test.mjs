import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "project-memory", "SKILL.md"), "utf8");

test("frontmatter name equals the directory name", () => {
  assert.match(skill, /^---\nname: project-memory\n/);
});

test("documents the four production routes with the literal base URL", () => {
  for (const heading of [
    "### GET /v1/projects/{projectId}/memory",
    "### POST /v1/projects/{projectId}/memory/saves",
    "### POST /v1/projects/{projectId}/memory/saves/{saveId}/commit",
    "### POST /v1/projects/{projectId}/memory/log",
  ]) {
    assert.ok(skill.includes(`\n${heading}\n`), `missing endpoint heading: ${heading}`);
  }
  assert.ok(skill.includes("https://data.spuree.com/api/v1/projects/{projectId}/memory"));
  assert.match(skill, /-H "X-API-Key: \$SPUREE_API_KEY"/);
});

test("keeps the consent gate: nothing is written before the person's yes", () => {
  assert.match(skill, /Nothing is written before the person's yes/);
  assert.match(skill, /Call it only after the person said yes to the preview/);
});

test("makes the person's yes cover what the save does to the MEMORY page", () => {
  assert.match(skill, /\*Page changes\* \(what this save does to MEMORY.*quote each line it removes or rewords/);
  assert.match(skill, /with only the page changes the person approved/);
  assert.match(skill, /show the person the page changes again if that would remove or reword any other line/);
  assert.match(skill, /Keep each client rule word for word unless the person said yes to changing it/);
  assert.match(skill, /also names its source/);
});

test("keeps the secrets rule and the safeToDeleteLocal rule", () => {
  assert.match(skill, /Never upload or write down `\.env` files, keys, tokens, passwords or account numbers/);
  assert.match(skill, /`true` only when every declared file verified and MEMORY was written/);
});

test("pins the write headers: canonical lowercase UUID v4 key and the replay header", () => {
  assert.match(skill, /`Idempotency-Key`.*canonical lowercase UUID v4/);
  assert.match(skill, /`Idempotency-Replayed: false` the first time and `true`/);
});

test("does not document the MCP-only inlineFiles field as a REST request field", () => {
  assert.doesNotMatch(skill, /^\| `inlineFiles`/m);
  assert.match(skill, /`inlineFiles` shortcut is not part of this REST contract/);
});
