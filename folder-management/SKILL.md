---
name: folder-management
description: Find folders by name, list recent folders across projects, and create, update, delete, or browse folders (sessions), including their assets and files
---

# Folder Management

## Overview

Spuree is an agent-friendly cloud storage. Projects contain folders (nestable) and files at any level. This skill manages folders — they can be nested to any depth within a project.

Use this skill when an agent needs to:

- List recently created or updated folders across all accessible projects
- Find a named folder with bounded search rather than project-tree traversal
- Create, rename, move, or delete folders in a project
- Browse a folder's contents (sub-folders, entities, files)
- List assets or files within a folder
- Get download URLs for files in bulk

> **API terminology:** In the API, folders are called **sessions** (`sessionType: "session"`). All API fields use `sessionId`, `parentSessionId`, etc. This document uses **folder** for clarity.

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or use an API key:

```
X-API-Key: $SPUREE_API_KEY
```

See the **authentication** skill for obtaining tokens and managing API keys.

## Base URL

| Operation | Base URL |
| --- | --- |
| Named-folder discovery | `https://data.spuree.com/api/v1/search/folders` |
| Cross-project folder listing | `https://data.spuree.com/api/v1/folders` |
| Folder CRUD and child browsing | `https://data.spuree.com/api/v1/sessions` |

## Data Model

### Folder Hierarchy

```
Project (creative_project)          ← see project-management skill
├── Folder (session)
│   ├── Sub-folder (session)
│   │   └── ...
│   ├── Entity (asset)              character, motion, prop, environment, visdev, pose
│   │   └── Files
│   └── Files
├── Entity (asset)
│   └── Files
└── Files
```

### Session Types

| `sessionType` | This document calls it | Description |
| --- | --- | --- |
| `creative_project` | Project | Top-level container (managed via **project-management** skill) |
| `session` | **Folder** | Organizes content hierarchically |
| `entity` | Entity / Asset | Asset container (character, motion, prop, etc.) |
| `animation` | Animation | Animation session |

### Entity Types

Entities represent assets and have one of these types:

`character`, `motion`, `prop`, `environment`, `visdev`, `pose`

## Endpoints

### GET /v1/search/folders

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Find existing project folders in one bounded request. The Search service runs
direct folder-name and contained-file evidence branches concurrently under the
same caller scope and eight-second ceiling, then returns deduplicated canonical
folders. Use this endpoint first for a named-folder request; do not enumerate
projects or recursively browse children to reproduce it client-side.

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `q` | string | Yes | — | Nonblank natural-language folder query (1–255 characters). |
| `workspaceId` | string | No | — | Restrict to one workspace already accessible to the caller. |
| `projectId` | string | No | — | Restrict to one project already accessible to the caller. |
| `limit` | integer | No | 5 | Maximum canonical candidates (1–10). |

**Response:**

```json
{
  "data": [
    {
      "folder": { "id": "64a7b8c9d1e2f3a4b5c6d7e8", "name": "Phase 0" },
      "project": { "id": "64a7b8c9d1e2f3a4b5c6d7d0", "name": "PLOCAN" },
      "breadcrumb": [
        { "id": "64a7b8c9d1e2f3a4b5c6d7d0", "name": "PLOCAN", "sessionType": "creative_project" },
        { "id": "64a7b8c9d1e2f3a4b5c6d7d8", "name": "Works", "sessionType": "session" },
        { "id": "64a7b8c9d1e2f3a4b5c6d7e8", "name": "Phase 0", "sessionType": "session" }
      ],
      "matchStrength": "strong",
      "reasonCodes": ["direct_folder_name", "path_token_match"],
      "evidence": {
        "directMatchCount": 1,
        "childFileCount": 0,
        "childFilenameCount": 0,
        "childContentCount": 0
      }
    }
  ],
  "count": 1,
  "status": "complete",
  "partial": false,
  "degradedBranches": [],
  "branchStatus": [
    { "branch": "direct_folder_name", "status": "ok" },
    { "branch": "file_evidence", "status": "ok" }
  ]
}
```

The documented response schema is exact:

