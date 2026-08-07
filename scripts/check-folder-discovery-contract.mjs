#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(SCRIPT_PATH), "..");

export const SKILL_FILES = Object.freeze({
  authentication: "authentication/SKILL.md",
  file: "file-management/SKILL.md",
  fileComment: "file-comment/SKILL.md",
  folder: "folder-management/SKILL.md",
  gettingStarted: "getting-started/SKILL.md",
  projectInvitation: "project-invitation/SKILL.md",
  project: "project-management/SKILL.md",
});

const CONTRACT_SKILLS = Object.freeze([
  "file",
  "folder",
  "gettingStarted",
  "project",
]);

function splitMarkdownRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";

  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === "\\" && trimmed[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell.trim());
  return cells;
}

function isSeparatorRow(line) {
  return splitMarkdownRow(line).every((cell) => /^:?-{3,}:?$/.test(cell));
}

export function parseMarkdownTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];

  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!lines[index].trim().startsWith("|") || !isSeparatorRow(lines[index + 1])) {
      continue;
    }

    const headers = splitMarkdownRow(lines[index]);
    const rows = [];
    index += 2;

    while (index < lines.length && lines[index].trim().startsWith("|")) {
      const cells = splitMarkdownRow(lines[index]);
      rows.push(Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""])));
      index += 1;
    }

    tables.push({ headers, rows });
    index -= 1;
  }

  return tables;
}

export function getSection(markdown, heading) {
  const lines = markdown.split(/\r?\n/);
  const marker = `### ${heading}`;
  const start = lines.findIndex((line) => line.trim() === marker);
  if (start === -1) return null;

  const relativeEnd = lines
    .slice(start + 1)
    .findIndex((line) => line.trimStart().startsWith("### "));
  const end = relativeEnd === -1 ? lines.length : start + 1 + relativeEnd;
  return lines.slice(start, end).join("\n");
}

function normalizeCell(value) {
  return value.replaceAll("`", "").replace(/\s+/g, " ").trim();
}

