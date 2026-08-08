import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readlink, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  discoverSkillCopies,
  TARGET_SKILLS,
} from "../scripts/diagnose-spuree-skill-copies.mjs";

async function writeSkill(root, skill, content) {
  const skillDirectory = path.join(root, skill);
  await mkdir(skillDirectory, { recursive: true });
  const skillPath = path.join(skillDirectory, "SKILL.md");
  await writeFile(skillPath, content);
  return skillPath;
}

test("covers all seven public Spuree skills", () => {
  assert.deepEqual(TARGET_SKILLS, [
    "authentication",
    "file-comment",
    "file-management",
    "folder-management",
    "getting-started",
    "project-invitation",
    "project-management",
  ]);
});

test("reports distinct direct and plugin copies without modifying them", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-copy-diagnostic-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  await mkdir(path.join(repository, ".git"), { recursive: true });

  const paths = [];
  paths.push(await writeSkill(repository, "file-management", "canonical\n"));
  paths.push(await writeSkill(path.join(home, ".agents", "skills"), "file-management", "agents copy\n"));
  paths.push(await writeSkill(path.join(codexHome, "skills"), "file-management", "codex copy\n"));

  const pluginRoot = path.join(codexHome, "plugins", "cache", "local", "internal-spuree-skills", "0.1.1");
  await mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
  const pluginManifestPath = path.join(pluginRoot, ".codex-plugin", "plugin.json");
  await writeFile(
    pluginManifestPath,
    JSON.stringify({ name: "internal-spuree-skills", version: "0.1.1" }),
  );
  paths.push(pluginManifestPath);
  paths.push(await writeSkill(path.join(pluginRoot, "skills"), "file-management", "plugin copy\n"));

  const before = await Promise.all(
    paths.map(async (skillPath) => ({
      path: skillPath,
      content: await readFile(skillPath, "utf8"),
      mtimeMs: (await stat(skillPath)).mtimeMs,
    })),
  );

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot: repository,
    home,
    codexHome,
  });
  assert.equal(report.readOnly, true);
  assert.match(report.resolutionNote, /runtime skill precedence/);

  const copies = report.copies.filter((copy) => copy.skill === "file-management");
  assert.equal(copies.length, 4);
  assert.equal(new Set(copies.map((copy) => copy.sha256)).size, 4);
  assert.deepEqual(copies.map((copy) => copy.catalogOrder), [...copies.map((copy) => copy.catalogOrder)].sort((a, b) => a - b));

  const plugin = copies.find((copy) => copy.location === "plugin-cache");
  assert.deepEqual(
    { name: plugin.plugin.name, version: plugin.plugin.version, exposedName: plugin.exposedName },
    {
      name: "internal-spuree-skills",
      version: "0.1.1",
      exposedName: "internal-spuree-skills:file-management",
    },
  );

  assert.deepEqual(report.duplicates, [
    {
      skill: "file-management",
      exposedName: "file-management",
      installedCopies: 2,
      distinctHashes: 2,
      paths: copies
        .filter((copy) =>
          copy.location !== "source-reference" && copy.namespace === null
        )
        .map((copy) => copy.path),
    },
  ]);

  for (const snapshot of before) {
    assert.equal(await readFile(snapshot.path, "utf8"), snapshot.content);
    assert.equal((await stat(snapshot.path)).mtimeMs, snapshot.mtimeMs);
  }
});

test("keeps plugin copies with missing or corrupt manifests out of bare-name collisions", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-copy-invalid-plugin-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const cacheRoot = path.join(codexHome, "plugins", "cache");
  await mkdir(path.join(repository, ".git"), { recursive: true });
  await writeSkill(repository, "folder-management", "source\n");
  await writeSkill(path.join(home, ".agents", "skills"), "folder-management", "direct\n");

  const missingRoot = path.join(cacheRoot, "local", "missing-plugin", "1.0.0");
  const missingPath = await writeSkill(
    path.join(missingRoot, "skills"),
    "folder-management",
    "missing manifest\n",
  );

  const corruptRoot = path.join(cacheRoot, "local", "corrupt-plugin", "1.0.0");
  const corruptManifestPath = path.join(corruptRoot, ".codex-plugin", "plugin.json");
  await mkdir(path.dirname(corruptManifestPath), { recursive: true });
  await writeFile(corruptManifestPath, "{not-json");
  const corruptPath = await writeSkill(
    path.join(corruptRoot, "skills"),
    "folder-management",
    "corrupt manifest\n",
  );

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot: repository,
    home,
    codexHome,
  });
  const pluginCopies = report.copies.filter(
    (copy) => copy.skill === "folder-management" && copy.location === "plugin-cache",
  );

  assert.equal(pluginCopies.length, 2);
  assert.equal(new Set(pluginCopies.map((copy) => copy.namespace)).size, 2);
  for (const copy of pluginCopies) {
    assert.match(copy.namespace, /^unknown-plugin-[0-9a-f]{12}$/);
    assert.notEqual(copy.exposedName, "folder-management");
  }
  assert.equal(pluginCopies.find((copy) => copy.path === missingPath)?.plugin, null);
  assert.deepEqual(pluginCopies.find((copy) => copy.path === corruptPath)?.plugin, {
    name: null,
    version: null,
    manifestPath: corruptManifestPath,
  });
  assert.deepEqual(report.duplicates, []);
});

