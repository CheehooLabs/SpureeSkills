---
name: file-management
description: Search, get, create, upload (single & multipart), update, and delete files in Spuree projects with checksum-verified upload flow
---

# File Management

## Overview

Spuree is an agent-friendly cloud storage. Projects contain folders (nestable) and files at any level. This skill manages files — they can live directly under a project or inside any folder. In the API, projects and folders are both called **sessions** (`sessionType`: `creative_project` = project, `session` = folder).

Use this skill when an agent needs to:

- Search for files and folders by name across all projects
- Get a file by ID with download URL
- Upload new files to a project or folder
- Update file metadata (rename, move) or content (with conflict detection)
- Delete files (soft delete)

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

## Base URLs

| Base URL | Endpoints |
| --- | --- |
| `https://data.spuree.com/api/v1/files` | File CRUD |
| `https://data.spuree.com/api/v1/search` | Cross-project search |

## Endpoints

### GET /v1/search

Search files and folders by name (case-insensitive substring match). Returns sessions first, then files.

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `q` | string | — | Search query (1–255 chars) |
| `type` | string | — | Filter: `"file"` or `"session"`. Omit for both. |
| `workspaceId` | string | — | Restrict results to a specific workspace |
| `limit` | integer | 100 | Max results (1–100) |

**Response:** `{ "data": [...], "count": N }`

Each result has `type` (`"file"` or `"session"`) plus type-specific fields:

- **session**: `id`, `name`, `sessionType`, `workspaceId`, `createdAt`, `updatedAt`
- **file**: `id`, `fileName`, `fileFormat`, `mimeType`, `size`, `workspaceId`, `sessionId`, `entitySessionId`, `createdAt`, `updatedAt`

```bash
curl "https://data.spuree.com/api/v1/search?q=hero" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/files/{fileId}

Get file metadata and presigned download URL.

**Response:** `{ "data": { id, fileName, fileFormat, mimeType, size, workspaceId, sessionId, entitySessionId, downloadUrl, createdAt, updatedAt } }`

```bash
curl "https://data.spuree.com/api/v1/files/{fileId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/files

Create a file record and get presigned upload URL(s). Automatically selects upload mode based on file size:

- **< 100 MB** → single presigned PUT URL (`mode: "single"`)
- **≥ 100 MB** → multipart upload with per-part presigned URLs (`mode: "multipart"`)

