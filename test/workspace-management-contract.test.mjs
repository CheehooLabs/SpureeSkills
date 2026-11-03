import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skill = await readFile(path.join(ROOT, "workspace-management", "SKILL.md"), "utf8");

test("workspace-management documents GET /v1/me/permissions as an endpoint", () => {
  assert.match(skill, /^### GET \/v1\/me\/permissions$/m);
});

test("me/permissions example calls the literal base URL with an API key", () => {
  assert.match(skill, /curl "https:\/\/data\.spuree\.com\/api\/v1\/me\/permissions" \\\n\s+-H "X-API-Key: \$SPUREE_API_KEY"/);
});

test("me/permissions field table names the payer and role fields", () => {
  for (const field of [
    "billingWorkspaceId",
    "workspaces[].id",
    "workspaces[].role",
    "workspaces[].isPersonal",
    "organizations[].role",
  ]) {
    const cell = field.replace(/[[\].]/g, "\\$&");
    assert.match(skill, new RegExp(`^\\| \`${cell}\` \\| `, "m"), field);
  }
});

test("me/permissions explains that billingWorkspaceId is one of workspaces[].id or null", () => {
  assert.match(skill, /`billingWorkspaceId`.*one of `workspaces\[\]\.id`.*`null`/);
});

test("me/permissions status table documents HTTP 200 and 401 only", () => {
  const section = skill.split("### GET /v1/me/permissions")[1].split("\n---\n")[0];
  const codes = [...section.matchAll(/^\| (\d{3}) \| /gm)].map((m) => m[1]);
  assert.deepEqual(codes, ["200", "401"]);
});