test("reports a direct skill installed through a directory symlink without changing it", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-copy-symlink-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const targetRoot = path.join(temporaryRoot, "linked-skills");
  await mkdir(path.join(repository, ".git"), { recursive: true });
  const targetFile = await writeSkill(targetRoot, "folder-management", "linked contract\n");
  const directRoot = path.join(home, ".agents", "skills");
  await mkdir(directRoot, { recursive: true });
  const linkPath = path.join(directRoot, "folder-management");
  await symlink(path.dirname(targetFile), linkPath, "dir");

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot: repository,
    home,
    codexHome,
  });
  const copy = report.copies.find(
    (entry) => entry.skill === "folder-management" && entry.location === "user-agents",
  );

  assert(copy);
  assert.equal(copy.path, path.join(linkPath, "SKILL.md"));
  assert.equal(await readlink(linkPath), path.dirname(targetFile));
  assert.equal(await readFile(targetFile, "utf8"), "linked contract\n");
});

test("keeps source, project, and user roots distinct for a repository under home", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-root-classification-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const home = path.join(temporaryRoot, "home");
  const repository = path.join(home, "work", "repository");
  const sourceRoot = path.join(temporaryRoot, "spuree-source");
  const codexHome = path.join(home, ".codex");
  await mkdir(path.join(repository, ".git"), { recursive: true });

  const sourcePath = await writeSkill(sourceRoot, "folder-management", "source\n");
  const projectPath = await writeSkill(
    path.join(repository, ".agents", "skills"),
    "folder-management",
    "project\n",
  );
  const userPath = await writeSkill(
    path.join(home, ".agents", "skills"),
    "folder-management",
    "user\n",
  );

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot,
    home,
    codexHome,
  });
  const byPath = new Map(
    report.copies
      .filter((copy) => copy.skill === "folder-management")
      .map((copy) => [copy.path, copy]),
  );

  assert.equal(report.roots.target, repository);
  assert.equal(report.roots.sourceRoot, sourceRoot);
  assert.equal(byPath.get(sourcePath)?.location, "source-reference");
  assert.equal(byPath.get(projectPath)?.location, "project-agents");
  assert.equal(byPath.get(userPath)?.location, "user-agents");
});

test("discovers every documented client root", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-client-roots-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const sourceRoot = path.join(temporaryRoot, "source");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(home, ".codex");
  const hermesHome = path.join(temporaryRoot, "hermes-home");
  await mkdir(path.join(repository, ".git"), { recursive: true });
  await Promise.all(
    TARGET_SKILLS.map((skill) => writeSkill(sourceRoot, skill, `source ${skill}\n`)),
  );

  const expectedLocations = new Map();
  expectedLocations.set(
    await writeSkill(path.join(repository, ".claude", "skills"), "file-comment", "project claude\n"),
    "project-claude",
  );
  expectedLocations.set(
    await writeSkill(path.join(repository, "skills"), "authentication", "project openclaw\n"),
    "project-workspace",
  );
  expectedLocations.set(
    await writeSkill(path.join(home, ".claude", "skills"), "project-invitation", "user claude\n"),
    "user-claude",
  );
  expectedLocations.set(
    await writeSkill(path.join(home, ".openclaw", "skills"), "folder-management", "user openclaw\n"),
    "user-openclaw",
  );
  expectedLocations.set(
    await writeSkill(path.join(hermesHome, "skills"), "getting-started", "user hermes\n"),
    "user-hermes",
  );

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot,
    home,
    codexHome,
    hermesHome,
  });
  const sourceSkills = report.copies
    .filter((copy) => copy.location === "source-reference")
    .map((copy) => copy.skill);
  assert.deepEqual(sourceSkills, TARGET_SKILLS);

  for (const [skillPath, location] of expectedLocations) {
    assert.equal(
      report.copies.find((copy) => copy.path === skillPath)?.location,
      location,
    );
  }
});

