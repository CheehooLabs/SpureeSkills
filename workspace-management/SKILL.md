---
name: workspace-management
description: List the members of a Spuree workspace, add a member with a role (admin, member, guest), change a member's role, or remove a member
---

# Workspace Management

## Overview

Spuree is an agent-friendly cloud storage. Every project lives in a **workspace**, and a workspace has **members**, each holding one role. This skill manages those members. Project-level access (who may read or edit one project) is a separate layer: see the **project-management** skill.

Use this skill when an agent needs to:

- See who is in a workspace and what role each person holds
- Add an existing Spuree user to a workspace with a role
- Promote or demote a member (for example `member` → `admin`)
- Remove a member from a workspace, or leave one

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

With an API key, the workspace must belong to one of the organizations the key is scoped to; otherwise every call answers 403.

## Base URL

```
https://data.spuree.com/api/v1/workspaces
```

## Workspace roles

| Role | What it allows |
| --- | --- |
| `owner` | Everything, including removing admins. Every workspace has at least one owner. |
| `admin` | Manage members below admin, and everything a member can do |
| `member` | Create and work on projects in the workspace |
| `guest` | Access only the projects explicitly shared with them; cannot list the workspace's members |

Who may do what to whom:

| Action | Owner | Admin | Member / Guest |
| --- | --- | --- | --- |
| List members | Yes | Yes | Member yes, guest no |
| Add a member as `admin`, `member` or `guest` | Yes | Yes | No |
| Change a member's or guest's role | Yes | Yes | No |
| Change an admin's role | Yes | No | No |
| Change the owner's role | No | No | No |
| Remove a member or guest | Yes | Yes | No |
| Remove an admin | Yes | No | No |
| Remove the last owner | No | No | No |
| Remove yourself | Yes (unless last owner) | Yes | Yes |

`owner` is never granted through this API. To bring in someone who has **no Spuree account yet**, share a project with them (`POST /v1/projects/{projectId}/share`, **project-management** skill): that creates an invitation, and accepting it joins them to the workspace as `member`.

Where to get a `workspaceId`: the auth response's `user.workspaces[].workspaceId` (**authentication** skill) or `GET /v1/projects` (**project-management** skill).

## Member Object

```json
{
  "userId": "64a7b8c9d1e2f3a4b5c6d7e8",
  "email": "colleague@example.com",
  "name": "Colleague Name",
  "image": "https://...",
  "role": "member"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `userId` | string | User ObjectId — the id to pass in `…/members/{userId}` |
| `email` | string | User's email |
| `name` | string? | Display name |
| `image` | string? | Avatar URL |
| `role` | string | `owner`, `admin`, `member`, or `guest` |

## Endpoints

### GET /v1/workspaces/{workspaceId}/members

List the workspace's members with their roles. Any member except a guest.

**Response:** `{ "members": [ MemberObject, ... ] }`

| Code | Description |
| --- | --- |
| 200 | Members returned |
| 403 | Caller is not a member, is a guest, or the workspace is outside the API key's organizations |

```bash
curl "https://data.spuree.com/api/v1/workspaces/{workspaceId}/members" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### POST /v1/workspaces/{workspaceId}/members

Add an existing Spuree user to the workspace with a role. **Owner or admin.**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | Email of the user to add. They must already have a Spuree account. |
| `role` | string | No | `member` (default), `admin`, or `guest` |

**Response (201):** `{ "workspaceId": "...", "member": MemberObject }`

| Code | Description |
| --- | --- |
| 201 | Member added |
| 403 | Caller is not an owner or admin |
| 404 | No Spuree user has that email — share a project with them instead, which invites them |
| 409 | Already a member — use `PATCH …/members/{userId}` to change their role |
| 422 | `role` is not `admin`, `member` or `guest` |

```bash
curl -X POST "https://data.spuree.com/api/v1/workspaces/{workspaceId}/members" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "colleague@example.com", "role": "member"}'
```

---

### PATCH /v1/workspaces/{workspaceId}/members/{userId}

Change a member's role. **Owner, or an admin changing someone below admin.** The owner's role cannot be changed.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `role` | string | Yes | New role: `admin`, `member`, or `guest` |

**Response:** `{ "workspaceId": "...", "member": MemberObject, "previousRole": "member" }`. Asking for the role the member already holds is a 200 with `previousRole` equal to `member.role`. The member and the workspace's admins are notified of a change, as they would be for a change made in Spuree Studio.

| Code | Description |
| --- | --- |
| 200 | Role updated |
| 400 | `userId` is not a valid id (`me` is not accepted here) |
| 403 | Caller is not an owner or admin, the target is the owner, or an admin tried to change another admin |
| 404 | Target is not a member of this workspace |
| 422 | `role` is not `admin`, `member` or `guest` |

```bash
curl -X PATCH "https://data.spuree.com/api/v1/workspaces/{workspaceId}/members/{userId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "admin"}'
```

---

### DELETE /v1/workspaces/{workspaceId}/members/{userId}

Remove a member from the workspace. Pass the literal `me` as `userId` to leave the workspace yourself.

**Response:** `{ "messageCode": "success", "message": "...", "workspaceId": "...", "userId": "..." }`

| Code | Description |
| --- | --- |
| 200 | Member removed |
| 403 | Caller may not remove this member (not owner/admin, or an admin removing an owner or another admin) |
| 404 | Target is not a member of this workspace |
| 409 | Target is the last owner of the workspace |

```bash
curl -X DELETE "https://data.spuree.com/api/v1/workspaces/{workspaceId}/members/{userId}" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Common Patterns

### Onboard a colleague who already has an account

1. `GET /v1/workspaces/{workspaceId}/members` — confirm they are not already a member.
2. `POST /v1/workspaces/{workspaceId}/members` with `{"email": "...", "role": "member"}`.
3. Share the projects they need with `POST /v1/projects/{projectId}/share` (**project-management** skill). Workspace membership alone does not open any private project.

### Onboard someone with no Spuree account

Share a project with them (**project-management** skill). They receive an invitation; accepting it creates their membership as `member`. There is no workspace-level invitation endpoint.

### Promote a member to admin

`PATCH /v1/workspaces/{workspaceId}/members/{userId}` with `{"role": "admin"}`. Read `userId` off the members list; it is the user's id, not an email.

## Error Handling

| Code | Meaning | Action |
| --- | --- | --- |
| 400 | Invalid `workspaceId` or `userId` | Check the ids; both are 24-character ObjectIds |
| 401 | Missing or invalid credentials | Refresh the token or check the API key |
| 403 | Role rule refused the action, or workspace outside the API key's scope | Read the role matrix above; ask the workspace owner to act |
| 404 | User or membership not found | For a new person, share a project instead |
| 409 | Already a member, or last owner | Use PATCH to change a role; transfer ownership in Spuree Studio before removing an owner |