function codeValues(value) {
  return [...value.matchAll(/`([^`]+)`/g)].map((match) => match[1]);
}

function numericRanges(value) {
  return [...value.matchAll(/\b(\d+)\s*[\u2013-]\s*(\d+)\b/g)]
    .map((match) => `${match[1]}-${match[2]}`);
}

function sameSet(actual, expected) {
  return (
    actual.length === expected.length &&
    [...actual].sort().every((value, index) => value === [...expected].sort()[index])
  );
}

function findParameterTable(section, requiredHeaders) {
  return parseMarkdownTables(section).find((table) =>
    requiredHeaders.every((header) => table.headers.includes(header)),
  );
}

function findParameterRow(table, parameter) {
  return table?.rows.find(
    (row) => normalizeCell(row.Parameter ?? row.Field ?? "") === parameter,
  );
}

function findFieldTable(section, firstField) {
  return parseMarkdownTables(section).find(
    (table) =>
      sameSet(table.headers, ["Field", "Type", "Description"]) &&
      normalizeCell(table.rows[0]?.Field ?? "") === firstField,
  );
}

function findExactTable(section, headers) {
  return parseMarkdownTables(section).find((table) => sameSet(table.headers, headers));
}

function findStatusTable(section) {
  return parseMarkdownTables(section).find((table) =>
    table.headers.length === 2 &&
    table.headers[0] === "Code" &&
    table.headers[1] === "Description",
  );
}

function tableCodes(table) {
  return (table?.rows ?? []).map((row) => normalizeCell(row.Code ?? ""));
}

function count(text, value) {
  return text.split(value).length - 1;
}

function addError(errors, condition, message) {
  if (!condition) {
    errors.push(message);
  }
}

function validateExactParameterContract(table, expected, label, errors) {
  const actual = table.rows.map((row) => ({
    name: normalizeCell(row.Parameter ?? ""),
    type: normalizeCell(row.Type ?? ""),
    required: normalizeCell(row.Required ?? ""),
    defaultValue: normalizeCell(row.Default ?? ""),
  }));
  const expectedNames = expected.map(({ name }) => name);
  addError(
    errors,
    actual.length === expected.length &&
      actual.every((row, index) => row.name === expected[index].name),
    `${label}: parameters must be exactly ${expectedNames.join("|")} in order`,
  );

  for (const contract of expected) {
    const row = actual.find(({ name }) => name === contract.name);
    addError(errors, row !== undefined, `${label}: missing ${contract.name} parameter`);
    if (!row) continue;
    addError(errors, row.type === contract.type, `${label}: ${contract.name} type must be ${contract.type}`);
    addError(
      errors,
      row.required === contract.required,
      `${label}: ${contract.name} required flag must be ${contract.required}`,
    );
    addError(
      errors,
      row.defaultValue === contract.defaultValue,
      `${label}: ${contract.name} default must be ${contract.defaultValue}`,
    );
  }
}

function validateExactFieldContract(table, expected, label, errors) {
  addError(errors, table !== undefined, `${label}: missing field contract table`);
  if (!table) return;

  const actual = table.rows.map((row) => ({
    name: normalizeCell(row.Field ?? ""),
    type: normalizeCell(row.Type ?? ""),
  }));
  const expectedNames = expected.map(({ name }) => name);
  addError(
    errors,
    actual.length === expected.length &&
      actual.every((row, index) => row.name === expected[index].name),
    `${label}: fields must be exactly ${expectedNames.join("|")} in order`,
  );

  for (const contract of expected) {
    const row = actual.find(({ name }) => name === contract.name);
    addError(errors, row !== undefined, `${label}: missing ${contract.name} field`);
    if (!row) continue;
    addError(errors, row.type === contract.type, `${label}: ${contract.name} type must be ${contract.type}`);
  }
}

function validateExactShapeContract(table, expected, label, errors) {
  addError(errors, table !== undefined, `${label}: missing exact-shape table`);
  if (!table) return;

  const actual = table.rows.map((row) => ({
    name: normalizeCell(row.Object ?? ""),
    shape: normalizeCell(row["Exact shape"] ?? ""),
  }));
  addError(
    errors,
    actual.length === expected.length &&
      actual.every((row, index) => row.name === expected[index].name),
    `${label}: objects must be exactly ${expected.map(({ name }) => name).join("|")} in order`,
  );

  for (const contract of expected) {
    const row = actual.find(({ name }) => name === contract.name);
    addError(errors, row !== undefined, `${label}: missing ${contract.name} shape`);
    if (!row) continue;
    addError(errors, row.shape === contract.shape, `${label}: ${contract.name} shape must be ${contract.shape}`);
  }
}

const SEARCH_PARAMETERS = Object.freeze([
  { name: "q", type: "string", required: "Yes", defaultValue: "—" },
  { name: "type", type: "string", required: "No", defaultValue: "—" },
  { name: "searchIn", type: "string", required: "No", defaultValue: "all" },
  { name: "matchMode", type: "string", required: "No", defaultValue: "any" },
  { name: "format", type: "string", required: "No", defaultValue: "—" },
  { name: "entityType", type: "string", required: "No", defaultValue: "—" },
  { name: "workspaceId", type: "string", required: "No", defaultValue: "—" },
  { name: "projectId", type: "string", required: "No", defaultValue: "—" },
  { name: "createdAfter", type: "string", required: "No", defaultValue: "—" },
  { name: "createdBefore", type: "string", required: "No", defaultValue: "—" },
  { name: "limit", type: "integer", required: "No", defaultValue: "50" },
  { name: "cursor", type: "string", required: "No", defaultValue: "—" },
  { name: "sortBy", type: "string", required: "No", defaultValue: "relevance" },
  { name: "sortOrder", type: "string", required: "No", defaultValue: "desc" },
  { name: "includePreview", type: "boolean", required: "No", defaultValue: "false" },
]);

const FOLDER_FIND_PARAMETERS = Object.freeze([
  { name: "q", type: "string", required: "Yes", defaultValue: "—" },
  { name: "workspaceId", type: "string", required: "No", defaultValue: "—" },
  { name: "projectId", type: "string", required: "No", defaultValue: "—" },
  { name: "limit", type: "integer", required: "No", defaultValue: "5" },
]);

const SEARCH_ITEM_FIELDS = Object.freeze([
  { name: "sourceType", type: "string" },
  { name: "sourceId", type: "string" },
  { name: "score", type: "number" },
  { name: "matchCount", type: "integer" },
  { name: "matches", type: "array" },
  { name: "workspaceId", type: "string?" },
  { name: "projectId", type: "string?" },
  { name: "sourceCreatedAt", type: "datetime | null" },
  { name: "container", type: "object | null" },
  { name: "project", type: "object | null" },
  { name: "breadcrumb", type: "array | null" },
]);

const SEARCH_MATCH_FIELDS = Object.freeze([
  { name: "rowKind", type: "string" },
  { name: "score", type: "number" },
  { name: "snippets", type: "string[]" },
  { name: "chunkIndex", type: "integer?" },
  { name: "charOffset", type: "integer?" },
  { name: "lineStart", type: "integer?" },
]);

const SEARCH_CONTEXT_SHAPES = Object.freeze([
  {
    name: "container",
    shape: '{ id: string, name: string, kind: "folder" | "project" }',
  },
  { name: "project", shape: "{ id: string, name: string }" },
  {
    name: "breadcrumb[]",
    shape: '{ id: string, name: string, sessionType: "creative_project" | "session" }',
  },
]);

const FOLDER_RESPONSE_FIELDS = Object.freeze([
  { object: "envelope", name: "data", type: "array" },
  { object: "envelope", name: "count", type: "integer" },
  { object: "envelope", name: "status", type: "string" },
  { object: "envelope", name: "partial", type: "boolean" },
  { object: "envelope", name: "degradedBranches", type: "string[]" },
  { object: "envelope", name: "branchStatus", type: "array" },
  { object: "result", name: "folder", type: "object" },
  { object: "result", name: "project", type: "object" },
  { object: "result", name: "breadcrumb", type: "array" },
  { object: "result", name: "matchStrength", type: "string" },
  { object: "result", name: "reasonCodes", type: "string[]" },
  { object: "result", name: "evidence", type: "object" },
  { object: "folder", name: "id", type: "string" },
  { object: "folder", name: "name", type: "string" },
  { object: "project", name: "id", type: "string" },
  { object: "project", name: "name", type: "string" },
  { object: "breadcrumb[]", name: "id", type: "string" },
  { object: "breadcrumb[]", name: "name", type: "string" },
  { object: "breadcrumb[]", name: "sessionType", type: "string" },
  { object: "evidence", name: "directMatchCount", type: "integer" },
  { object: "evidence", name: "childFileCount", type: "integer" },
  { object: "evidence", name: "childFilenameCount", type: "integer" },
  { object: "evidence", name: "childContentCount", type: "integer" },
  { object: "branchStatus[]", name: "branch", type: "string" },
  { object: "branchStatus[]", name: "status", type: "string" },
]);

const FOLDER_RESPONSE_ENUMS = Object.freeze([
  { name: "status", values: ["complete", "partial"] },
  { name: "degradedBranches[]", values: ["direct_folder_name", "file_evidence"] },
  { name: "matchStrength", values: ["exact", "strong", "supporting"] },
  {
    name: "reasonCodes[]",
    values: [
      "exact_folder_name",
      "direct_folder_name",
      "path_token_match",
      "child_filename",
      "child_content",
    ],
  },
  { name: "breadcrumb[].sessionType", values: ["creative_project", "session"] },
  { name: "branchStatus[].branch", values: ["direct_folder_name", "file_evidence"] },
  { name: "branchStatus[].status", values: ["ok", "timeout", "error", "skipped"] },
]);

function validateFolderResponseFieldContract(table, errors) {
  addError(errors, table !== undefined, "folder-management: folder_find is missing its response field contract");
  if (!table) return;

  const actual = table.rows.map((row) => ({
    object: normalizeCell(row.Object ?? ""),
    name: normalizeCell(row.Field ?? ""),
    type: normalizeCell(row.Type ?? ""),
  }));
  addError(
    errors,
    actual.length === FOLDER_RESPONSE_FIELDS.length &&
      actual.every((row, index) =>
        row.object === FOLDER_RESPONSE_FIELDS[index].object &&
        row.name === FOLDER_RESPONSE_FIELDS[index].name
      ),
    "folder-management: folder_find response fields must exactly match the documented schema in order",
  );

  for (const contract of FOLDER_RESPONSE_FIELDS) {
    const row = actual.find(
      ({ object, name }) => object === contract.object && name === contract.name,
    );
    const path = `${contract.object}.${contract.name}`;
    addError(errors, row !== undefined, `folder-management: folder_find response is missing ${path}`);
    if (!row) continue;
    addError(
      errors,
      row.type === contract.type,
      `folder-management: folder_find ${path} type must be ${contract.type}`,
    );
  }
}

function validateFolderResponseEnumContract(table, errors) {
  addError(errors, table !== undefined, "folder-management: folder_find is missing its closed response enums");
  if (!table) return;

  const actualNames = table.rows.map((row) => normalizeCell(row.Field ?? ""));
  addError(
    errors,
    actualNames.length === FOLDER_RESPONSE_ENUMS.length &&
      actualNames.every((name, index) => name === FOLDER_RESPONSE_ENUMS[index].name),
    `folder-management: folder_find enum fields must be exactly ${FOLDER_RESPONSE_ENUMS.map(({ name }) => name).join("|")} in order`,
  );

  for (const contract of FOLDER_RESPONSE_ENUMS) {
    const row = table.rows.find((candidate) => normalizeCell(candidate.Field ?? "") === contract.name);
    addError(errors, row !== undefined, `folder-management: folder_find enum is missing ${contract.name}`);
    if (!row) continue;
    addError(
      errors,
      sameSet([...new Set(codeValues(row["Exact values"] ?? ""))], contract.values),
      `folder-management: folder_find ${contract.name} must be exactly ${contract.values.join("|")}`,
    );
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  return isPlainObject(value) && sameSet(Object.keys(value), expected);
}

function isNonNegativeInteger(value) {
  return Number.isInteger(value) && value >= 0;
}

function validateFolderResponseExample(section, errors) {
  const block = section.match(/```json\s*\n([\s\S]*?)\n```/);
  addError(errors, block !== null, "folder-management: folder_find is missing its JSON response example");
  if (!block) return;

  let response;
  try {
    response = JSON.parse(block[1]);
  } catch {
    errors.push("folder-management: folder_find JSON response example must parse");
    return;
  }

  const envelopeKeys = ["data", "count", "status", "partial", "degradedBranches", "branchStatus"];
  addError(errors, hasExactKeys(response, envelopeKeys), "folder-management: folder_find example envelope fields must be exact");
  addError(errors, Array.isArray(response?.data), "folder-management: folder_find example data must be an array");
  addError(errors, isNonNegativeInteger(response?.count), "folder-management: folder_find example count must be a non-negative integer");
  addError(errors, ["complete", "partial"].includes(response?.status), "folder-management: folder_find example status must be complete|partial");
  addError(errors, typeof response?.partial === "boolean", "folder-management: folder_find example partial must be boolean");
  addError(errors, Array.isArray(response?.degradedBranches), "folder-management: folder_find example degradedBranches must be an array");
  addError(
    errors,
    Array.isArray(response?.degradedBranches) &&
      response.degradedBranches.every((branch) => ["direct_folder_name", "file_evidence"].includes(branch)),
    "folder-management: folder_find example degradedBranches values must be direct_folder_name|file_evidence",
  );

  const results = Array.isArray(response?.data) ? response.data : [];
  addError(errors, results.length > 0, "folder-management: folder_find example must include one typed result");
  for (const result of results) {
    addError(
      errors,
      hasExactKeys(result, ["folder", "project", "breadcrumb", "matchStrength", "reasonCodes", "evidence"]),
      "folder-management: folder_find example result fields must be exact",
    );
    for (const field of ["folder", "project"]) {
      const value = result?.[field];
      addError(errors, hasExactKeys(value, ["id", "name"]), `folder-management: folder_find example ${field} fields must be id|name`);
      addError(errors, typeof value?.id === "string", `folder-management: folder_find example ${field}.id must be string`);
      addError(errors, typeof value?.name === "string", `folder-management: folder_find example ${field}.name must be string`);
    }
    addError(errors, Array.isArray(result?.breadcrumb), "folder-management: folder_find example breadcrumb must be an array");
    for (const entry of Array.isArray(result?.breadcrumb) ? result.breadcrumb : []) {
      addError(errors, hasExactKeys(entry, ["id", "name", "sessionType"]), "folder-management: folder_find example breadcrumb fields must be id|name|sessionType");
      addError(errors, typeof entry?.id === "string", "folder-management: folder_find example breadcrumb.id must be string");
      addError(errors, typeof entry?.name === "string", "folder-management: folder_find example breadcrumb.name must be string");
      addError(
        errors,
        ["creative_project", "session"].includes(entry?.sessionType),
        "folder-management: folder_find example breadcrumb.sessionType must be creative_project|session",
      );
    }
    addError(errors, ["exact", "strong", "supporting"].includes(result?.matchStrength), "folder-management: folder_find example matchStrength must be exact|strong|supporting");
    addError(errors, Array.isArray(result?.reasonCodes), "folder-management: folder_find example reasonCodes must be an array");
    const reasons = ["exact_folder_name", "direct_folder_name", "path_token_match", "child_filename", "child_content"];
    addError(
      errors,
      Array.isArray(result?.reasonCodes) && result.reasonCodes.every((reason) => reasons.includes(reason)),
      "folder-management: folder_find example reasonCodes contain an undocumented value",
    );
    const evidenceFields = ["directMatchCount", "childFileCount", "childFilenameCount", "childContentCount"];
    addError(errors, hasExactKeys(result?.evidence, evidenceFields), "folder-management: folder_find example evidence fields must be exact");
    for (const field of evidenceFields) {
      addError(
        errors,
        isNonNegativeInteger(result?.evidence?.[field]),
        `folder-management: folder_find example evidence.${field} must be a non-negative integer`,
      );
    }
  }

  addError(errors, Array.isArray(response?.branchStatus), "folder-management: folder_find example branchStatus must be an array");
  const branchStates = Array.isArray(response?.branchStatus) ? response.branchStatus : [];
  for (const state of branchStates) {
    addError(errors, hasExactKeys(state, ["branch", "status"]), "folder-management: folder_find example branchStatus fields must be branch|status");
    addError(
      errors,
      ["direct_folder_name", "file_evidence"].includes(state?.branch),
      "folder-management: folder_find example branch must be direct_folder_name|file_evidence",
    );
    addError(
      errors,
      ["ok", "timeout", "error", "skipped"].includes(state?.status),
      "folder-management: folder_find example branch status must be ok|timeout|error|skipped",
    );
  }
  addError(
    errors,
    sameSet(branchStates.map((state) => state?.branch), ["direct_folder_name", "file_evidence"]),
    "folder-management: folder_find example must include each branch exactly once",
  );
}

function validateSearchContract(markdown, errors) {
  const section = getSection(markdown, "GET /v1/search");
  addError(errors, section !== null, "file-management: missing GET /v1/search section");
  if (!section) return;

  const table = findParameterTable(section, ["Parameter", "Type", "Required", "Default", "Description"]);
  addError(errors, table !== undefined, "file-management: search query table must include a Required column");
  if (!table) return;
  validateExactParameterContract(table, SEARCH_PARAMETERS, "file-management: search", errors);

  const q = findParameterRow(table, "q");
  addError(errors, normalizeCell(q?.Required ?? "") === "Yes", "file-management: q must be explicitly required");
  addError(
    errors,
    sameSet(numericRanges(q?.Description ?? ""), ["1-255"]),
    "file-management: q must document the exact 1-255 character limit",
  );

  const type = findParameterRow(table, "type");
  addError(
    errors,
    sameSet(
      [...new Set(codeValues(type?.Description ?? ""))],
      ["file", "folder", "project", "asset", "workspace"],
    ),
    "file-management: type must be exactly file|folder|project|asset|workspace",
  );

  const searchIn = findParameterRow(table, "searchIn");
  addError(errors, normalizeCell(searchIn?.Default ?? "") === "all", "file-management: searchIn default must be all");
  addError(
    errors,
    sameSet([...new Set(codeValues(searchIn?.Description ?? ""))], ["name", "content", "all"]),
    "file-management: searchIn must be exactly name|content|all",
  );

  const matchMode = findParameterRow(table, "matchMode");
  addError(errors, normalizeCell(matchMode?.Default ?? "") === "any", "file-management: matchMode default must be any");
  addError(
    errors,
    sameSet([...new Set(codeValues(matchMode?.Description ?? ""))], ["any", "all", "phrase"]),
    "file-management: matchMode must be exactly any|all|phrase",
  );

  const limit = findParameterRow(table, "limit");
  addError(errors, normalizeCell(limit?.Default ?? "") === "50", "file-management: search limit default must be 50");
  addError(
    errors,
    sameSet(numericRanges(limit?.Description ?? ""), ["1-200"]),
    "file-management: search limit range must be exactly 1-200",
  );

  const sortBy = findParameterRow(table, "sortBy");
  addError(errors, normalizeCell(sortBy?.Default ?? "") === "relevance", "file-management: sortBy default must be relevance");
  addError(
    errors,
    sameSet([...new Set(codeValues(sortBy?.Description ?? ""))], ["relevance", "createdAt"]),
    "file-management: sortBy must be exactly relevance|createdAt",
  );

  const sortOrder = findParameterRow(table, "sortOrder");
  addError(errors, normalizeCell(sortOrder?.Default ?? "") === "desc", "file-management: sortOrder default must be desc");
  addError(
    errors,
    sameSet(
      [...new Set(codeValues(sortOrder?.Description ?? "").filter((value) => value !== "sortBy=createdAt"))],
      ["asc", "desc"],
    ),
    "file-management: sortOrder must be exactly asc|desc",
  );

  addError(
    errors,
    section.includes('{ "data": [...], "count": N, "cursor": "<opaque token or null>" }'),
    "file-management: search response must be grouped as {data,count,cursor}",
  );
  const fieldTable = findFieldTable(section, "sourceType");
  validateExactFieldContract(fieldTable, SEARCH_ITEM_FIELDS, "file-management: grouped search item", errors);
  for (const field of ["container", "project", "breadcrumb"]) {
    addError(
      errors,
      findParameterRow(fieldTable, field) !== undefined,
      `file-management: grouped search context is missing ${field}`,
    );
  }

  const sourceType = findParameterRow(fieldTable, "sourceType");
  addError(
    errors,
    sameSet([...new Set(codeValues(sourceType?.Description ?? ""))], ["file", "folder", "project", "asset"]),
    "file-management: grouped search sourceType must be exactly file|folder|project|asset",
  );

  const matchTable = findFieldTable(section, "rowKind");
  validateExactFieldContract(matchTable, SEARCH_MATCH_FIELDS, "file-management: grouped search match", errors);
  const rowKind = findParameterRow(matchTable, "rowKind");
  addError(
    errors,
    sameSet([...new Set(codeValues(rowKind?.Description ?? ""))], ["name", "body", "annotation"]),
    "file-management: match rowKind must be exactly name|body|annotation",
  );

  const shapeTable = findExactTable(section, ["Object", "Exact shape"]);
  validateExactShapeContract(shapeTable, SEARCH_CONTEXT_SHAPES, "file-management: canonical context", errors);

  addError(
    errors,
    normalizeCell(findParameterRow(fieldTable, "sourceCreatedAt")?.Type ?? "") === "datetime | null",
    "file-management: sourceCreatedAt must be nullable",
  );
  const container = findParameterRow(fieldTable, "container");
  addError(
    errors,
    normalizeCell(container?.Type ?? "") === "object | null",
    "file-management: container must be a nullable object",
  );
  addError(
    errors,
    sameSet(
      [...new Set(codeValues(container?.Description ?? ""))],
      ["id", "name", "kind", "folder", "project"],
    ),
    "file-management: container must document id|name|kind and folder|project kinds",
  );

  addError(
    errors,
    /File and folder results always carry a complete canonical\s+context unit/.test(section),
    "file-management: file/folder context must be complete",
  );
  addError(
    errors,
    /hits whose current lineage is missing, deleted, malformed, stale,\s+or unauthorized are omitted/.test(section),
    "file-management: unverifiable file/folder hits must be omitted",
  );
  addError(
    errors,
    /keys are required on every search\s+item but nullable as one all-or-nothing context unit/.test(section),
    "file-management: context must be documented as required-nullable and all-or-nothing",
  );
  addError(
    errors,
    /For a file, `sessionId` is its current canonical containing folder or\s+project/.test(section) &&
      /For a folder or project result, `sessionId` identifies the matched\s+session itself; determine parentage only from `container` and `breadcrumb`/.test(section),
    "file-management: sessionId semantics must distinguish files from sessions",
  );
  addError(
    errors,
    section.includes("/api/v1/search?q=hero&type=file&cursor=<token>"),
    "file-management: next-page example must replay type=file",
  );
  addError(
    errors,
    /Replay the original `q` and every corpus-shaping filter/.test(section) &&
      /malformed, tampered, or mismatched bound\s+cursor returns 422/.test(section),
    "file-management: cursor replay and mismatch semantics are missing",
  );
  addError(
    errors,
    /Newly issued HMAC-signed `v1` cursors/.test(section) &&
      /malformed, tampered, or mismatched bound\s+cursor returns 422/.test(section),
    "file-management: signed cursor integrity semantics are missing",
  );
  addError(
    errors,
    /Unsigned pre-v1 cursors are treated as unbound `any`-mode compatibility tokens/.test(section) &&
      /regardless of a re-sent `matchMode`/.test(section) &&
      /only until \*\*2026-09-07 00:00 UTC\*\*/.test(section) &&
      /At and after the sunset,\s+every unsigned cursor is rejected/.test(section),
    "file-management: bounded legacy cursor migration must be explicit",
  );
  addError(
    errors,
    sameSet(tableCodes(findStatusTable(section)), ["200", "400", "401", "403", "422", "500", "503"]),
    "file-management: search status codes must be exactly 200|400|401|403|422|500|503",
  );
  addError(
    errors,
    /search_context_unavailable/.test(section),
    "file-management: search 503 must identify search_context_unavailable",
  );
}

function validateFolderFindContract(markdown, errors) {
  const section = getSection(markdown, "GET /v1/search/folders");
  addError(errors, section !== null, "folder-management: missing GET /v1/search/folders section");
  if (!section) return;

  const table = findParameterTable(section, ["Parameter", "Type", "Required", "Default", "Description"]);
  addError(errors, table !== undefined, "folder-management: folder_find query table must include required/default columns");
  if (!table) return;
  validateExactParameterContract(table, FOLDER_FIND_PARAMETERS, "folder-management: folder_find", errors);

  const q = findParameterRow(table, "q");
  addError(errors, normalizeCell(q?.Required ?? "") === "Yes", "folder-management: folder_find q must be required");
  addError(errors, /Nonblank/.test(q?.Description ?? ""), "folder-management: folder_find q must reject blank input");
  addError(
    errors,
    sameSet(numericRanges(q?.Description ?? ""), ["1-255"]),
    "folder-management: folder_find q range must be exactly 1-255",
  );

  for (const parameter of ["workspaceId", "projectId"]) {
    const row = findParameterRow(table, parameter);
    addError(errors, row !== undefined, `folder-management: folder_find is missing ${parameter}`);
    addError(errors, normalizeCell(row?.Required ?? "") === "No", `folder-management: folder_find ${parameter} must be optional`);
  }

  const limit = findParameterRow(table, "limit");
  addError(errors, normalizeCell(limit?.Default ?? "") === "5", "folder-management: folder_find limit default must be 5");
  addError(
    errors,
    sameSet(numericRanges(limit?.Description ?? ""), ["1-10"]),
    "folder-management: folder_find limit range must be exactly 1-10",
  );

  validateFolderResponseFieldContract(findExactTable(section, ["Object", "Field", "Type"]), errors);
  validateFolderResponseEnumContract(findExactTable(section, ["Field", "Exact values"]), errors);
  validateFolderResponseExample(section, errors);

  for (const field of ["data", "count", "status", "partial", "degradedBranches", "branchStatus"]) {
    addError(errors, section.includes(`"${field}"`), `folder-management: folder_find response is missing ${field}`);
  }
  for (const field of ["folder", "project", "breadcrumb", "matchStrength", "reasonCodes", "evidence"]) {
    addError(errors, section.includes(`"${field}"`), `folder-management: folder_find result is missing ${field}`);
  }
  addError(
    errors,
    /`matchStrength` is exactly `exact`, `strong`, or `supporting`/.test(section),
    "folder-management: folder_find matchStrength must be exact|strong|supporting",
  );
  for (const reason of [
    "exact_folder_name",
    "direct_folder_name",
    "path_token_match",
    "child_filename",
    "child_content",
  ]) {
    addError(errors, section.includes(`\`${reason}\``), `folder-management: folder_find reasonCodes is missing ${reason}`);
  }
  for (const field of [
    "directMatchCount",
    "childFileCount",
    "childFilenameCount",
    "childContentCount",
  ]) {
    addError(errors, section.includes(`"${field}"`), `folder-management: folder_find evidence is missing ${field}`);
  }

  const responseStart = section.indexOf("```json");
  const responseEnd = responseStart === -1 ? -1 : section.indexOf("```", responseStart + 7);
  const responseExample = responseEnd === -1 ? "" : section.slice(responseStart, responseEnd);
  for (const forbidden of ["fileName", "fileId", "snippets", "body", "rawScore", "webUrl"]) {
    addError(
      errors,
      !responseExample.includes(`"${forbidden}"`),
      `folder-management: folder_find response must not expose ${forbidden}`,
    );
  }
  addError(errors, /Evidence is count-only/.test(section), "folder-management: folder_find evidence must be count-only");
  addError(
    errors,
    /CheehooData does not return matching child file names,\s+file IDs, snippets, bodies, raw Atlas scores, or navigation URLs/.test(section),
    "folder-management: folder_find must document its content-free boundary",
  );
  addError(errors, section.includes("https://studio.spuree.com/folders/{folderId}"), "folder-management: folder_find must construct canonical folder URLs locally");
  addError(errors, section.includes("https://studio.spuree.com/projects/{projectId}"), "folder-management: folder_find must construct canonical project URLs locally");
  addError(errors, section.includes('`status: "partial"`'), "folder-management: folder_find must document partial status");
  addError(errors, section.includes("eight-second ceiling"), "folder-management: folder_find must document the eight-second ceiling");
  addError(
    errors,
    /`branchStatus\[\]\.status` is exactly `ok`, `timeout`,\s+`error`, or `skipped`/.test(section),
    "folder-management: branch status must be exactly ok|timeout|error|skipped",
  );
  addError(
    errors,
    sameSet(tableCodes(findStatusTable(section)), ["200", "400", "401", "403", "422", "500", "503"]),
    "folder-management: folder_find status codes must be exactly 200|400|401|403|422|500|503",
  );
  addError(
    errors,
    /no safe high-signal term/.test(section),
    "folder-management: folder_find 400 must document unsafe low-signal queries",
  );
  addError(
    errors,
    /search_query_too_broad/.test(section),
    "folder-management: folder_find 400 must identify search_query_too_broad",
  );
  addError(
    errors,
    /shared request deadline expires/i.test(section),
    "folder-management: folder_find 503 must include the shared request deadline",
  );
  addError(
    errors,
    /folder_discovery_unavailable/.test(section),
    "folder-management: folder_find 503 must identify folder_discovery_unavailable",
  );
}

