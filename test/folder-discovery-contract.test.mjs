import assert from "node:assert/strict";
import test from "node:test";

import {
  loadSkillDocuments,
  validateFolderDiscoveryContract,
} from "../scripts/check-folder-discovery-contract.mjs";

const documents = await loadSkillDocuments();

function changed(key, transform) {
  return { ...documents, [key]: transform(documents[key]) };
}

test("the distributed skills satisfy the canonical folder-discovery contract", () => {
  assert.deepEqual(validateFolderDiscoveryContract(documents), []);
});

test("rejects an optional search query", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) => markdown.replace("| `q` | string | Yes |", "| `q` | string | No |")),
  );
  assert(result.includes("file-management: q must be explicitly required"));
});

test("rejects a non-canonical search type", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace("`file` \\| `folder` \\| `project` \\| `asset`", "`file` \\| `folder` \\| `project` \\| `animation` \\| `asset`"),
    ),
  );
  assert(result.includes("file-management: type must be exactly file|folder|project|asset|workspace"));
});

test("rejects a renamed generic search endpoint", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) => markdown.replace("### GET /v1/search\n", "### GET /v1/search-v2\n")),
  );
  assert(result.includes("file-management: missing GET /v1/search section"));
});

test("rejects generic parameter type, required, and row-set drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace("| `matchMode` | string | No | `any` |", "| `matchMode` | string | Yes | `any` |")
        .replace("| `limit` | integer | No | 50 |", "| `limit` | number | No | 50 |")
        .replace(
          "| `format` | string | No | — |",
          "| `legacyMode` | string | No | — | Legacy. |\n| `format` | string | No | — |",
        ),
    ),
  );
  assert(result.includes("file-management: search: parameters must be exactly q|type|searchIn|matchMode|format|entityType|workspaceId|projectId|createdAfter|createdBefore|limit|cursor|sortBy|sortOrder|includePreview in order"));
  assert(result.includes("file-management: search: matchMode required flag must be No"));
  assert(result.includes("file-management: search: limit type must be integer"));
});

test("rejects expanded generic enums and bounds", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace("(1–255 chars)", "(1–255 or 1–999 chars)")
        .replace("`asc` \\| `desc`. Ignored", "`asc` \\| `desc` \\| `sideways`. Ignored"),
    ),
  );
  assert(result.includes("file-management: q must document the exact 1-255 character limit"));
  assert(result.includes("file-management: sortOrder must be exactly asc|desc"));
});

test("rejects a missing phrase match mode", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replaceAll("`phrase`", "`all`"),
    ),
  );
  assert(result.includes("file-management: matchMode must be exactly any|all|phrase"));
});

test("rejects an optional or unbounded folder_find query", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("| `q` | string | Yes | — | Nonblank", "| `q` | string | No | — | Optional")
        .replace("(1–255 characters)", "(any length)"),
    ),
  );
  assert(result.includes("folder-management: folder_find q must be required"));
  assert(result.includes("folder-management: folder_find q must reject blank input"));
  assert(result.includes("folder-management: folder_find q range must be exactly 1-255"));
});

test("rejects folder_find limit and response drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("| `limit` | integer | No | 5 | Maximum canonical candidates (1–10). |", "| `limit` | integer | No | 50 | Maximum candidates. |")
        .replace('"degradedBranches": [],', '"legacyErrors": [],'),
    ),
  );
  assert(result.includes("folder-management: folder_find limit default must be 5"));
  assert(result.includes("folder-management: folder_find limit range must be exactly 1-10"));
  assert(result.includes("folder-management: folder_find response is missing degradedBranches"));
});

test("rejects renamed or structurally changed folder_find parameters", () => {
  const renamed = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace("### GET /v1/search/folders\n", "### GET /v1/search/folders-v2\n"),
    ),
  );
  assert(renamed.includes("folder-management: missing GET /v1/search/folders section"));

  const changedParameters = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("| `limit` | integer | No | 5 |", "| `limit` | number | Yes | 5 |")
        .replace(
          "| `projectId` | string | No | — |",
          "| `legacyProject` | string | No | — | Legacy. |\n| `projectId` | string | No | — |",
        ),
    ),
  );
  assert(changedParameters.includes("folder-management: folder_find: parameters must be exactly q|workspaceId|projectId|limit in order"));
  assert(changedParameters.includes("folder-management: folder_find: limit type must be integer"));
  assert(changedParameters.includes("folder-management: folder_find: limit required flag must be No"));
});

