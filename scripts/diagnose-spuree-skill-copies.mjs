#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir, realpath, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);

export const TARGET_SKILLS = Object.freeze([
  "file-management",
  "folder-management",
  "getting-started",
  "project-management",
]);

async function isDirectory(candidate) {
  try {
    return (await stat(candidate)).isDirectory();
  } catch {
    return false;
  }
}

async function isRegularFile(candidate) {
  try {
    return (await stat(candidate)).isFile();
  } catch {
    return false;
  }
}

function isPathContained(boundary, candidate) {
  const relative = path.relative(boundary, candidate);
  return relative === "" || (
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  );
}

async function containedRealpath(candidate, boundary) {
  try {
    const resolved = await realpath(candidate);
    return isPathContained(boundary, resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function ancestors(start) {
  const result = [];
  let current = path.resolve(start);
  while (true) {
    result.push(current);
    const parent = path.dirname(current);
    if (parent === current) return result;
    current = parent;
  }
}

async function findRepositoryRoot(cwd) {
  for (const directory of ancestors(cwd)) {
    if (await isDirectory(path.join(directory, ".git"))) return directory;
    if (await isRegularFile(path.join(directory, ".git"))) return directory;
  }
  return null;
}

async function readPluginManifest(skillPath, cacheRoot) {
  let current = path.dirname(path.dirname(skillPath));
  let boundary;
  try {
    boundary = await realpath(cacheRoot);
  } catch {
    return null;
  }
  const visited = new Set();

  while (true) {
    const currentRealpath = await containedRealpath(current, boundary);
    if (currentRealpath === null || visited.has(currentRealpath)) break;
    visited.add(currentRealpath);

    const manifestPath = path.join(current, ".codex-plugin", "plugin.json");
    const manifestRealpath = await containedRealpath(manifestPath, boundary);
    if (manifestRealpath !== null && await isRegularFile(manifestRealpath)) {
      try {
        const manifest = JSON.parse(await readFile(manifestRealpath, "utf8"));
        return {
          manifestPath,
          name: typeof manifest.name === "string" ? manifest.name : null,
          version: typeof manifest.version === "string" ? manifest.version : null,
        };
      } catch {
        return { manifestPath, name: null, version: null };
      }
    }

    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }

  return null;
}

async function findPluginSkillRoots(cacheRoot, maxDepth = 8) {
  if (!(await isDirectory(cacheRoot))) return [];

  let boundary;
  try {
    boundary = await realpath(cacheRoot);
  } catch {
    return [];
  }

  const roots = [];
  const registeredSkillRoots = new Set();
  const visited = new Set([boundary]);
  const queue = [{
    directory: path.resolve(cacheRoot),
    realDirectory: boundary,
    depth: 0,
  }];
  while (queue.length > 0) {
    const { directory, realDirectory, depth } = queue.shift();
    let entries;
    try {
      entries = await readdir(realDirectory, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      const child = path.join(directory, entry.name);
      const realChild = await containedRealpath(
        path.join(realDirectory, entry.name),
        boundary,
      );
      if (realChild === null || !(await isDirectory(realChild))) {
        continue;
      }

      if (entry.name === "skills") {
        if (!registeredSkillRoots.has(realChild)) {
          registeredSkillRoots.add(realChild);
          roots.push(child);
        }
        // A semantic skills directory is a terminal discovery root. Mark its
        // target visited even when reached through a symlink so another alias
        // cannot turn it back into a traversal branch.
        visited.add(realChild);
      } else if (!visited.has(realChild) && depth < maxDepth) {
        visited.add(realChild);
        queue.push({
          directory: child,
          realDirectory: realChild,
          depth: depth + 1,
        });
      }
    }
  }

  return roots.sort();
}

function uniqueLocations(locations) {
  const seen = new Set();
  return locations.filter(({ root }) => {
    const key = path.resolve(root);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function candidateLocations({ cwd, home, codexHome }) {
  const locations = [];
  const repositoryRoot = await findRepositoryRoot(cwd);
  if (repositoryRoot) {
    locations.push({ root: repositoryRoot, kind: "repository" });
  }

  for (const directory of ancestors(cwd)) {
    locations.push({ root: path.join(directory, ".agents", "skills"), kind: "project-agents" });
    locations.push({ root: path.join(directory, ".codex", "skills"), kind: "project-codex" });
  }

  locations.push({ root: path.join(home, ".agents", "skills"), kind: "user-agents" });
  locations.push({ root: path.join(codexHome, "skills"), kind: "user-codex" });

  const cacheRoot = path.join(codexHome, "plugins", "cache");
  for (const root of await findPluginSkillRoots(cacheRoot)) {
    locations.push({ root, kind: "plugin-cache", cacheRoot });
  }

  return uniqueLocations(locations);
}

async function inspectCopy(skill, location, order) {
  const skillPath = path.join(location.root, skill, "SKILL.md");
  let readableSkillPath = skillPath;
  if (location.kind === "plugin-cache") {
    let boundary;
    try {
      boundary = await realpath(location.cacheRoot);
    } catch {
      return null;
    }
    readableSkillPath = await containedRealpath(skillPath, boundary);
    if (readableSkillPath === null || !(await isRegularFile(readableSkillPath))) {
      return null;
    }
  } else if (!(await isRegularFile(skillPath))) {
    return null;
  }

  const bytes = await readFile(readableSkillPath);
  const plugin = location.kind === "plugin-cache"
    ? await readPluginManifest(skillPath, location.cacheRoot)
    : null;
  const namespace = plugin?.name ?? null;

  return {
    skill,
    path: skillPath,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes: bytes.length,
    location: location.kind,
    catalogOrder: order,
    namespace,
    exposedName: namespace ? `${namespace}:${skill}` : skill,
    plugin: plugin
      ? {
          name: plugin.name,
          version: plugin.version,
          manifestPath: plugin.manifestPath,
        }
      : null,
  };
}

export async function discoverSkillCopies({
  cwd = process.cwd(),
  home = os.homedir(),
  codexHome = process.env.CODEX_HOME || path.join(home, ".codex"),
} = {}) {
  const locations = await candidateLocations({ cwd, home, codexHome });
  const copies = [];

  for (const skill of TARGET_SKILLS) {
    let catalogOrder = 1;
    for (let index = 0; index < locations.length; index += 1) {
      const copy = await inspectCopy(skill, locations[index], catalogOrder);
      if (copy) {
        copies.push(copy);
        catalogOrder += 1;
      }
    }
  }

  copies.sort((left, right) =>
    left.skill.localeCompare(right.skill) ||
    left.catalogOrder - right.catalogOrder ||
    left.path.localeCompare(right.path),
  );

  const duplicates = TARGET_SKILLS.map((skill) => {
    const matches = copies.filter(
      (copy) => copy.skill === skill && copy.location !== "repository",
    );
    return {
      skill,
      installedCopies: matches.length,
      distinctHashes: new Set(matches.map((copy) => copy.sha256)).size,
      paths: matches.map((copy) => copy.path),
    };
  }).filter((entry) => entry.installedCopies > 1);

  return {
    schemaVersion: 1,
    readOnly: true,
    resolutionNote:
      "catalogOrder is deterministic found-copy scan order only; repository entries are references and plugin-cache entries are candidates, while the active client owns runtime skill precedence, so duplicate unprefixed names are ambiguous",
    roots: {
      cwd: path.resolve(cwd),
      home: path.resolve(home),
      codexHome: path.resolve(codexHome),
    },
    copies,
    duplicates,
  };
}

function readOption(argv, name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  if (!argv[index + 1]) throw new Error(`${name} requires a path`);
  return path.resolve(argv[index + 1]);
}

function printHuman(report) {
  console.log("Spuree skill copy diagnostic (read-only)");
  console.log(report.resolutionNote);

  for (const skill of TARGET_SKILLS) {
    const copies = report.copies.filter((copy) => copy.skill === skill);
    const installedOrCached = copies.filter((copy) => copy.location !== "repository");
    const distinct = new Set(copies.map((copy) => copy.sha256)).size;
    console.log(
      `\n${skill}: ${installedOrCached.length} installed/cache candidate(s), ` +
      `${copies.length - installedOrCached.length} repository reference(s), ` +
      `${distinct} distinct hash(es)`,
    );
    if (copies.length === 0) {
      console.log("  (none found)");
      continue;
    }

    for (const copy of copies) {
      const plugin = copy.plugin
        ? ` plugin=${copy.plugin.name ?? "unknown"}@${copy.plugin.version ?? "unknown"}`
        : "";
      console.log(`  [${copy.catalogOrder}] ${copy.location}${plugin}`);
      console.log(`      exposed=${copy.exposedName}`);
      console.log(`      sha256=${copy.sha256}`);
      console.log(`      path=${copy.path}`);
    }
  }
}

export async function main(argv = process.argv.slice(2)) {
  const home = readOption(argv, "--home", os.homedir());
  const report = await discoverSkillCopies({
    cwd: readOption(argv, "--cwd", process.cwd()),
    home,
    codexHome: readOption(argv, "--codex-home", process.env.CODEX_HOME || path.join(home, ".codex")),
  });

  if (argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SCRIPT_PATH) {
  process.exitCode = await main();
}
