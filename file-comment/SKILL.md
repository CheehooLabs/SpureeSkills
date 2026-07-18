---
name: file-comment
description: Add, list, resolve, update, and delete line-anchored review comments on files, including threaded replies and @mentions
---

# File Comments

## Overview

Line-anchored review comments on files. Comments reference specific line ranges and preserve the annotated source text. Supports one level of threaded replies, pending/resolved status tracking, and @mentions of users with access to the file.

Use this skill when an agent needs to:

- Leave review feedback on specific lines of a file
- Read the comments left on a file before revising it
- Reply to, resolve, reopen, edit, or delete comments
- @mention a collaborator in a comment

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

```
https://data.spuree.com/api/v1/files/{fileId}/comments
```

## Endpoints

### GET /v1/files/{fileId}/comments

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

List a file's review comments with their threaded replies, optionally filtered by `pending` or `resolved` status. Use this to read the feedback on a file before revising it, or to find a comment to reply to or resolve.

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `status` | string | - | Filter by status: `pending` or `resolved` |
| `page` | integer | 1 | Page number (1-based) |
| `limit` | integer | 50 | Top-level comments per page (1-100) |

**Response (200):**

```json
{
  "data": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "fileId": "64a7b8c9d1e2f3a4b5c6d7d0",
      "comment": "This function should handle the empty-input case",
      "startLine": 42,
      "endLine": 45,
      "sourceText": "function processData(input) {...}",
      "status": "pending",
      "resolvedBy": null,
      "parentCommentId": null,
      "author": { "id": "64a7b8c9d1e2f3a4b5c6d7a0", "name": "Jane Doe", "image": "https://..." },
      "canEdit": true,
      "replies": [
        {
          "id": "64a7b8c9d1e2f3a4b5c6d7e9",
          "comment": "Good point, will fix",
          "parentCommentId": "64a7b8c9d1e2f3a4b5c6d7e8",
          "author": { "id": "...", "name": "...", "image": "..." },
          "createdAt": "2026-07-15T10:05:00Z",
          "updatedAt": "2026-07-15T10:05:00Z"
        }
      ],
      "createdAt": "2026-07-15T10:00:00Z",
      "updatedAt": "2026-07-15T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 3 },
  "canComment": true
}
```

Replies are nested under their parent's `replies` array — they are not top-level items. `canComment` is `false` when the caller has view-only access to the file; `canEdit` marks the comments the caller may edit or delete (their own, or any comment if they are a project owner/admin).

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Comments returned |
| 400 | Invalid file ID or status value |
| 401 | Invalid or expired token |
| 403 | No access to this file |
| 404 | File not found |
| 500 | Internal server error |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/comments?status=pending" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/files/{fileId}/comments

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Add a line-anchored review comment to a file, or reply to an existing comment thread. Omit `parentCommentId` for a new top-level comment (then `startLine`, `endLine`, and `sourceText` are required); provide it to reply to a top-level comment (one level of nesting only — replying to a reply is rejected).

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `comment` | string | Yes | Comment text, max 2000 chars. May contain mention tokens `<@DisplayName\|userId>` — see the Mentions section; get user IDs from the mention-candidates endpoint |
| `startLine` | integer | Top-level only | Start line of the annotated range (1-based); required unless replying |
| `endLine` | integer | Top-level only | End line of the annotated range, >= `startLine`; required unless replying |
| `sourceText` | string | Top-level only | Snapshot of the annotated source text, max 5000 chars; required unless replying |
| `parentCommentId` | string | Reply only | ID of the top-level comment to reply to; omit for a new top-level comment |

**Response (201):**

```json
{
  "data": {
    "id": "64a7b8c9d1e2f3a4b5c6d7e8",
    "fileId": "64a7b8c9d1e2f3a4b5c6d7d0",
    "comment": "Handle the empty-input case here",
    "startLine": 42,
    "endLine": 45,
    "sourceText": "function processData(input) {...}",
    "status": "pending",
    "resolvedBy": null,
    "parentCommentId": null,
    "author": { "id": "64a7b8c9d1e2f3a4b5c6d7a0", "name": "Jane Doe", "image": "https://..." },
    "createdAt": "2026-07-15T10:00:00Z",
    "updatedAt": "2026-07-15T10:00:00Z"
  }
}
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 201 | Comment created |
| 400 | Missing required fields, invalid line range, or reply-to-a-reply |
| 401 | Invalid or expired token |
| 403 | No edit access to this file |
| 404 | File or parent comment not found |
| 500 | Internal server error |

**Example:**

```bash
# Top-level comment
curl -X POST "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/comments" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Handle the empty-input case", "startLine": 42, "endLine": 45, "sourceText": "function processData(input) {...}"}'

