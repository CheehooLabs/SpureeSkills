# Contributing to SpureeSkills

Each top-level directory in this repository is one agent skill: a `SKILL.md`
that documents part of the Spuree V1 API for AI agents. Agents read these files
and act on them directly, so an inaccurate sentence becomes a failed API call.

- [Before you start](#before-you-start)
- [Editing a skill](#editing-a-skill)
- [Adding, renaming, or removing a skill](#adding-renaming-or-removing-a-skill)
- [Local checks](#local-checks)
- [Opening a pull request](#opening-a-pull-request)
- [After your pull request merges](#after-your-pull-request-merges)

## Before you start

- **Document what is deployed.** Describe behavior that production serves today.
  If the documentation depends on a backend change, the backend change ships
  first; say so in the pull request.
- **Keep this repository public-safe.** No internal hostnames, development
  environments, VPN instructions, staff names, credentials, or unreleased
  features. Internal-only guidance belongs in the distributions that consume this
  repository, not here.

## Editing a skill

**Structure.** Follow the layout the existing skills use: frontmatter, then
`## Overview`, `## Authentication`, `## Base URL`, and `## Endpoints`, with one
`### METHOD /v1/path` section per endpoint containing a parameter table, the
response shape, a `curl` example, and a status-code table.

**Frontmatter.** `name` must equal the directory name. `description` is what an
agent uses to decide whether to load the skill, so name the operations it covers
in plain words.

**Base URLs.** Write `https://data.spuree.com/api` and `https://studio.spuree.com`
exactly like that. Cheehoo's internal distribution rewrites those exact strings to
select an environment, so a Spuree URL written any other way (for example, a
different host name) silently escapes the rewrite.

**Examples.** Use placeholders such as `$SPUREE_API_KEY` and
`$SPUREE_ACCESS_TOKEN`, never a real credential.

**Contract checker.** `scripts/check-folder-discovery-contract.mjs` pins the exact
wording of the search, folder-discovery, and children-listing contracts in
`file-management`, `folder-management`, and `project-management`, and the
folder-discovery walkthrough in `getting-started`. It also checks the canonical
Studio URL formats in all seven skills, so an edit to any skill can trip it. When
it fails:

- If you changed that behavior by accident, restore the wording.
- If the API really changed, update the checker in the same pull request and add a
  test in `test/folder-discovery-contract.test.mjs` that feeds the old wording to
  the checker and expects it to fail. A checker rule without such a test can pass
  while checking nothing.

## Adding, renaming, or removing a skill

1. Create, rename, or delete the `<name>/SKILL.md` directory.
2. Update the **Available Skills** table in [README.md](./README.md).
3. Update the skill list in `scripts/diagnose-spuree-skill-copies.mjs` and its
   test.
4. When renaming or removing, also update `SKILL_FILES` in
   `scripts/check-folder-discovery-contract.mjs`.
5. In the pull request, call out the change under *Downstream impact*: every
   distribution that pins this repository lists skills by name and must add,
   rename, or remove it when it re-pins.

## Local checks

Use Node.js 22 (CI uses 22.23.2) and run, from the repository root:

```bash
node --test test/*.test.mjs
node scripts/check-folder-discovery-contract.mjs
git diff --check
```

CI runs the first two on every pull request. `test/workflow-pins.test.mjs` asserts
the exact action SHAs and Node version in `.github/workflows/`, so change that
test in the same pull request as the workflow.

## Opening a pull request

**Branch.** Branch from an up-to-date `main`, or fork the repository if you do not
have write access. Never push to `main` directly, even for a typo. Name the
branch `<your-handle>/<ticket>-<short-description>` when there is a ticket, or
`<your-handle>/<short-description>` otherwise.

**Scope.** One concern per pull request.

**Title.** Use a Conventional Commits prefix with the skill as the scope, plus the
ticket when there is one, for example
`docs(file-comment): document video timecodes, stills, and drawings (ENG-7159)`.
Use `feat` for a new skill, `fix` for a correction to wrong guidance, and `docs`
for other documentation changes.

**Description.** The pull request template asks for:

- *Summary* — the problem, and why the change is needed now.
- *What changed* — what an agent will do differently after reading the new text.
- *Dependencies and merge order* — the backend pull request or release this
  documentation relies on, and whether it is deployed.
- *Verification* — the commands you ran and their results, and how you confirmed
  the documented behavior: a request against the production API, or the backend
  code and the release that contains it.
- *Downstream impact* — whether distributions that pin this repository need to
  re-pin to pick the change up, and anything they must adapt.

**Review.** A maintainer must approve before merging. Reply to every review
comment, whether you changed something or not.

## After your pull request merges

Merging here does not update every copy of these skills. Cheehoo's internal plugin
and the Spuree Studio MCP server each vendor these files at a pinned commit of this
repository and re-pin in their own repositories. If your change should reach them,
leave a comment on the merged pull request with the commit on `main` that contains
it, so the re-pin uses a commit that stays reachable.