function validateFolderListContract(markdown, errors) {
  const section = getSection(markdown, "GET /v1/folders");
  addError(errors, section !== null, "folder-management: missing GET /v1/folders section");
  if (!section) return;

  const table = findParameterTable(section, ["Parameter", "Type", "Default", "Description"]);
  addError(errors, table !== undefined, "folder-management: missing GET /v1/folders query table");
  if (!table) return;

  const expectedDefaults = new Map([
    ["sortBy", "createdAt"],
    ["sortOrder", "desc"],
    ["limit", "50"],
    ["offset", "0"],
  ]);
  for (const [parameter, expected] of expectedDefaults) {
    const row = findParameterRow(table, parameter);
    addError(
      errors,
      normalizeCell(row?.Default ?? "") === expected,
      `folder-management: ${parameter} default must be ${expected}`,
    );
  }
  for (const parameter of ["workspaceId", "projectId"]) {
    addError(errors, findParameterRow(table, parameter) !== undefined, `folder-management: missing ${parameter} folder filter`);
  }

  addError(errors, /1-200/.test(findParameterRow(table, "limit")?.Description ?? ""), "folder-management: folder limit range must be 1-200");
  for (const field of ["folders", "total", "limit", "offset"]) {
    addError(errors, section.includes(`"${field}"`), `folder-management: folder response is missing ${field}`);
  }
}