test("rejects content evidence leaked from folder_find", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace('"evidence": {', '"fileName": "secret.txt",\n      "evidence": {'),
    ),
  );
  assert(result.includes("folder-management: folder_find response must not expose fileName"));
});

test("rejects a missing preferred one-call workflow", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace(
        "GET /v1/search/folders?q={encodedNaturalLanguageQuery}&limit=5",
        "GET /v1/folders?limit=5",
      ),
    ),
  );
  assert(result.includes("folder-management: recipe must prefer exactly one folder_find request"));
});

test("rejects missing required-nullable generic search context", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace("| `breadcrumb` | array \\| null |", "| `legacyPath` | array \\| null |"),
    ),
  );
  assert(result.includes("file-management: grouped search context is missing breadcrumb"));
});

test("rejects generic search item type and additive field drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace(
          "| `score` | number | Top relevance score across this object's matches |",
          "| `score` | string | Top relevance score across this object's matches |",
        )
        .replace(
          "| `matchCount` | integer | Number of matching rows |",
          "| `legacyScore` | number | Deprecated score. |\n| `matchCount` | integer | Number of matching rows |",
        ),
    ),
  );
  assert(result.includes("file-management: grouped search item: score type must be number"));
  assert(result.includes("file-management: grouped search item: fields must be exactly sourceType|sourceId|score|matchCount|matches|workspaceId|projectId|sourceCreatedAt|container|project|breadcrumb in order"));
});

test("rejects expanded generic result and match enums", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace(
          "`file` \\| `folder` \\| `project` \\| `asset` |\n| `sourceId`",
          "`file` \\| `folder` \\| `project` \\| `asset` \\| `workspace` |\n| `sourceId`",
        )
        .replace(
          "`name` \\| `body` \\| `annotation` |",
          "`name` \\| `body` \\| `annotation` \\| `metadata` |",
        ),
    ),
  );
  assert(result.includes("file-management: grouped search sourceType must be exactly file|folder|project|asset"));
  assert(result.includes("file-management: match rowKind must be exactly name|body|annotation"));
});

test("rejects generic match field type drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace(
        "| `snippets` | string[] | Pre-rendered HTML strings",
        "| `snippets` | string | Pre-rendered HTML strings",
      ),
    ),
  );
  assert(result.includes("file-management: grouped search match: snippets type must be string[]"));
});

test("rejects project and breadcrumb context shape drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace(
          "| `project` | `{ id: string, name: string }` |",
          "| `project` | `{ id: string, title: string }` |",
        )
        .replace(
          "sessionType: \"creative_project\" \\| \"session\"",
          "sessionType: \"creative_project\" \\| \"session\" \\| \"animation\"",
        ),
    ),
  );
  assert(result.includes("file-management: canonical context: project shape must be { id: string, name: string }"));
  assert(result.includes('file-management: canonical context: breadcrumb[] shape must be { id: string, name: string, sessionType: "creative_project" | "session" }'));
});

test("rejects an undocumented canonical container discriminator", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace(
        "Canonical object with `id`, `name`, and `kind`; `kind` is `folder` or `project`.",
        "Opaque parent object.",
      ),
    ),
  );
  assert(result.includes("file-management: container must document id|name|kind and folder|project kinds"));
});

test("rejects nullable or partial context for file and folder hits", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace(
          "File and folder results always carry a complete canonical\ncontext unit",
          "File and folder results may carry a canonical context unit",
        )
        .replace(
          "hits whose current lineage is missing, deleted, malformed, stale,\nor unauthorized are omitted",
          "hits whose lineage cannot be resolved return null context",
        ),
    ),
  );
  assert(result.includes("file-management: file/folder context must be complete"));
  assert(result.includes("file-management: unverifiable file/folder hits must be omitted"));
});

test("rejects a non-nullable sourceCreatedAt field", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace("| `sourceCreatedAt` | datetime \\| null |", "| `sourceCreatedAt` | datetime |"),
    ),
  );
  assert(result.includes("file-management: sourceCreatedAt must be nullable"));
});

test("rejects ambiguous sessionId parent semantics", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace(
        "For a folder or project result, `sessionId` identifies the matched\nsession itself; determine parentage only from `container` and `breadcrumb`.",
        "For every result, `sessionId` is the parent session.",
      ),
    ),
  );
  assert(result.includes("file-management: sessionId semantics must distinguish files from sessions"));
});

test("rejects a next-page example that changes the search corpus", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace("q=hero&type=file&cursor=<token>", "q=hero&cursor=<token>"),
    ),
  );
  assert(result.includes("file-management: next-page example must replay type=file"));
});

