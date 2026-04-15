---
name: project-invitation
description: Manage project sharing invitations in Spuree — list, accept, decline, cancel, and resend invitations for non-workspace members
---

# Project Invitations

## Overview

When sharing a project with a user who is **not** a workspace member, Spuree creates a pending invitation instead of adding them directly. This skill manages those invitations.

> **Direct sharing** (target is already a workspace member) is handled immediately by `POST /v1/projects/{projectId}/share` in the **project-management** skill — no invitation is created.

Use this skill when an agent needs to:

- Check pending invitations for the current user
- Accept or decline an invitation
- List, cancel, or resend invitations for a project

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

## Base URL

```
https://data.spuree.com/api/v1/projects
```

## Invitation Object

```json
{
  "id": "64a7b8c9d1e2f3a4b5c6d7e8",
  "projectId": "64a7b8c9d1e2f3a4b5c6d7e9",
  "projectName": "My Animation Project",
  "workspaceId": "64a7b8c9d1e2f3a4b5c6d7f0",
  "invitedEmail": "new-user@example.com",
  "invitedBy": "owner@example.com",
  "status": "pending",
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": "2024-01-22T10:00:00Z"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Invitation ObjectId |
| `projectId` | string | Project ObjectId |
| `projectName` | string? | Project name |
| `workspaceId` | string | Workspace ObjectId |
| `invitedEmail` | string | Invited user's email |
| `invitedBy` | string | Inviter's email |
| `status` | string | `pending`, `accepted`, `declined`, `expired` |
| `createdAt` | datetime | Creation timestamp |
| `expiresAt` | datetime | Expiration (7 days after creation or last resend) |

## Endpoints

### GET /v1/projects/invitations/pending

List pending invitations for the current user.

**Response:** `{ "invitations": [ InvitationObject, ... ] }`

```bash
curl "https://data.spuree.com/api/v1/projects/invitations/pending" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects/invitations/{token}/accept

Accept an invitation. The user is added to the project's `sharedWith` list and automatically joined to the workspace if not already a member.

**Response:**

```json
{
  "messageCode": "success",
  "projectId": "...",
  "projectName": "My Animation Project",
  "workspaceId": "..."
}
```

| Code | Description |
| --- | --- |
| 200 | Accepted — user added to project and workspace |
| 403 | Token does not belong to the authenticated user |
| 404 | Invitation not found or expired |

```bash
curl -X POST "https://data.spuree.com/api/v1/projects/invitations/{token}/accept" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects/invitations/{token}/decline

Decline an invitation.

**Response:** `{ "messageCode": "success", "projectId": "..." }`

```bash
curl -X POST "https://data.spuree.com/api/v1/projects/invitations/{token}/decline" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/projects/{projectId}/invitations

List all invitations for a project (all statuses).

**Authorization:** Owner or shared user.

**Response:** `{ "invitations": [ InvitationObject, ... ] }`

```bash
curl "https://data.spuree.com/api/v1/projects/{projectId}/invitations" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### DELETE /v1/projects/{projectId}/invitations/{invitationId}

Cancel a pending invitation.

**Authorization:** Project owner or original inviter.

**Response:** `{ "messageCode": "success", "projectId": "..." }`

```bash
curl -X DELETE "https://data.spuree.com/api/v1/projects/{projectId}/invitations/{invitationId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/projects/{projectId}/invitations/{invitationId}/resend

Resend an invitation — resets expiry to 7 days from now.

**Authorization:** Owner or shared user.

**Response:** `{ "messageCode": "success", "projectId": "..." }`

```bash
curl -X POST "https://data.spuree.com/api/v1/projects/{projectId}/invitations/{invitationId}/resend" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Common Patterns

### Invite a Non-Member

1. **Share the project** (project-management skill):
   ```
   POST /v1/projects/{id}/share { "email": "new-user@example.com" }
   → { type: "invitation", projectId: "..." }
   ```
2. The target user checks their pending invitations:
   ```
   GET /v1/projects/invitations/pending
   ```
3. Accept:
   ```
   POST /v1/projects/invitations/{token}/accept
   ```

## Error Handling

| Code | Description |
| --- | --- |
| 200 | Success |
| 400 | Invalid token or ID format |
| 401 | Invalid or expired auth token |
| 403 | Not authorized (wrong user, not owner/inviter) |
| 404 | Invitation not found, expired, or already actioned |
| 409 | Invitation already pending for this user |
| 500 | Internal server error |
