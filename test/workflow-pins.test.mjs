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
    "actions/checkout@11d5960a326750d5838078e36cf38b85af677262",
    "actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020",
  ]);
  assert.match(workflow, /^\s*node-version:\s*["']?22\.23\.2["']?\s*$/m);
});