| Object | Field | Type |
| --- | --- | --- |
| `envelope` | `data` | array |
| `envelope` | `count` | integer |
| `envelope` | `status` | string |
| `envelope` | `partial` | boolean |
| `envelope` | `degradedBranches` | string[] |
| `envelope` | `branchStatus` | array |
| `result` | `folder` | object |
| `result` | `project` | object |
| `result` | `breadcrumb` | array |
| `result` | `matchStrength` | string |
| `result` | `reasonCodes` | string[] |
| `result` | `evidence` | object |
| `folder` | `id` | string |
| `folder` | `name` | string |
| `project` | `id` | string |
| `project` | `name` | string |
| `breadcrumb[]` | `id` | string |
| `breadcrumb[]` | `name` | string |
| `breadcrumb[]` | `sessionType` | string |
| `evidence` | `directMatchCount` | integer |
| `evidence` | `childFileCount` | integer |
| `evidence` | `childFilenameCount` | integer |
| `evidence` | `childContentCount` | integer |
| `branchStatus[]` | `branch` | string |
| `branchStatus[]` | `status` | string |

The response enums are also closed sets:

| Field | Exact values |
| --- | --- |
| `status` | `complete` \| `partial` |
| `degradedBranches[]` | `direct_folder_name` \| `file_evidence` |
| `matchStrength` | `exact` \| `strong` \| `supporting` |
| `reasonCodes[]` | `exact_folder_name` \| `direct_folder_name` \| `path_token_match` \| `child_filename` \| `child_content` |
| `breadcrumb[].sessionType` | `creative_project` \| `session` |
| `branchStatus[].branch` | `direct_folder_name` \| `file_evidence` |
| `branchStatus[].status` | `ok` \| `timeout` \| `error` \| `skipped` |

`breadcrumb` is ordered from the creative-project root through the matched
folder. `matchStrength` is exactly `exact`, `strong`, or `supporting`; it is a
stable qualitative tier, not a probability. `reasonCodes` may contain
`exact_folder_name`, `direct_folder_name`, `path_token_match`,
`child_filename`, and `child_content`.

Evidence is count-only. CheehooData does not return matching child file names,
file IDs, snippets, bodies, raw Atlas scores, or navigation URLs from this
endpoint. A hosted Studio tool may add `webUrl` fields; otherwise construct
`https://studio.spuree.com/folders/{folderId}` and
`https://studio.spuree.com/projects/{projectId}` from the canonical IDs.

`status: "partial"` and `partial: true` mean exactly one search branch degraded;
inspect `degradedBranches` and `branchStatus`, and present the surviving
candidates as partial. Each `branchStatus[].status` is exactly `ok`, `timeout`,
`error`, or `skipped`: `ok` means the bounded branch completed (even with no
matches), `timeout`/`error` identify degradation, and `skipped` means no search
ran because the caller's narrowed scope was empty. Service construction, scope
resolution, both evidence branches, and canonical hydration share one
eight-second ceiling. If that request budget expires, both branches are
unavailable, or canonical hydration fails, the request returns 503 instead of
silently traversing project trees.

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Complete or explicitly partial canonical candidates returned |
| 400 | Query has no safe high-signal term or exceeds the bounded search breadth threshold |
| 401 | Invalid or expired credential |
| 403 | OAuth credential lacks the `read` scope |
| 422 | Missing/blank query, invalid limit, or malformed narrowing ID |
| 500 | Non-transient search or canonical-storage failure |
| 503 | Shared request deadline expires, both evidence branches are unavailable, or canonical hydration fails |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/search/folders?q=PLOCAN%20Phase%200%20and%20A%20Works&limit=5" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/folders

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

List all folders the authenticated user can access across projects, globally sorted with containing project and workspace context. Use this for requests such as “show my recently created folders”; do not substitute projects for folders.

The default query returns the newest-created folders first. Nested folders are included at every depth, so no recursive project browsing is required.

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `sortBy` | string | `createdAt` | Global sort key: `createdAt`, `updatedAt`, or `name` |
| `sortOrder` | string | `desc` | Sort direction: `asc` or `desc` |
| `limit` | integer | 50 | Results per page (1-200) |
| `offset` | integer | 0 | Number of globally sorted folders to skip |
| `workspaceId` | string | - | Restrict to one accessible workspace ObjectId |
| `projectId` | string | - | Restrict to one accessible project ObjectId |

**Response:**

