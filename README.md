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

## Available Skills

| Skill | Description |
| --- | --- |
| [Getting Started](./getting-started/SKILL.md) | Learn what Spuree can do and complete a safe guided first run |
| [Authentication](./authentication/SKILL.md) | Obtain JWT tokens, manage API keys |
| [Project Management](./project-management/SKILL.md) | Create, list, update, delete, and share projects; browse contents |
| [Folder Management](./folder-management/SKILL.md) | Create, update, delete, and browse folders; list assets, files, and batch downloads |
| [File Management](./file-management/SKILL.md) | Get, create, upload, update, and delete files with checksum-verified uploads (includes name search) |
| [Project Invitations](./project-invitation/SKILL.md) | Manage sharing invitations for non-workspace members |

## Authentication

All skills use the V1 API. Two authentication methods are supported:

| Method | Header | Use case |
| --- | --- | --- |
| JWT token | `Authorization: Bearer <token>` | Interactive sessions (1 hour expiry, refreshable) |
| API key | `X-API-Key: <key>` | Automation and long-lived access |

See the [Authentication skill](./authentication/SKILL.md) for details on obtaining tokens and managing API keys.