# Reply
curl -X POST "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/comments" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Good point, will fix", "parentCommentId": "64a7b8c9d1e2f3a4b5c6d7e8"}'
```

---

### PATCH /v1/files/{fileId}/comments/{commentId}

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Edit a comment's text or change its status — send `status: "resolved"` with `resolvedBy: "manual"` to resolve a comment, or `status: "pending"` to reopen it. At least one field is required; resolving a top-level comment also resolves its replies.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `comment` | string | No | New comment text, max 2000 chars (author only) |
| `status` | string | No | `pending` or `resolved` |
| `resolvedBy` | string | No | How it was resolved: `manual` or `regeneration`; send with `status: "resolved"` |

**Response (200):** the updated comment in `{ "data": { ... } }`, same shape as create.

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Comment updated |
| 400 | No fields provided or invalid status value |
| 401 | Invalid or expired token |
| 403 | Not the author (text edit) or not authorized (status change) |
| 404 | File or comment not found |
| 500 | Internal server error |

**Example:**

```bash
# Resolve a comment
curl -X PATCH "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/comments/64a7b8c9d1e2f3a4b5c6d7e8" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "resolved", "resolvedBy": "manual"}'
```

---

### DELETE /v1/files/{fileId}/comments/{commentId}

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Delete a comment (soft delete); deleting a top-level comment also removes its replies. Only the comment author or a project owner/admin can delete a comment.

**Response (200):**

```json
{ "success": true }
```

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Comment deleted |
| 400 | Invalid comment ID format |
| 401 | Invalid or expired token |
| 403 | Not the author or a project owner/admin |
| 404 | File or comment not found |
| 500 | Internal server error |

**Example:**

```bash
curl -X DELETE "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/comments/64a7b8c9d1e2f3a4b5c6d7e8" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/files/{fileId}/mention-candidates

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

List the users who can be @mentioned in comments on a file, with the user IDs needed to build mention tokens. Candidates are the users with access to the file, excluding the caller; optionally filter by name or email with `q`.

**Query Parameters:**

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `q` | string | - | Case-insensitive name or email filter |

**Response (200):**

```json
{
  "candidates": [
    {
      "id": "64a7b8c9d1e2f3a4b5c6d7a1",
      "name": "Sam Rivera",
      "email": "sam@example.com",
      "image": "https://..."
    }
  ]
}
```

Returns at most 10 candidates; use `q` to narrow the list when mentioning someone specific.

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Candidates returned |
| 400 | Invalid file ID format |
| 401 | Invalid or expired token |
| 403 | No access to this file |
| 404 | File not found |
| 500 | Internal server error |

**Example:**

```bash
curl "https://data.spuree.com/api/v1/files/64a7b8c9d1e2f3a4b5c6d7d0/mention-candidates?q=sam" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Mentions

To @mention a user in comment text, embed a mention token:

```
<@DisplayName|userId>
```

- `DisplayName` is the user's name as shown to readers (spaces allowed).
- `userId` is the user's 24-hex-character ID from the mention-candidates endpoint.

Example comment text:

```
<@Sam Rivera|64a7b8c9d1e2f3a4b5c6d7a1> can you take a look at this loop?
```

Only users with access to the file can be mentioned; tokens for other users are ignored. Newly mentioned users are notified.

## Comment Fields Reference

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Comment ID |
| `fileId` | string | File ID |
| `comment` | string | Comment text (may contain mention tokens) |
| `startLine` | integer? | Start line (top-level comments only) |
| `endLine` | integer? | End line (top-level comments only) |
| `sourceText` | string? | Annotated source snapshot (top-level comments only) |
| `status` | string | `pending` or `resolved` |
| `resolvedBy` | string? | `manual` or `regeneration` |
| `parentCommentId` | string? | Parent comment ID (replies only) |
| `author` | object? | `{ id, name, image }` |
| `canEdit` | boolean | Whether the caller may edit or delete this comment |
| `replies` | array? | Nested replies (list endpoint only) |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

## Common Patterns

### Review a File

1. Read the file content (**file-management** skill: `GET /v1/files/{fileId}/content`).
2. Leave comments on the lines that need work: `POST /v1/files/{fileId}/comments` with `startLine`/`endLine`/`sourceText`.
3. Share the file link so the author sees the feedback in Studio: `https://studio.spuree.com/file/{fileId}`.

### Resolve Feedback After a Revision

1. `GET /v1/files/{fileId}/comments?status=pending` — list open comments.
2. Address each one in the file.
3. `PATCH /v1/files/{fileId}/comments/{commentId}` with `{"status": "resolved", "resolvedBy": "manual"}`.

### Mention a Collaborator

1. `GET /v1/files/{fileId}/mention-candidates?q=<name>` — find the user's `id`.
2. Include `<@Their Name|id>` in the comment text when creating or editing a comment.

## Error Handling

| Error | Cause | Resolution |
| --- | --- | --- |
| 400 (missing fields) | Top-level comment without `startLine`/`endLine`/`sourceText` | Include the line range and source snapshot, or add `parentCommentId` to reply |
| 400 (nested reply) | `parentCommentId` points at a reply | Reply to the top-level comment instead |
| 401 (unauthorized) | Expired or invalid token | Refresh via the **authentication** skill |
| 403 (forbidden) | View-only access (create), or not the author/moderator (edit, delete) | Ask for edit access, or only modify your own comments |
| 404 (not found) | File, comment, or parent comment missing or deleted | Verify the IDs |