The caller **must** then upload to S3 **and** call `POST /v1/files/{fileId}/upload/complete`. Without the complete call, the file remains pending and unusable.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fileName` | string | Yes | File name without extension |
| `fileFormat` | string | Yes | Extension in lowercase (e.g., `fbx`, `png`) |
| `fileSize` | integer | Yes | File size in bytes (accepts string for backward compat) |
| `sessionId` | string | Yes | Target project or folder ObjectId |
| `checksum` | string | No | CRC32 base64 (8 chars) for end-to-end verification. When provided, the presigned URL is signed with the checksum and S3 verifies the upload matches. |

**Response (single mode):** `{ messageCode, fileId, mode: "single", uploadUrl, checksumBase64, contentType }`

**Response (multipart mode):** `{ messageCode, fileId, mode: "multipart", parts: [{partNumber, startByte, endByte, url}, ...], totalParts, expiresAt }`

| Code | Description |
| --- | --- |
| 200 | Record created, presigned URL(s) returned |
| 404 | Session not found |
| 409 | File already exists |

```bash
curl -X POST "https://data.spuree.com/api/v1/files" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName":"hero_walk","fileFormat":"fbx","fileSize":5242880,"sessionId":"...","checksum":"AAAAAA=="}'
```

---

### POST /v1/files/{fileId}/upload/complete

Mark a file upload as completed. Works for both single and multipart uploads — the server auto-detects by checking whether the file has an active multipart `uploadId`. For multipart, the server calls S3 `ListParts` to collect ETags and then `CompleteMultipartUpload`.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `fileId` | string | Yes | Must match path parameter |
| `clientChecksumCRC32` | string | No | Client-computed CRC32 for end-to-end verification |

**Response:** `{ messageCode, fileId, checksum, checksumCRC32 }`

- `checksum`: S3-verified CRC32 (base64) for both single and multipart uploads
- `checksumCRC32`: S3 FULL_OBJECT CRC32 (multipart only)

```bash
curl -X POST "https://data.spuree.com/api/v1/files/{fileId}/upload/complete" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileId": "..."}'
```

---

### PATCH /v1/files/{fileId}

Update file metadata. At least one field required.

| Field | Type | Description |
| --- | --- | --- |
| `fileName` | string | New name (without extension) |
| `fileFormat` | string | New extension (lowercase) |
| `checksum` | string | CRC32 base64 (write-once backfill, no edit permission needed) |
| `sessionId` | string | Move to target project or folder |

**Move:** Only `creative_project` (project) and `session` (folder) targets supported.

**Response:** `{ messageCode, fileId }`

| Code | Description |
| --- | --- |
| 200 | Updated |
| 409 | Filename conflict in target |

```bash
curl -X PATCH "https://data.spuree.com/api/v1/files/{fileId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fileName": "hero_run_cycle"}'
```

---

### PUT /v1/files/{fileId}

Prepare a content update with optimistic concurrency. Acquires an upload lock. Like `POST /v1/files`, automatically selects single or multipart mode based on `fileSize`.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `expectedChecksum` | string | Yes | CRC32 base64 of current content (for conflict detection) |
| `newChecksum` | string | Yes | CRC32 base64 of new content to upload |
| `fileSize` | integer | No | Size in bytes. If ≥ 100 MB, returns multipart mode. |

**Response (single):** `{ messageCode, fileId, mode: "single", uploadUrl, checksumBase64, contentType }`

**Response (multipart):** `{ messageCode, fileId, mode: "multipart", parts: [{partNumber, startByte, endByte, url}, ...], totalParts, expiresAt }`

After receiving the response, upload to S3 then call `POST /v1/files/{fileId}/upload/complete`.

**Upload lock:** Single uploads lock for 1 hour. Multipart uploads lock for 6 hours. Same user can re-acquire. Expired locks auto-release.

| Code | Description |
| --- | --- |
| 200 | Lock acquired, presigned URL(s) returned |
| 409 | Checksum mismatch or locked by another user |

```bash
curl -X PUT "https://data.spuree.com/api/v1/files/{fileId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"expectedChecksum": "a1b2...","newChecksum": "f6e5..."}'
```

---

### GET /v1/files/{fileId}/upload

Resume a multipart upload. Returns which parts are already in S3 and fresh presigned URLs for remaining parts.

**Query Parameters:**

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `uploadId` | string | No | Client's expected uploadId for mismatch detection |
| `checksum` | string | No | Client's expected pendingChecksum for conflict detection |

**Response:** `{ messageCode, fileId, completedParts: [{partNumber, etag, size}, ...], remainingParts: [{partNumber, startByte, endByte, url}, ...], totalParts }`

| Code | Description |
| --- | --- |
| 200 | Success |
| 400 | No active multipart upload |
| 409 | Not in pending status or locked by another user |

```bash
curl "https://data.spuree.com/api/v1/files/{fileId}/upload" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/files/{fileId}/upload/urls

Refresh presigned URLs for specific parts of a multipart upload. Use when URLs have expired before upload completes.

**Request Body:** `{ "partNumbers": [1, 3, 5] }` (1-indexed, min 1 part)

**Response:** `{ messageCode, urls: [{partNumber, startByte, endByte, url}, ...] }`

| Code | Description |
| --- | --- |
| 200 | Success |
| 400 | No active multipart upload or invalid part numbers |

```bash
curl -X POST "https://data.spuree.com/api/v1/files/{fileId}/upload/urls" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"partNumbers": [1, 3, 5]}'
```

---

### DELETE /v1/files/{fileId}/upload

