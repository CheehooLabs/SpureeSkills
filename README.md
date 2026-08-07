# Spuree API Skills

Spuree provides an agent-friendly cloud storage via a simple Project → Folder → File hierarchy. Agents authenticate with an API key, then create projects, organize folders, and upload/download files — all through REST APIs designed for programmatic access.

These skills are structured API documentation for AI agent consumption. Each skill documents a specific API domain with endpoints, request/response schemas, and working examples.

## Installation

```bash
npx skills add https://github.com/CheehooLabs/SpureeSkills
```

To update to the latest version, run the same command again.

## Getting Started

After installing or connecting Spuree, ask your agent:

> "How do I use Spuree skills?"

The **getting-started** skill explains the available public capabilities and
offers a guided, read-only first step. You can also ask “What can Spuree do?” or
“Walk me through Spuree.” The guide adapts to full skill/MCP clients and to
read-only web connectors that expose search and fetch. Studio also publishes
the same guide as the `getting_started` MCP tool for Claude Code on the web and
ChatGPT.

## Install Guide

Connect Claude Code, Claude Code Web & Cowork, ChatGPT, Codex, or OpenClaw — via the OAuth connector or skills + API keys. See [INSTALL.md](./INSTALL.md).

## Available Skills

| Skill | Description |
| --- | --- |
| [Getting Started](./getting-started/SKILL.md) | Learn what Spuree can do and complete a safe guided first run |
| [Authentication](./authentication/SKILL.md) | Obtain JWT tokens, manage API keys |
| [Project Management](./project-management/SKILL.md) | Create, list, update, delete, and share projects; browse contents |
| [Folder Management](./folder-management/SKILL.md) | Find canonical folders in one bounded call, list recent folders, and create, update, delete, browse, or download folder content |
| [File Management](./file-management/SKILL.md) | Get, create, upload, update, and delete files with checksum-verified uploads (includes name search) |
| [File Comments](./file-comment/SKILL.md) | Add, list, resolve, update, and delete line-anchored review comments on files, with threaded replies and @mentions |
| [Project Invitations](./project-invitation/SKILL.md) | Manage sharing invitations for non-workspace members |

## Authentication

All skills use the V1 API. Two authentication methods are supported:

| Method | Header | Use case |
| --- | --- | --- |
| JWT token | `Authorization: Bearer <token>` | Interactive sessions (1 hour expiry, refreshable) |
| API key | `X-API-Key: <key>` | Automation and long-lived access |

See the [Authentication skill](./authentication/SKILL.md) for details on obtaining tokens and managing API keys.

## Contract checks and diagnostics

The folder-discovery contract is checked offline so documentation drift fails
before release. The guard pins exact endpoint headings, ordered query
parameters (types, required flags, defaults, enums, and bounds), canonical
context object shapes, response field names and types, closed response enums,
status codes, and bounded fallback behavior:

```bash
node scripts/check-folder-discovery-contract.mjs
node --test test/*.test.mjs
```

To diagnose duplicate public and plugin skill copies without changing or
deleting any installation, run the script from a checkout of this repository
and point `--target` at the project or agent workspace whose active catalog you
want to inspect:

```bash
node scripts/diagnose-spuree-skill-copies.mjs --target /path/to/project
node scripts/diagnose-spuree-skill-copies.mjs --target /path/to/project --json
```

When the checkout and target project differ, the checkout remains the immutable
source reference while `--target` controls project/workspace discovery. The
diagnostic scans all seven public skills across `.agents`, `.codex`, `.claude`,
OpenClaw workspace/global, Hermes global, and Codex plugin-cache roots. It
reports paths, SHA-256 hashes, catalog scan order, exposed names, and plugin
namespace/version metadata. Collision groups use the exposed skill name, so a
namespaced plugin such as `internal-spuree-skills:folder-management` is not
misreported as shadowing the public `folder-management` skill. Scan order is
informational; the active client owns runtime precedence.
