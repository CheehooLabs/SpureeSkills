# Spuree API Skills

Spuree provides an agent-friendly cloud storage via a simple Project → Folder → File hierarchy. Agents authenticate with an API key, then create projects, organize folders, and upload/download files — all through REST APIs designed for programmatic access.

These skills are structured API documentation for AI agent consumption. Each skill documents a specific API domain with endpoints, request/response schemas, and working examples.

## Agent Surfaces

Each endpoint may include a hidden `spuree-agent` metadata block that tells MCP hosts where the endpoint is safe to expose:

```md
<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->
```

Supported surfaces:

| Surface | Meaning |
| --- | --- |
| `local` | Local CLI/agent runtimes that can access local files and follow returned URLs |
| `desktop` | Desktop agent runtimes |
| `backend` | Server-side automations |
| `hosted-web` | Hosted web agents such as Claude Web connectors |

Hosted web MCP clients should expose only endpoints with `hosted-web` in `surfaces` and `webSafe: true`. Endpoints that require local file bytes, direct S3 uploads, or fetching short-lived asset URLs should stay off the hosted-web surface unless there is a dedicated web-safe API.

## Installation

```bash
npx skills add https://github.com/CheehooLabs/SpureeSkills
```

To update to the latest version, run the same command again.

## Available Skills

| Skill | Description |
| --- | --- |
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
