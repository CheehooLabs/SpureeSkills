---
name: file-comment
description: Add, list, resolve, update, and delete review comments on files — anchored to a line range, to a moment on a video's timeline, or to a still — including marks drawn on the picture, threaded replies and @mentions
---

# File Comments

## Overview

Review comments on files. A comment is anchored to one of three things: a line range, preserving the annotated source text; a millisecond offset on a video's timeline; or a still, which has no timeline at all. A video or image comment may also carry a **drawing** — marks placed on the picture itself. Supports one level of threaded replies, pending/resolved status tracking, and @mentions of users with access to the file.

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
https://data.spuree.com/api/v1/files/{fileId}
```

Comment endpoints live under `/comments`; the mention-candidates endpoint is a sibling at `/mention-candidates`. Each endpoint heading below shows the full path.

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
          "fileId": "64a7b8c9d1e2f3a4b5c6d7d0",
          "comment": "Good point, will fix",
          "status": "pending",
          "resolvedBy": null,
          "parentCommentId": "64a7b8c9d1e2f3a4b5c6d7e8",
          "author": { "id": "...", "name": "...", "image": "..." },
          "canEdit": false,
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

Replies are nested under their parent's `replies` array — they are not top-level items. `canComment` is `false` when the caller has view-only access to the file; `canEdit` marks the comments the caller may edit or delete — their own, or any comment if they are a project owner/admin — but only with edit access to the file (a view-only caller gets `canEdit: false` on every comment, including their own).

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

Add a review comment to a file, or reply to an existing comment thread. Omit `parentCommentId` for a new top-level comment — then supply **either** the line trio (`startLine`, `endLine`, `sourceText`) **or** an `anchor` for a video or image, never both; provide `parentCommentId` to reply to a top-level comment (one level of nesting only — replying to a reply is rejected). A reply carries neither the line trio nor an `anchor`: it inherits its parent's, and sending one is rejected (422) rather than stored, so the anchor on a thread has exactly one author. To @mention someone, embed `<@DisplayName|userId>` in the comment text — get user IDs from the mention-candidates endpoint.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `comment` | string | Yes | Comment text, max 2000 chars. May contain @mention tokens — see the Mentions section; get user IDs from the mention-candidates endpoint |
| `startLine` | integer | Line anchors only | Start line of the annotated range (1-based). Required on a top-level comment without an `anchor`; omit it when sending an `anchor` or replying |
| `endLine` | integer | Line anchors only | End line of the annotated range, >= `startLine`. Required on a top-level comment without an `anchor`; omit it when sending an `anchor` or replying |
| `sourceText` | string | Line anchors only | Snapshot of the annotated source text, max 5000 chars. Required on a top-level comment without an `anchor`; omit it when sending an `anchor` or replying |
| `parentCommentId` | string | Reply only | ID of the top-level comment to reply to; omit for a new top-level comment |
| `anchor` | object | Top-level only | `{"kind": "time", "startMs": <int>, "endMs": <int>}` for a video, or `{"kind": "image"}` for a still. Replaces the line trio, which must then be omitted. `endMs` defaults to `startMs` (a point comment); an `image` anchor takes neither `startMs` nor line fields; a reply takes no `anchor` at all |
| `anchor.drawing` | array | Optional | Marks on the picture. Read it back to see what a reviewer circled; **do not author one** — see Drawings below |

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
    "anchor": { "kind": "line", "startLine": 42, "endLine": 45 },
    "fileVersion": "<file checksum when the comment was written>",
    "status": "pending",
    "resolvedBy": null,
    "parentCommentId": null,
    "author": { "id": "64a7b8c9d1e2f3a4b5c6d7a0", "name": "Jane Doe", "image": "https://..." },
    "canEdit": true,
    "newlyMentioned": [],
    "createdAt": "2026-07-15T10:00:00Z",
    "updatedAt": "2026-07-15T10:00:00Z"
  }
}
```

`newlyMentioned` lists the user IDs newly @mentioned by this write — those users are notified.

**Status Codes:**