test("discovers a contained symlinked skills root after its target was visited", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-skills-root-symlink-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const pluginRoot = path.join(
    codexHome,
    "plugins",
    "cache",
    "source",
    "linked-skills-plugin",
    "1.0.0",
  );
  await mkdir(path.join(repository, ".git"), { recursive: true });
  await mkdir(path.join(pluginRoot, ".codex-plugin"), { recursive: true });
  await writeFile(
    path.join(pluginRoot, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "linked-skills-plugin", version: "1.0.0" }),
  );

  // `actual-skills` sorts before `skills`, so traversal encounters and marks
  // the real target before it reaches the semantic symlink name.
  const targetRoot = path.join(pluginRoot, "actual-skills");
  const targetFile = await writeSkill(
    targetRoot,
    "file-management",
    "contained skills-root copy\n",
  );
  const linkedSkillsRoot = path.join(pluginRoot, "skills");
  await symlink(targetRoot, linkedSkillsRoot, "dir");

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot: repository,
    home,
    codexHome,
  });
  const pluginCopies = report.copies.filter(
    (copy) => copy.skill === "file-management" && copy.location === "plugin-cache",
  );

  assert.equal(pluginCopies.length, 1);
  assert.equal(
    pluginCopies[0].path,
    path.join(linkedSkillsRoot, "file-management", "SKILL.md"),
  );
  assert.deepEqual(pluginCopies[0].plugin, {
    name: "linked-skills-plugin",
    version: "1.0.0",
    manifestPath: path.join(pluginRoot, ".codex-plugin", "plugin.json"),
  });
  assert.equal(await readlink(linkedSkillsRoot), targetRoot);
  assert.equal(await readFile(targetFile, "utf8"), "contained skills-root copy\n");
});

test("follows one contained plugin-root symlink without escaping or cycling", async (context) => {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "spuree-plugin-symlink-"));
  context.after(() => rm(temporaryRoot, { force: true, recursive: true }));

  const repository = path.join(temporaryRoot, "repository");
  const home = path.join(temporaryRoot, "home");
  const codexHome = path.join(temporaryRoot, "codex");
  const cacheRoot = path.join(codexHome, "plugins", "cache");
  await mkdir(path.join(repository, ".git"), { recursive: true });

  const pluginTarget = path.join(cacheRoot, "zz-plugin-store");
  await mkdir(path.join(pluginTarget, ".codex-plugin"), { recursive: true });
  await writeFile(
    path.join(pluginTarget, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "linked-spuree-skills", version: "0.2.0" }),
  );
  await writeSkill(
    path.join(pluginTarget, "skills"),
    "file-management",
    "contained plugin copy\n",
  );

  const linkedPluginRoot = path.join(cacheRoot, "aa-linked-plugin");
  await symlink(pluginTarget, linkedPluginRoot, "dir");
  const cycle = path.join(pluginTarget, "cache-cycle");
  await symlink(cacheRoot, cycle, "dir");

  const escapedPlugin = path.join(temporaryRoot, "outside-plugin");
  await mkdir(path.join(escapedPlugin, ".codex-plugin"), { recursive: true });
  await writeFile(
    path.join(escapedPlugin, ".codex-plugin", "plugin.json"),
    JSON.stringify({ name: "outside-plugin", version: "9.9.9" }),
  );
  await writeSkill(
    path.join(escapedPlugin, "skills"),
    "file-management",
    "must not be inspected\n",
  );
  await symlink(escapedPlugin, path.join(cacheRoot, "ab-escaped-plugin"), "dir");

  const escapedSkill = await writeSkill(
    path.join(temporaryRoot, "outside-skills"),
    "folder-management",
    "must not be read through a nested skill link\n",
  );
  await symlink(
    path.dirname(escapedSkill),
    path.join(pluginTarget, "skills", "folder-management"),
    "dir",
  );

  const report = await discoverSkillCopies({
    target: repository,
    sourceRoot: repository,
    home,
    codexHome,
  });
  const pluginCopies = report.copies.filter(
    (copy) => copy.skill === "file-management" && copy.location === "plugin-cache",
  );

  assert.equal(pluginCopies.length, 1);
  assert.equal(
    pluginCopies[0].path,
    path.join(linkedPluginRoot, "skills", "file-management", "SKILL.md"),
  );
  assert.deepEqual(pluginCopies[0].plugin, {
    name: "linked-spuree-skills",
    version: "0.2.0",
    manifestPath: path.join(linkedPluginRoot, ".codex-plugin", "plugin.json"),
  });
  assert.equal(await readlink(linkedPluginRoot), pluginTarget);
  assert.equal(await readlink(cycle), cacheRoot);
  assert.equal(report.copies.some((copy) => copy.plugin?.name === "outside-plugin"), false);
  assert.equal(
    report.copies.some(
      (copy) => copy.skill === "folder-management" && copy.location === "plugin-cache",
    ),
    false,
  );
});
