---
name: folder-management
description: List recent folders across projects; create, update, delete, and browse folders (sessions), including assets, files, and batch downloads
---

# Folder Management

## Overview

Spuree is an agent-friendly cloud storage. Projects contain folders (nestable) and files at any level. This skill manages folders — they can be nested to any depth within a project.

Use this skill when an agent needs to:

- List recently created or updated folders across all accessible projects
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
| `sortBy` | string | `createdAt` | Global sort key: `createdAt` \| `updatedAt` \| `name` |
| `sortOrder` | string | `desc` | Sort direction: `asc` \| `desc` |
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

> **Parsing note:** Read the `items` array. **Do not** look for separate top-level `sessions`, `entities`, or `files` arrays — older deployments returned that shape, but the current API returns the unified `items` list, so a parser expecting the old shape sees an empty result and wrongly concludes the folder is empty. For backward compatibility, a robust parser can read `items` first and fall back to the legacy `sessions`/`entities`/`files` arrays only when `items` is absent.

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

### Navigate a Project's Folder Structure

1. **Get project children** (via **project-management** skill):

   ```
   GET /v1/projects/{projectId}/children → { items: [...] }
   ```

2. **Navigate into a folder:**

   ```
   GET /v1/sessions/{folderId}/children → { items: [...] }
   ```

3. **Repeat** to go deeper into sub-folders.

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

1. **Browse project** → find the folder containing assets
2. **Get assets** → `GET /v1/sessions/{folderId}/assets`
3. **Get files** → for each asset, list its files
4. **Download** → batch download with `POST /v1/sessions/files/download/urls`

### Studio URLs

After creating or finding resources, you can give the user a clickable link to view them in the browser:

| Resource | URL Pattern |
| --- | --- |
| Project | `https://studio.spuree.com/projects/{projectId}` |
| Folder (top-level) | `https://studio.spuree.com/projects/{projectId}/folders/{folderId}` |
| Folder (nested) | `https://studio.spuree.com/projects/{projectId}/folders/{parentId}/{childId}` |
| File | `https://studio.spuree.com/file/{fileId}` |

Folders support up to 5 levels of nesting. Each level appends another ID segment: `.../folders/{level1}/{level2}/{level3}/...`

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