```json
{
  "folders": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "name": "Shot 010",
      "sessionType": "session",
      "description": "Latest shot work",
      "createdBy": "artist@example.com",
      "status": "active",
      "tags": ["shot"],
      "parentSessions": ["64a7b8c9d1e2f3a4b5c6d7e0"],
      "projectId": "64a7b8c9d1e2f3a4b5c6d7d0",
      "projectName": "Feature Film",
      "workspaceId": "64a7b8c9d1e2f3a4b5c6d7c0",
      "createdAt": "2026-07-15T17:00:00Z",
      "updatedAt": "2026-07-15T17:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

`projectId`, `projectName`, and `workspaceId` identify each folder's container. An optional filter that selects no readable project returns an empty page rather than revealing whether an inaccessible folder exists.

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Folders returned |
| 400 | Invalid workspace or project ObjectId filter |
| 401 | Invalid or expired token |
| 403 | OAuth credential lacks the `read` scope |
| 422 | Invalid sort or pagination query value |
| 500 | Internal server error |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/folders?sortBy=createdAt&sortOrder=desc&limit=20" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/sessions

Create a new folder.

**Description:** Creates a folder under a parent (project, folder, animation, or entity). The name must be compatible with Windows file system naming rules.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Folder name (Windows filesystem-compatible) |
| `parentSessionId` | string | Yes | Parent ObjectId (project, folder, animation, or entity) |
| `description` | string | No | Folder description |
| `tags` | string[] | No | Tags for the folder |

**Response:**

```json
{
  "messageCode": "success",
  "sessionId": "64a7b8c9d1e2f3a4b5c6d7e8"
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Folder created |
| 400 | Invalid name, invalid parent ID, parent type not allowed, or entity nesting limit exceeded |
| 401 | Invalid or expired token |
| 403 | Not authorized to create in this parent |
| 404 | Parent not found or deleted |
| 409 | Folder name already exists in the parent |
| 500 | Internal server error |

**Nesting rules:**

- Allowed parents: `creative_project`, `session`, `animation`, `entity`
- Entity sessions allow only 1 level of sub-folders. Creating a folder under a folder that is already inside an entity is rejected.

**Example:**

```bash
curl -X POST "https://data.spuree.com/api/v1/sessions" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Characters",
    "parentSessionId": "64a7b8c9d1e2f3a4b5c6d7e8",
    "description": "All character assets",
    "tags": ["characters"]
  }'
```

---

### PATCH /v1/sessions/{sessionId}

Update a folder (rename, move, or edit tags).

**Description:** Updates folder metadata. Supports renaming, moving to a different parent, and updating description/tags. Only folders (`sessionType: "session"`) can be updated via this endpoint.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sessionId` | string | Folder ObjectId |

**Request Body (all fields optional, at least one required):**

| Field | Type | Description |
| --- | --- | --- |
| `name` | string | New folder name |
| `description` | string | New description |
| `tags` | string[] | New tags |
| `parentSessionId` | string | Move to a new parent (project, folder, animation, or entity) |

**Response:**

```json
{
  "messageCode": "success",
  "sessionId": "64a7b8c9d1e2f3a4b5c6d7e8"
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Folder updated |
| 400 | No fields provided, circular reference, or nesting limit exceeded |
| 401 | Invalid or expired token |
| 403 | Not authorized, or session is not a folder |
| 404 | Folder not found, or target parent not found |
| 409 | Name conflict in target parent |
| 500 | Internal server error |

**Move notes:**

- Moving a folder automatically inherits workspace and project IDs from the new parent.
- Circular references are detected and rejected (cannot move a folder into its own descendant).

**Examples:**

```bash
# Rename a folder
curl -X PATCH "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Renamed Folder"}'

# Move a folder to a different parent
curl -X PATCH "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"parentSessionId": "64a7b8c9d1e2f3a4b5c6d7f0"}'
```

---

### DELETE /v1/sessions/{sessionId}

Delete a folder (soft delete).

**Description:** Soft-deletes a folder by setting its status to "deleted". Only folders (`sessionType: "session"`) can be deleted via this endpoint.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sessionId` | string | Folder ObjectId |

**Response:**

```json
{
  "messageCode": "success",
  "sessionId": "64a7b8c9d1e2f3a4b5c6d7e8"
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Folder soft-deleted |
| 400 | Invalid folder ID format |
| 401 | Invalid or expired token |
| 403 | Not authorized, or session is not a folder |
| 404 | Folder not found or already deleted |
| 500 | Internal server error |

**Example:**

```bash
curl -X DELETE "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/sessions/{sessionId}/children

List a folder's immediate contents — sub-folders, asset entities, and files. Use this to browse into a folder when you have its ID and want to see everything inside.

**Description:** Returns the direct children of a folder: sub-folders, entities (assets), and files. Same response format as `GET /v1/projects/{projectId}/children`.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sessionId` | string | Folder ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `sortBy` | string | `lastModified` | Sort key: `lastModified` \| `createdDate` \| `name` |
| `sortOrder` | string | `desc` | Sort direction: `asc` \| `desc` |
| `limit` | integer | 100 | Items in the unified list (max: 500) |
| `offset` | integer | 0 | Number of items to skip in the unified list |

**Response:** `{ items: [...] }` — one flat array mixing sub-folders, entities, and files, sorted by the chosen key. Each item carries a `type` discriminator (`"session"`, `"entity"`, or `"file"`) that selects its fields. An empty folder returns `{ "items": [] }`.

```json
{
  "items": [
    {
      "type": "session",
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "name": "Sub-folder",
      "sessionType": "session",
      "status": "active",
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    },
    {
      "type": "entity",
      "id": "64a7b8c9d1e2f3a4b5c6d7e9",
      "name": "Hero Character",
      "entityType": "character",
      "description": "Main character",
      "entityPreview": {
        "presignedUrl": "https://s3.amazonaws.com/...",
        "key": "previews/hero_low.jpg",
        "fileFormat": "jpg"
      },
      "highResEntityPreview": {
        "presignedUrl": "https://s3.amazonaws.com/...",
        "key": "previews/hero_high.jpg",
        "fileFormat": "jpg"
      }
    },
    {
      "type": "file",
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "name": "reference_sheet",
      "fileFormat": "png",
      "fileSize": 20480,
      "key": "works_abc/sess_def/file_ghi",
      "sourceCharacter": null,
      "presignedUrl": "https://s3.amazonaws.com/...",
      "annotationMetaData": {}
    }
  ]
}
```

> **Parsing note:** Read the required top-level `items` array. Do not parse this
> endpoint as separate collections; an empty folder is exactly `{ "items": [] }`.

**Item Types** (selected by `type`):

| `type` | Contains | Description |
| --- | --- | --- |
| `session` | Folder | Sub-folder — navigate deeper with this same endpoint |
| `entity` | Asset | Entity session with preview images |
| `file` | File | File with a presigned download URL |

**Entity Item Fields** (`type: "entity"`):

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Entity ObjectId |
| `name` | string | Entity name |
| `entityType` | string | `character`, `motion`, `prop`, `environment`, `visdev`, `pose` |
| `description` | string? | Entity description |
| `entityPreview` | object? | Low-res preview (`presignedUrl`, `key`, `fileFormat`) |
| `highResEntityPreview` | object? | High-res preview |

**File Item Fields** (`type: "file"`):

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | File ObjectId |
| `name` | string | File name (without extension; mirrors the file's `fileName`) |
| `fileFormat` | string | File extension (lowercase) |
| `fileSize` | integer? | File size in bytes |
| `key` | string | S3 object key |
| `sourceCharacter` | string? | Associated character name |
| `presignedUrl` | string | S3 presigned download URL |
| `annotationMetaData` | object | Metadata (fps, frameCount, durationSeconds, ueAssetType, etc.) |

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Children returned |
| 400 | Invalid folder ID format |
| 401 | Invalid or expired token |
| 403 | Not authorized to access this folder |
| 404 | Folder not found or deleted |
| 500 | Internal server error |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8/children?limit=50" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/sessions/{sessionId}/assets

List the published asset entities (character, motion, prop, etc.) in a folder with their preview images. Use this when you need assets only, not raw files or sub-folders.

**Description:** Returns entity sessions and their associated files for a given folder.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sessionId` | string | Folder ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `include` | string | `files` | Comma-separated: `files` |
| `limit` | integer | 100 | Results per page (max: 500) |
| `offset` | integer | 0 | Number of items to skip |

**Response:**

```json
{
  "assets": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7e9",
      "name": "Hero Character",
      "entityType": "character",
      "description": "Main character",
      "entityPreview": { "presignedUrl": "...", "key": "...", "fileFormat": "jpg" },
      "highResEntityPreview": { "presignedUrl": "...", "key": "...", "fileFormat": "jpg" }
    }
  ],
  "files": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "fileName": "hero_model",
      "fileFormat": "fbx",
      "key": "works_abc/sess_def/file_ghi",
      "sourceCharacter": "Hero",
      "presignedUrl": "https://s3.amazonaws.com/...",
      "annotationMetaData": { "fileSize": "1048576" }
    }
  ]
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Assets and files returned |
| 400 | Invalid folder ID format |
| 401 | Invalid or expired token |
| 403 | Not authorized |
| 404 | Folder not found |
| 500 | Internal server error |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8/assets" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/sessions/{sessionId}/files

List the files directly in a folder (optionally flattened to include sub-folder files). Use this when you need file records for a known folder without browsing sub-folders.

**Description:** Returns files associated with a folder. By default, flattens results to include files from sub-folders via entity session linkage.

**Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `sessionId` | string | Folder ObjectId |

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `flatten` | boolean | `true` | `true`: files by `entitySessionId` (includes sub-folders). `false`: files by direct `sessionId` only |
| `limit` | integer | 100 | Results per page (max: 500) |
| `offset` | integer | 0 | Number of items to skip |

**Response:**

```json
{
  "files": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7ea",
      "fileName": "hero_walk",
      "fileFormat": "fbx",
      "key": "works_abc/sess_def/file_ghi",
      "sourceCharacter": "Hero",
      "presignedUrl": "https://s3.amazonaws.com/...",
      "annotationMetaData": {
        "fps": 30,
        "frameCount": 300,
        "durationSeconds": 10.0,
        "fileSize": "1048576"
      }
    }
  ]
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Files returned |
| 400 | Invalid folder ID format |
| 401 | Invalid or expired token |
| 403 | Not authorized |
| 404 | Folder not found |
| 500 | Internal server error |

**Example:**

```bash
# Get all files (flattened, including sub-folders)
curl "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8/files" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"

# Get only direct files in this folder
curl "https://data.spuree.com/api/v1/sessions/64a7b8c9d1e2f3a4b5c6d7e8/files?flatten=false" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/sessions/files/download/urls

Get download URLs for multiple files in bulk.

**Description:** Generates presigned S3 download URLs for a batch of files. Validates access permissions for each file.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fileIds` | string[] | Yes | File ObjectIds to download |
| `expiresIn` | integer | No | URL expiry in seconds (60–86400, default: 3600) |
| `includeMetadata` | boolean | No | Include file metadata (default: `false`) |

**Response:**

```json
{
  "downloads": [
    {
      "fileId": "64a7b8c9d1e2f3a4b5c6d7ea",
      "fileName": "hero_walk.fbx",
      "fileSize": 1048576,
      "format": "fbx",
      "downloadUrl": "https://s3.amazonaws.com/...",
      "expiresAt": "2024-01-15T11:00:00Z",
      "sessionId": "64a7b8c9d1e2f3a4b5c6d7e8",
      "entitySessionId": "64a7b8c9d1e2f3a4b5c6d7e9",
      "metadata": {
        "createdAt": "2024-01-15T10:00:00Z",
        "updatedAt": "2024-01-15T10:00:00Z"
      }
    }
  ],
  "totalFiles": 1,
  "totalSize": 1048576,
  "unauthorizedFiles": [],
  "notFoundFiles": []
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Download URLs generated |
| 400 | Invalid input |
| 401 | Invalid or expired token |
| 403 | Not authorized for some files (listed in `unauthorizedFiles`) |
| 503 | AWS credentials error |
| 500 | Internal server error |

**Example:**

```bash
curl -X POST "https://data.spuree.com/api/v1/sessions/files/download/urls" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fileIds": ["64a7b8c9d1e2f3a4b5c6d7ea", "64a7b8c9d1e2f3a4b5c6d7eb"],
    "expiresIn": 7200,
    "includeMetadata": true
  }'
```

## Common Patterns

### List Recently Created Folders Across Projects

Call the global folder list directly; do not list projects and label them as
folders, and do not recurse through every project's children.

```text
GET /v1/folders?sortBy=createdAt&sortOrder=desc&limit=20
```

### Find a Named Folder (Bounded Search-First Recipe)

Use search for requests such as “find the PLOCAN Phase 0 and A Works folder.”
Do not list every project or walk child endpoints to discover a folder by name.

1. Make the preferred one-call discovery request with the user's concise
   natural-language folder intent:

   ```text
   GET /v1/search/folders?q={encodedNaturalLanguageQuery}&limit=5
   ```

   Use the returned canonical `folder`, `project`, and root-to-folder
   `breadcrumb`. Preserve explicit partial status. Return or ask the user to
   choose among those candidates; do not perform client-side traversal.

2. **Compatibility fallback only:** if an older deployment does not expose
   `GET /v1/search/folders`, use the following fixed two-search sequence. First
   separate the likely leaf-folder stem and requested leaf labels from hierarchy
   qualifiers. In the example above, search for `Phase`, retain the requested
   labels `0` and `A`, and use `PLOCAN` / `Works` as hierarchy qualifiers. Rank
   canonical `Phase 0` and `Phase A` results beneath `PLOCAN / Works`; do not
   treat `Works` as the leaf. Do not send request verbs or the entire
   natural-language sentence as `{encodedQuery}`.

   Search folder name rows directly:

   ```text
   GET /v1/search?q={encodedQuery}&type=folder&searchIn=name&matchMode=all&limit=50
   ```

   Read the grouped `{ data, count, cursor }` response. Rank an exact
   case-insensitive `sessionName` match first, then normalized all-term name
   matches, then the API relevance order. A folder result's canonical Studio
   URL is `https://studio.spuree.com/folders/{sourceId}`.

   Only when the direct results are empty or still ambiguous and the request
   contains useful file/content terms, make **one** evidence fallback request:

   ```text
   GET /v1/search?q={encodedQuery}&type=file&searchIn=all&matchMode=all&limit=50
   ```

   Use concise evidence terms, not request verbs. Group the returned file
   results by their containing `sessionId`; use the number and relevance of
   matching files only as supporting evidence. Promote a group only when its
   result context identifies that `sessionId` as a folder, and skip
   project-root files. Its canonical Studio URL is
   `https://studio.spuree.com/folders/{sessionId}`.

   Return the best candidates with their project context and evidence. If the
   result is still ambiguous, ask the user to choose. Stop after the direct
   search and the single fallback: do not enumerate projects, call child
   endpoints, or recursively traverse folders for named-folder discovery.

`GET /v1/folders` is for globally sorted listing such as “recent folders”; it
is not the fallback for a name query.

### Browse a Known Folder

Use child endpoints only after the user supplied or selected an ID. They are
for inspecting a known container, not for finding a named folder.

1. **Get project children** (via **project-management** skill):

   ```
   GET /v1/projects/{projectId}/children → { items: [...] }
   ```

2. **Navigate into a folder:**

   ```
   GET /v1/sessions/{folderId}/children → { items: [...] }
   ```

3. Follow a returned sub-folder ID only when the user asks to inspect it.

### Create a Folder Structure

```bash
# Create a top-level folder in a project
POST /v1/sessions { name: "Characters", parentSessionId: "{projectId}" }
→ { sessionId: "folder1" }

# Create a sub-folder
POST /v1/sessions { name: "Heroes", parentSessionId: "folder1" }
→ { sessionId: "folder2" }
```

### Download All Files in a Folder

1. **List files** in the folder:

   ```
   GET /v1/sessions/{folderId}/files?flatten=true → { files: [...] }
   ```

2. **Get download URLs** in bulk:

   ```
   POST /v1/sessions/files/download/urls { fileIds: [...] }
   → { downloads: [{ downloadUrl, ... }] }
   ```

3. **Download** each file using its `downloadUrl`.

### Agent Workflow: Asset Discovery

1. **Find the folder** → use the bounded search-first recipe above
2. **Get assets** → `GET /v1/sessions/{folderId}/assets`
3. **Get files** → for each asset, list its files
4. **Download** → batch download with `POST /v1/sessions/files/download/urls`

### Studio URLs

After creating or finding resources, you can give the user a clickable link to view them in the browser:

| Resource | URL Pattern |
| --- | --- |
| Project | `https://studio.spuree.com/projects/{projectId}` |
| Folder | `https://studio.spuree.com/folders/{folderId}` |
| File | `https://studio.spuree.com/files/{fileId}` |

Studio resource URLs use only the target ID, regardless of folder depth.

## Error Handling

| Error | Cause | Resolution |
| --- | --- | --- |
| 400 (invalid name) | Name contains invalid filesystem characters | Use Windows-compatible names |
| 400 (nesting limit) | Trying to nest more than 1 level under an entity | Restructure: entities allow only 1 sub-folder level |
| 400 (circular ref) | Moving a folder into its own descendant | Choose a different target parent |
| 401 (unauthorized) | Expired or invalid JWT | Refresh token via **authentication** skill |
| 403 (not a folder) | Trying to update/delete a non-folder session | Only `sessionType: "session"` can be modified here |
| 404 (not found) | Folder doesn't exist or was deleted | Verify the folder ID |
| 409 (name conflict) | Folder name already exists in the parent | Use a different name |