Abort a multipart upload. Cleans up S3 parts and marks the file as failed. Idempotent — safe to call on already-aborted uploads.

**Response:** `{ messageCode, fileId, message }`

| Code | Description |
| --- | --- |
| 200 | Aborted |
| 400 | No active multipart upload |

```bash
curl -X DELETE "https://data.spuree.com/api/v1/files/{fileId}/upload" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### DELETE /v1/files/{fileId}

Soft-delete a file.

**Response:** `{ messageCode, fileId }`

```bash
curl -X DELETE "https://data.spuree.com/api/v1/files/{fileId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Common Patterns

### Single Upload Flow (< 100 MB)

1. **Compute CRC32 checksum (base64):**
   ```bash
   CHECKSUM=$(python3 -c "import base64, zlib, sys; print(base64.b64encode(zlib.crc32(open('$FILE_PATH','rb').read()).to_bytes(4,'big')).decode())")
   ```

2. **Create file record** — `sessionId` is the target project or folder:
   ```
   POST /v1/files { fileName, fileFormat, fileSize, sessionId, checksum }
   → { fileId, mode: "single", uploadUrl, checksumBase64, contentType }
   ```

3. **Upload binary to S3:**
   ```
   PUT {uploadUrl}
   Content-Type: {contentType}
   x-amz-checksum-crc32: {checksumBase64}
   Body: <file binary>
   ```

4. **Complete the upload — REQUIRED (file is not visible until this is called):**
   ```
   POST /v1/files/{fileId}/upload/complete
   ```

> **Important:** All three steps (create → S3 upload → complete) must be performed. Skipping complete leaves the file in a pending state.

### Multipart Upload Flow (≥ 100 MB)

1. **Create file record** with `fileSize` ≥ 100 MB:
   ```
   POST /v1/files { fileName, fileFormat, fileSize, sessionId, checksum }
   → { fileId, mode: "multipart", parts: [{partNumber, startByte, endByte, url}, ...], totalParts, expiresAt }
   ```

2. **Upload each part** to its presigned URL:
   ```
   PUT {part.url}
   Content-Length: {part.endByte - part.startByte + 1}
   Body: <file slice from startByte to endByte>
   ```

3. **If interrupted**, resume with `GET /v1/files/{fileId}/upload` to get completed parts and fresh URLs for remaining parts.

4. **If URLs expire**, refresh with `POST /v1/files/{fileId}/upload/urls` for specific parts.

5. **Complete** — server auto-detects multipart and calls S3 `CompleteMultipartUpload`:
   ```
   POST /v1/files/{fileId}/upload/complete
   ```

6. **To abort**, call `DELETE /v1/files/{fileId}/upload` to clean up S3 parts.

### Content Update Flow

1. `PUT /v1/files/{fileId}` with checksums (and `fileSize` for multipart) → get upload URL(s)
2. Upload new content to S3 (single or multipart, same as above)
3. `POST /v1/files/{fileId}/upload/complete` — **REQUIRED**

### Search Then Download

1. `GET /v1/search?q=hero_walk` → find file ID
2. `GET /v1/files/{fileId}` → get `downloadUrl`
3. Download from the presigned URL

### File Organization

**Projects and folders are both sessions.** `sessionId` always refers to a session. Session types: `creative_project` (project), `session` (folder). Folders nest inside projects or other folders.

S3 key: `works_{workspaceId}/sess_{sessionId}/file_{fileId}`

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
| 400 | Invalid checksum format, missing fields, bad ID | Fix input format |
| 403 | No workspace access or edit permission | Check permissions |
| 404 | File or session not found | Verify IDs |
| 409 (checksum mismatch) | File modified by another user | Re-fetch checksum, retry |
| 409 (upload lock) | Another user is uploading | Wait (lock expires in 1 hour for single, 6 hours for multipart) |
| 409 (filename conflict) | Same name exists in target | Use different name or target |
| 401 | Invalid or expired token | Refresh via **authentication** skill |