| Code | Description |
| --- | --- |
| 201 | Comment created |
| 400 | Reply to a reply (nesting is one level only), or parent comment not found |
| 401 | Invalid or expired token |
| 403 | No edit access to this file |
| 404 | File not found |
| 422 | Invalid body — a top-level comment with neither the full line trio (`startLine`, `endLine`, `sourceText`) nor an `anchor`; line fields sent with a `time` or `image` anchor; an `anchor` on a reply; a `time` anchor without `startMs`, or `startMs`/`endMs` on an `image` anchor; `endLine` < `startLine` or `endMs` < `startMs`; a drawing on a line anchor or with coordinates outside 0..1; or `comment`/`sourceText` over its length limit |
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

Edit a comment's text or change its status — send `status: "resolved"` to resolve a comment, or `status: "pending"` to reopen it. At least one field is required; a status change on a top-level comment cascades to its replies. Any user with edit access to the file may change status; only the comment author or a project owner/admin may edit the text.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `comment` | string | No | New comment text, max 2000 chars (author or a project owner/admin only) |
| `status` | string | No | `pending` or `resolved` |
| `resolvedBy` | string | No | How it was resolved: `manual` or `regeneration`. Optional even when resolving — if omitted the field keeps its previous value; send `manual` when resolving so the resolution source is recorded |

**Response (200):** the updated comment in `{ "data": { ... } }`, same shape as create.

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Comment updated |
| 400 | No fields provided, or invalid comment ID format |
| 401 | Invalid or expired token |
| 403 | No edit access to this file, or a text edit by someone other than the author or a project owner/admin |
| 404 | File or comment not found |
| 422 | Invalid `status` or `resolvedBy` value |
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

Returns at most 10 candidates; use `q` to narrow the list when mentioning someone specific. `image` is present only for users who have a profile picture.

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

## Time Anchors (video)

A video has no lines, so a comment on one is anchored to a millisecond offset instead:

```bash
curl -X POST "https://data.spuree.com/api/v1/files/{fileId}/comments" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "the arm pops here", "anchor": {"kind": "time", "startMs": 83400}}'
```

Milliseconds are canonical. Frame numbers are a display convention only — a file's fps comes from the annotation pipeline, is optional, and may be fractional (23.976), so nothing derived from it is stored. Convert for display with `frame = floor(startMs / 1000 * fps)` — **floor, not round**. A frame occupies an interval, so the frame on screen at a given moment is the one whose interval contains it; rounding names the next frame for anything past the halfway point (83 400ms at 24fps is inside frame 2001, but rounds to 2002).

Sending `startLine`/`endLine`/`sourceText` alongside a time anchor is rejected (422) rather than ignored, so a mistake surfaces instead of silently storing a different comment than intended.

Every top-level comment in a list response carries an `anchor`. Comments written before time anchors existed report `{"kind": "line", ...}` synthesized from their line fields, so one code path reads both. Video comments come back in timeline order.

