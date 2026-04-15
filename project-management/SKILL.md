---
name: project-management
description: Create, list, update, delete, and share projects in Spuree, including browsing project contents
---

# Project Management

## Overview

Spuree is an agent-friendly cloud storage. Projects contain folders (nestable) and files at any level. This skill manages the top-level container: projects. In the API, projects and folders are both called **sessions** (`sessionType`: `creative_project` = project, `session` = folder).

Use this skill when an agent needs to:

- List, create, update, or delete projects
- Share or unshare projects with other users
- Browse a project's immediate contents (folders, entities, files)

For managing invitations to non-workspace members, see the **project-invitation** skill.

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

## Base URL

```
https://data.spuree.com/api/v1/projects
```

## Data Model

```
Project
├── Folder                    (see folder-management skill)
│   ├── Sub-folder
│   ├── Entity (asset)        character, motion, prop, environment, visdev, pose
│   │   └── Files
│   └── Files
├── Entity (asset)
│   └── Files
└── Files
```

## Endpoints

### GET /v1/projects

List projects accessible to the authenticated user, with workspace/organization lookup tables.

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `sortBy` | string | `updatedAt` | Sort field: `updatedAt`, `createdAt`, `name` |
| `sortOrder` | string | `desc` | Sort order: `asc`, `desc` |
| `limit` | integer | 500 | Results per page (1–1000) |
| `offset` | integer | 0 | Items to skip |

**Response:**

```json
{
  "projects": [
    {
      "id": "...", "name": "My Project", "description": "...",
      "workspaceId": "...", "createdBy": "user@example.com",
      "sharedWith": ["collaborator@example.com"],
      "status": "active", "visibility": "private",
      "createdAt": "...", "updatedAt": "..."
    }
  ],
  "workspaces": { "{workspaceId}": { "id": "...", "name": "...", "organizationId": "..." } },
  "organizations": { "{orgId}": { "id": "...", "name": "..." } },
  "total": 12, "limit": 500, "offset": 0
}
```

To resolve a project's workspace/org: `workspaces[project.workspaceId]` → `organizations[workspace.organizationId]`.

```bash
curl "https://data.spuree.com/api/v1/projects" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects

Create a new project. Name must be Windows filesystem-compatible.

**Where to get `workspaceId`:** From auth response `user.workspaces[].workspaceId` or from `GET /v1/projects`.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Project name |
| `workspaceId` | string | Yes | Workspace ObjectId |
| `description` | string | No | Project description |
| `sharedWith` | string[] | No | Emails to share with |

**Response (201):** `{ messageCode, message, projectId }`

| Code | Description |
| --- | --- |
| 201 | Created |
| 403 | Not a workspace member |
| 409 | Name already exists in workspace |

```bash
curl -X POST "https://data.spuree.com/api/v1/projects" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My New Project", "workspaceId": "..."}'
```

---

### PATCH /v1/projects/{projectId}

Rename a project.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | New project name |

**Response:** `{ messageCode, message, projectId }`

```bash
curl -X PATCH "https://data.spuree.com/api/v1/projects/{projectId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Project"}'
```

---

### DELETE /v1/projects/{projectId}

Soft-delete a project.

**Response:** `{ messageCode, message, projectId }`

```bash
curl -X DELETE "https://data.spuree.com/api/v1/projects/{projectId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/projects/{projectId}/children

Browse a project's immediate contents: folders, entities (assets), and files. Use **folder-management** skill's `GET /v1/sessions/{folderId}/children` to navigate deeper.

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `limit` | integer | 100 | Results per category (max 500) |
| `offset` | integer | 0 | Items to skip |

**Response:** `{ sessions: [...], entities: [...], files: [...] }`

- `sessions` — folders (`sessionType: "session"`)
- `entities` — assets with preview images (character, motion, prop, etc.)
- `files` — files with presigned download URLs

```bash
curl "https://data.spuree.com/api/v1/projects/{projectId}/children" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects/{projectId}/share

Share a project with another user. Behaves differently based on target's workspace membership:

- **Direct** (target is workspace member) → immediately added. Response: `type: "direct"`
- **Invitation** (target is NOT a member) → pending invitation created (7-day expiry). Response: `type: "invitation"`. See **project-invitation** skill.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | Target user's email |

**Response:** `{ messageCode, message, projectId, type }`

| Code | Description |
| --- | --- |
| 200 | Shared or invitation created |
| 400 | Cannot share with owner |
| 409 | Already shared or invitation pending |

```bash
curl -X POST "https://data.spuree.com/api/v1/projects/{projectId}/share" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "collaborator@example.com"}'
```

---

### DELETE /v1/projects/{projectId}/share/{email}

Remove a user from a shared project. **Owner only.**

**Response:** `{ messageCode, message, projectId }`

```bash
curl -X DELETE "https://data.spuree.com/api/v1/projects/{projectId}/share/{email}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/projects/{projectId}/share

List the project's sharing info. **Owner or shared user.**

**Response:** `{ owner: "owner@example.com", sharedWith: ["..."] }`

```bash
curl "https://data.spuree.com/api/v1/projects/{projectId}/share" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects/{projectId}/leave

Leave a project shared with you. **Owner cannot leave.**

**Response:** `{ messageCode, message, projectId }`

```bash
curl -X POST "https://data.spuree.com/api/v1/projects/{projectId}/leave" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Common Patterns

### Browse a Project

1. `GET /v1/projects` → find the target project
2. `GET /v1/projects/{id}/children` → see contents
3. `GET /v1/sessions/{folderId}/children` → navigate deeper (folder-management skill)

### Agent Workflow: Project Discovery

1. **List projects** → find the target
2. **Get children** → browse recursively
3. Use IDs with: **folder-management**, **file-management**

### Studio URLs

| Resource | URL Pattern |
| --- | --- |
| Project | `https://studio.spuree.com/projects/{projectId}` |
| Folder (top-level) | `https://studio.spuree.com/projects/{projectId}/folders/{folderId}` |
| Folder (nested) | `.../folders/{parentId}/{childId}` (up to 5 levels) |
| File | `https://studio.spuree.com/file/{fileId}` |

## Error Handling

| Code | Cause | Resolution |
| --- | --- | --- |
| 400 | Invalid name (filesystem chars) or malformed ObjectId | Use Windows-compatible names, 24-char hex IDs |
| 401 | Expired or invalid token | Refresh via **authentication** skill |
| 403 | Not a workspace member or project owner | Check user permissions |
| 409 | Name conflict or duplicate share | Use different name or check existing shares |