test("rejects missing cursor replay and mismatch guidance", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace("Replay the original `q` and every corpus-shaping filter", "Pass the cursor")
        .replace("A malformed, tampered, or mismatched bound\ncursor returns 422.", "Retry on cursor errors."),
    ),
  );
  assert(result.includes("file-management: cursor replay and mismatch semantics are missing"));
});

test("rejects missing signed cursor integrity semantics", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace("Newly issued HMAC-signed `v1` cursors", "Newly issued cursors")
        .replace("malformed, tampered, or mismatched bound", "malformed or mismatched bound"),
    ),
  );
  assert(result.includes("file-management: signed cursor integrity semantics are missing"));
});

test("rejects an unbounded legacy-cursor migration", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown
        .replace("Unsigned pre-v1 cursors are treated as unbound `any`-mode compatibility tokens", "Legacy cursors work as compatibility tokens")
        .replace("regardless of a re-sent `matchMode`", "and inherit every re-sent match mode")
        .replace("only until **2026-09-07 00:00 UTC**", "during migration")
        .replace("At and after the sunset,\nevery unsigned cursor is rejected", "Unsigned cursors may remain accepted"),
    ),
  );
  assert(result.includes("file-management: bounded legacy cursor migration must be explicit"));
});

test("rejects incomplete generic search status documentation", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) =>
      markdown.replace("| 500 | Non-transient search or canonical-storage failure. |\n", ""),
    ),
  );
  assert(result.includes("file-management: search status codes must be exactly 200|400|401|403|422|500|503"));
});

test("rejects a generic 503 without its stable message code", () => {
  const result = validateFolderDiscoveryContract(
    changed("file", (markdown) => markdown.replace("`search_context_unavailable`", "temporary failure")),
  );
  assert(result.includes("file-management: search 503 must identify search_context_unavailable"));
});

test("rejects incomplete folder status and branch-state documentation", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("| 500 | Non-transient search or canonical-storage failure |\n", "")
        .replace("`ok`, `timeout`,\n`error`, or `skipped`", "`ok` or `error`"),
    ),
  );
  assert(result.includes("folder-management: folder_find status codes must be exactly 200|400|401|403|422|500|503"));
  assert(result.includes("folder-management: branch status must be exactly ok|timeout|error|skipped"));
});

test("rejects folder_find response status, branch, and evidence-value type drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace('"status": "complete",', '"status": "finished",')
        .replace('"directMatchCount": 1,', '"directMatchCount": "1",')
        .replace(
          '{ "branch": "file_evidence", "status": "ok" }',
          '{ "branch": "file_matches", "status": "ok" }',
        ),
    ),
  );
  assert(result.includes("folder-management: folder_find example status must be complete|partial"));
  assert(result.includes("folder-management: folder_find example evidence.directMatchCount must be a non-negative integer"));
  assert(result.includes("folder-management: folder_find example branch must be direct_folder_name|file_evidence"));
});

test("rejects folder_find response schema field and type drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace(
          "| `evidence` | `directMatchCount` | integer |",
          "| `evidence` | `directMatchCount` | string |",
        )
        .replace(
          "| `result` | `evidence` | object |",
          "| `result` | `legacyEvidence` | object |\n| `result` | `evidence` | object |",
        ),
    ),
  );
  assert(result.includes("folder-management: folder_find evidence.directMatchCount type must be integer"));
  assert(result.includes("folder-management: folder_find response fields must exactly match the documented schema in order"));
});

test("rejects additive folder_find enum drift", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace(
          "| `status` | `complete` \\| `partial` |",
          "| `status` | `complete` \\| `partial` \\| `failed` |",
        )
        .replace(
          "| `matchStrength` | `exact` \\| `strong` \\| `supporting` |",
          "| `matchStrength` | `exact` \\| `strong` \\| `supporting` \\| `uncertain` |",
        ),
    ),
  );
  assert(result.includes("folder-management: folder_find status must be exactly complete|partial"));
  assert(result.includes("folder-management: folder_find matchStrength must be exactly exact|strong|supporting"));
});

test("rejects incomplete folder 400 and 503 causes", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("query has no safe high-signal term or exceeds", "query exceeds")
        .replace("shared request deadline expires", "both search branches fail"),
    ),
  );
  assert(result.includes("folder-management: folder_find 400 must document unsafe low-signal queries"));
  assert(result.includes("folder-management: folder_find 503 must include the shared request deadline"));
});