function validateChildrenContract(markdown, heading, label, errors) {
  const section = getSection(markdown, heading);
  addError(errors, section !== null, `${label}: missing ${heading} section`);
  if (!section) return;

  addError(errors, section.includes("{ items: [...] }"), `${label}: children response must use {items}`);
  addError(errors, section.includes('{ "items": [] }'), `${label}: empty children response must be {items:[]}`);
  addError(errors, !/fall back|legacy/i.test(section), `${label}: children section must not recommend a legacy fallback`);
  addError(
    errors,
    !/\{\s*(sessions|entities|files)\s*:/.test(section),
    `${label}: children section must not document split top-level arrays`,
  );
}

function validateBoundedRecipe(folderMarkdown, errors) {
  const section = getSection(folderMarkdown, "Find a Named Folder (Bounded Search-First Recipe)");
  addError(errors, section !== null, "folder-management: missing bounded named-folder recipe");
  if (!section) return;

  const direct = "GET /v1/search?q={encodedQuery}&type=folder&searchIn=name&limit=50";
  const evidence = "GET /v1/search?q={encodedQuery}&type=file&searchIn=all&limit=50";
  const oneCall = "GET /v1/search/folders?q={encodedNaturalLanguageQuery}&limit=5";
  addError(errors, count(section, oneCall) === 1, "folder-management: recipe must prefer exactly one folder_find request");
  addError(errors, count(section, direct) === 1, "folder-management: recipe must make one direct folder-name search");
  addError(errors, count(section, evidence) === 1, "folder-management: recipe must define exactly one file-evidence fallback");
  addError(errors, section.indexOf(oneCall) < section.indexOf(direct), "folder-management: folder_find must precede compatibility searches");
  addError(errors, /Compatibility fallback only/.test(section), "folder-management: generic searches must be compatibility-only");
  addError(
    errors,
    /tool registry does not contain `folder_find`/.test(section) &&
      /returns 404 or 405/.test(section),
    "folder-management: compatibility fallback must require confirmed endpoint absence",
  );
  addError(
    errors,
    /Do not fall back after a 400, 401, 403,\s+422, 500, or 503 response, a timeout, or a network failure/.test(section),
    "folder-management: compatibility fallback must not mask API or transport failures",
  );
  addError(
    errors,
    /old enough to lack `folder_find` also lacks `matchMode`/.test(section) &&
      /may\s+not return canonical `container`, `project`, or `breadcrumb` context/.test(section),
    "folder-management: legacy generic-search limitations must be explicit",
  );
  addError(
    errors,
    !section.includes("matchMode="),
    "folder-management: compatibility searches must not require matchMode",
  );
  addError(errors, /Preserve explicit partial status/.test(section), "folder-management: recipe must preserve folder_find degradation status");
  addError(errors, section.indexOf(direct) < section.indexOf(evidence), "folder-management: direct folder search must precede file evidence");
  addError(
    errors,
    /Build a set of the direct\s+folder results' `sourceId` values/.test(section) &&
      /Count a file group only when its `sessionId` is in\s+that direct-folder ID set/.test(section) &&
      /must never introduce a new folder candidate/.test(section),
    "folder-management: legacy file evidence must only support proven direct folder IDs",
  );
  addError(
    errors,
    /If direct search\s+returned no folder candidates, stop/.test(section) &&
      /file evidence cannot establish a folder identity by itself/.test(section),
    "folder-management: file evidence must not create candidates after an empty direct search",
  );
  addError(errors, /likely leaf-folder stem/.test(section), "folder-management: recipe must separate the leaf name from hierarchy qualifiers");
  addError(
    errors,
    /search for\s+`Phase`/.test(section) &&
      /requested\s+labels `0` and `A`/.test(section) &&
      /keep `PLOCAN` \/ `Works`\s+only as user-provided qualifiers/.test(section) &&
      /Do not claim that a result is beneath\s+`PLOCAN \/ Works` unless the response itself supplies canonical context/.test(section) &&
      /do not\s+treat `Works` as the leaf/.test(section),
    "folder-management: PLOCAN fallback must preserve unverified hierarchy qualifiers",
  );
  addError(errors, /Do not\s+send\s+request verbs or the entire\s+natural-language sentence/.test(section), "folder-management: recipe must not submit the whole request as the folder query");
  addError(errors, /single fallback/.test(section), "folder-management: recipe must stop after one fallback");
  addError(errors, /do not\s+enumerate projects/i.test(section), "folder-management: recipe must prohibit project enumeration");
  addError(errors, /recursively traverse folders/i.test(section), "folder-management: recipe must prohibit recursive traversal");
  addError(errors, !/GET \/v1\/(projects|sessions)\/[^\n]*\/children/.test(section), "folder-management: recipe must not call child endpoints");
}

function validateCanonicalUrls(documents, errors) {
  for (const [label, markdown] of Object.entries(documents)) {
    addError(errors, !/https:\/\/studio\.spuree\.com\/file\//.test(markdown), `${label}: singular /file Studio URL is forbidden`);
    addError(
      errors,
      !/\/projects\/\{[^}]+\}\/folders\//.test(markdown),
      `${label}: multi-segment project/folder Studio URL is forbidden`,
    );
    addError(
      errors,
      !/(?:\.\.\.)?\/folders\/\{[^}]+\}\/\{[^}]+\}/.test(markdown),
      `${label}: nested multi-ID folder Studio URL is forbidden`,
    );
    addError(errors, !/(?:[?&]|\s)type=session(?:[&\s`"']|$)/.test(markdown), `${label}: executable type=session search is forbidden`);
  }

  addError(errors, documents.folder.includes("https://studio.spuree.com/folders/{folderId}"), "folder-management: canonical folder URL is missing");
  addError(errors, documents.file.includes("https://studio.spuree.com/files/{fileId}"), "file-management: canonical file URL is missing");
}

export function validateFolderDiscoveryContract(documents) {
  const errors = [];
  for (const key of Object.keys(SKILL_FILES)) {
    addError(errors, typeof documents[key] === "string", `missing skill document: ${key}`);
  }
  if (errors.length > 0) return errors.sort();

  for (const key of CONTRACT_SKILLS) {
    addError(errors, typeof documents[key] === "string", `missing contract skill document: ${key}`);
  }
  if (errors.length > 0) return errors.sort();

  validateSearchContract(documents.file, errors);
  validateFolderFindContract(documents.folder, errors);
  validateFolderListContract(documents.folder, errors);
  validateChildrenContract(documents.folder, "GET /v1/sessions/{sessionId}/children", "folder-management", errors);
  validateChildrenContract(documents.project, "GET /v1/projects/{projectId}/children", "project-management", errors);
  validateBoundedRecipe(documents.folder, errors);
  validateCanonicalUrls(documents, errors);

  addError(
    errors,
    documents.project.includes("type=project&searchIn=name&matchMode=all"),
    "project-management: named project discovery must be search-first",
  );
  addError(
    errors,
    /prefer the one-call\s+`folder_find` workflow/.test(documents.gettingStarted),
    "getting-started: walkthrough must prefer folder_find",
  );
  addError(
    errors,
    /fixed two-search\s+compatibility fallback/.test(documents.gettingStarted),
    "getting-started: walkthrough must bound the compatibility fallback",
  );
  addError(
    errors,
    /tool registry lacks `folder_find`/.test(documents.gettingStarted) &&
      /endpoint returns 404 or\s+405/.test(documents.gettingStarted) &&
      /Do not fall back after another response or transport failure/.test(documents.gettingStarted),
    "getting-started: compatibility fallback must be absence-only",
  );
  addError(errors, !documents.project.includes("browse recursively"), "project-management: recursive discovery instruction is forbidden");
  addError(errors, !documents.folder.includes("Repeat** to go deeper"), "folder-management: unbounded repeat instruction is forbidden");

  return errors.sort();
}

export async function loadSkillDocuments(root = DEFAULT_ROOT) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(SKILL_FILES).map(async ([key, relativePath]) => [
        key,
        await readFile(path.join(root, relativePath), "utf8"),
      ]),
    ),
  );
}

function parseRoot(argv) {
  const index = argv.indexOf("--root");
  if (index === -1) return DEFAULT_ROOT;
  if (!argv[index + 1]) throw new Error("--root requires a path");
  return path.resolve(argv[index + 1]);
}

export async function main(argv = process.argv.slice(2)) {
  const root = parseRoot(argv);
  const documents = await loadSkillDocuments(root);
  const errors = validateFolderDiscoveryContract(documents);

  if (errors.length > 0) {
    console.error("Folder-discovery contract check failed:");
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }

  console.log(`Folder-discovery contract check passed (${Object.keys(SKILL_FILES).length} skills).`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  process.exitCode = await main();
}
