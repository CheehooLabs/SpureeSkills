import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/pr-tests.yml", import.meta.url),
  "utf8",
);

function actionRefs(source) {
  return [...source.matchAll(/^\s*(?:-\s+)?uses:\s+(\S+)/gm)].map((match) => match[1]);
}

test("PR checks pin every action and the exact Node runtime", () => {
  assert.deepEqual(actionRefs(workflow), [
    "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
    "actions/setup-node@820762786026740c76f36085b0efc47a31fe5020",
  ]);
  assert.match(workflow, /^\s*node-version:\s*["']?22\.23\.2["']?\s*$/m);
});