test("rejects missing stable folder_find error message codes", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("`search_query_too_broad`", "broad query")
        .replace("`folder_discovery_unavailable`", "temporary failure"),
    ),
  );
  assert(result.includes("folder-management: folder_find 400 must identify search_query_too_broad"));
  assert(result.includes("folder-management: folder_find 503 must identify folder_discovery_unavailable"));
});

test("rejects fallback after runtime failures or through a post-1020-only match mode", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace(
          "only when the client tool registry does not contain `folder_find`, or an HTTP\n   request to `GET /v1/search/folders` returns 404, 405, or 501",
          "whenever folder discovery fails",
        )
        .replace(
          "Do not fall back after a 400, 401, 403,\n   422, 500, or 503 response, a timeout, or a network failure",
          "Fall back after any error",
        )
        .replace(
          "type=folder&searchIn=name&limit=50",
          "type=folder&searchIn=name&matchMode=all&limit=50",
        ),
    ),
  );
  assert(result.includes("folder-management: compatibility fallback must require confirmed endpoint absence"));
  assert(result.includes("folder-management: compatibility fallback must not mask API or transport failures"));
  assert(result.includes("folder-management: compatibility searches must not require matchMode"));
});

test("rejects onboarding guidance that falls back without confirmed absence", () => {
  const result = validateFolderDiscoveryContract(
    changed("gettingStarted", (markdown) =>
      markdown
        .replace(
          "Only when the tool registry lacks `folder_find`, or the endpoint returns 404,\n405, or 501",
          "Whenever folder discovery fails",
        )
        .replace(
          "Do not fall back after another response or transport failure.",
          "Fall back after any error.",
        ),
    ),
  );
  assert(result.includes("getting-started: compatibility fallback must be absence-only"));
});

test("rejects legacy file evidence that can introduce an unproven folder", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace(
          "Count a file group only when its `sessionId` is in\n   that direct-folder ID set.",
          "Promote every file group as a folder candidate.",
        )
        .replace(
          "If direct search\n   returned no folder candidates, stop",
          "If direct search returned no folder candidates, use file evidence",
        ),
    ),
  );
  assert(result.includes("folder-management: legacy file evidence must only support proven direct folder IDs"));
  assert(result.includes("folder-management: file evidence must not create candidates after an empty direct search"));
});

test("rejects the wrong PLOCAN compatibility-fallback leaf", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown
        .replace("search for\n   `Phase`", "search for\n   `Works`")
        .replace("do not treat `Works` as the leaf", "treat `Works` as the leaf"),
    ),
  );
  assert(result.includes("folder-management: PLOCAN fallback must preserve unverified hierarchy qualifiers"));
});

test("rejects split children arrays and legacy fallback guidance", () => {
  const result = validateFolderDiscoveryContract(
    changed("project", (markdown) =>
      markdown.replace(
        "Do not parse this\n> endpoint as separate collections",
        "Fall back to the legacy { sessions: [], entities: [], files: [] } response",
      ),
    ),
  );
  assert(result.includes("project-management: children section must not recommend a legacy fallback"));
  assert(result.includes("project-management: children section must not document split top-level arrays"));
});

test("rejects legacy Studio URLs", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace(
        "https://studio.spuree.com/folders/{folderId}",
        "https://studio.spuree.com/projects/{projectId}/folders/{folderId}",
      ),
    ),
  );
  assert(result.includes("folder: multi-segment project/folder Studio URL is forbidden"));
});

test("rejects a singular file URL in any distributed skill", () => {
  const result = validateFolderDiscoveryContract(
    changed("fileComment", (markdown) =>
      markdown.replace(
        "https://studio.spuree.com/files/{fileId}",
        "https://studio.spuree.com/file/{fileId}",
      ),
    ),
  );
  assert(result.includes("fileComment: singular /file Studio URL is forbidden"));
});

test("rejects traversal in the bounded recipe", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace(
        "Stop after the direct",
        "GET /v1/projects/{projectId}/children\n\nStop after the direct",
      ),
    ),
  );
  assert(result.includes("folder-management: recipe must not call child endpoints"));
});

test("rejects guidance that sends the whole request as the folder query", () => {
  const result = validateFolderDiscoveryContract(
    changed("folder", (markdown) =>
      markdown.replace(
        "separate the likely leaf-folder stem and requested\n   leaf labels from hierarchy qualifiers.",
        "Use the complete user request as the search query.",
      ),
    ),
  );
  assert(result.includes("folder-management: recipe must separate the leaf name from hierarchy qualifiers"));
});