A timecode means something only against the cut it was written on. Comments record the file version they were left against in `fileVersion` (the file's checksum at write time); a replaced video may leave older timecodes pointing at different shots, and normalized coordinates stay in range across a re-upload, so a mark can silently land on whatever now occupies that moment. Compare `fileVersion` against the file's current checksum before trusting a mark's position. It is absent on comments written before the field existed — treat that as unknown, never as a match.

## Image Anchors (stills)

A still has no timeline, so its comment carries only the anchor kind — and, if the reviewer drew one, a drawing:

```bash
curl -X POST "https://data.spuree.com/api/v1/files/{fileId}/comments" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"comment": "the crop is tight on the left", "anchor": {"kind": "image"}}'
```

Sending `startMs`/`endMs` on an `image` anchor is rejected (422), as is sending line fields. A still has no zero, so a timecode on one would be a number nobody wrote — the refusal exists so a client that picked the wrong `kind` finds out rather than storing a comment that claims a moment.

Image comments come back in creation order. A video's come back in timeline order: there is a timeline to walk, and there isn't one here.

## Drawings

A video or image comment may carry marks drawn on the picture — a rectangle, ellipse, arrow or freehand stroke:

```jsonc
"anchor": {
  "kind": "time", "startMs": 83400,
  "drawing": [
    { "type": "ellipse", "color": "#ff3b30", "points": [[0.43, 0.13], [0.58, 0.42]] },
    { "type": "arrow",   "color": "#34c759", "points": [[0.80, 0.81], [0.54, 0.57]] }
  ]
}
```

Coordinates are normalized 0..1 against the picture's **displayed content box** — the letterboxed area the picture occupies, not the element around it. That is what lets a mark survive a resize, a different screen, or a re-encode at another resolution. `rect`, `ellipse` and `arrow` take exactly two points (opposite corners, the bounding box, or tail-then-head); `path` takes two or more. Colour is `#rrggbb` and belongs to the shape, not the comment, so one note can mark two things in two colours. At most 24 shapes per drawing and 256 points per shape.

**Read drawings; do not write them.** Every field above is returned on a read, and a client that renders comments should render the marks. But an agent composing a comment cannot see the frame, so any coordinates it emits are a guess dressed as a measurement — a circle placed confidently over the wrong part of the picture is worse feedback than no circle at all. Leave a time- or image-anchored comment with words, and let a human draw.

Out-of-range coordinates are rejected (422) rather than clamped: a value outside 0..1 means the caller's content-box maths was wrong, and pinning the mark to a border would hide that from every future reader.

A drawing on a `line` anchor is refused — text has no picture to draw on.

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
| `startLine` | integer? | Start line (line-anchored top-level comments only) |
| `endLine` | integer? | End line (line-anchored top-level comments only) |
| `sourceText` | string? | Annotated source snapshot (line-anchored top-level comments only) |
| `anchor` | object? | Where the comment points: `{"kind": "line", "startLine", "endLine"}`, `{"kind": "time", "startMs", "endMs"}`, or `{"kind": "image"}`. Always present on a top-level comment — line anchors are derived for comments written before time anchors existed. Absent on replies, which inherit their parent's |
| `anchor.drawing` | array? | Marks on the picture, on a `time` or `image` anchor. Each is `{ type, color, points }` with normalized 0..1 coordinates — see Drawings |
| `fileVersion` | string? | The file's checksum when the comment was written. Compare against the file's current checksum before trusting a mark's position. Absent on older comments, which means unknown, not matching |
| `status` | string | `pending` or `resolved` |
| `resolvedBy` | string? | `manual` or `regeneration` |
| `parentCommentId` | string? | Parent comment ID (replies only) |
| `author` | object? | `{ id, name, image }` |
| `canEdit` | boolean | Whether the caller may edit or delete this comment |
| `authorKind` | string? | `agent` when the comment was written through an API key or OAuth client on someone's behalf; absent or `human` otherwise (pre-existing, ENG-6140) |
| `newlyMentioned` | array? | User IDs newly @mentioned by this write (create and update responses only) |
| `replies` | array? | Nested replies (list endpoint only) |
| `createdAt` | datetime | Creation timestamp |
| `updatedAt` | datetime | Last update timestamp |

## Common Patterns

### Review a File

1. Read the file content (**file-management** skill: `GET /v1/files/{fileId}/content`).
2. Leave comments on the lines that need work: `POST /v1/files/{fileId}/comments` with `startLine`/`endLine`/`sourceText`.
3. Share the file link so the author sees the feedback in Studio: `https://studio.spuree.com/files/{fileId}`.

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
| 422 (invalid body) | A top-level comment with neither the line trio nor an `anchor`, line fields sent together with a `time` or `image` anchor, an `anchor` on a reply, an anchor field that does not fit its `kind`, or a field over its length limit | Read the error detail, then send exactly one anchor form for the file: the full line trio for text, a `time` anchor for a video, or an `image` anchor for a still — never line fields alongside an `anchor`. For a reply, send `parentCommentId` and no anchor |
| 400 (nested reply) | `parentCommentId` points at a reply | Reply to the top-level comment instead |
| 400 (bad parent) | `parentCommentId` doesn't match a top-level comment on this file | Verify the parent comment id |
| 401 (unauthorized) | Expired or invalid token | Refresh via the **authentication** skill |
| 403 (forbidden) | View-only access (create, status change), or not the author/moderator (text edit, delete) | Ask for edit access, or only modify your own comments |
| 404 (not found) | File or comment missing or deleted | Verify the IDs |
