---
name: workspace-management
description: Read which workspaces the caller belongs to, their role in each and which workspace pays for new work; list the members of a Spuree workspace, add a member with a role (admin, member, guest), change a member's role, or remove a member
---

# Workspace Management

## Overview

Spuree is an agent-friendly cloud storage. Every project lives in a **workspace**, and a workspace has **members**, each holding one role. This skill manages those members. Project-level access (who may read or edit one project) is a separate layer: see the **project-management** skill.

Use this skill when an agent needs to:

- Find out which workspaces the caller can work in, their role in each, and which workspace pays for and receives new work
- See who is in a workspace and what role each person holds
- Add an existing Spuree user to a workspace with a role
- Promote or demote a member (for example `member` → `admin`)
- Remove a member from a workspace, or leave one

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

With an API key, the workspace must belong to one of the organizations the key is scoped to; otherwise every call answers 403. `GET /v1/me/permissions` is the exception: it answers 200 and leaves out what the key cannot see.

## Base URL

```
https://data.spuree.com/api/v1
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

Where to get a `workspaceId`: `GET /v1/me/permissions` below (`workspaces[].id`, works with an API key), the auth response's `user.workspaces[].workspaceId` (**authentication** skill) or `GET /v1/projects` (**project-management** skill).

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

### GET /v1/me/permissions

Who the caller is, every workspace they hold a seat in with their role there, the organizations those workspaces belong to, and which workspace pays for their generation. Read it once at the start of a session, before creating anything, and again when the person says their workspaces changed. Over the MCP connector the same read is the `account_context` tool, which applies the rules below for you.

No parameters: the credential names the caller. Any role may call it, a guest included.

**Response:**

```json
{
  "user": {
    "id": "64a7b8c9d1e2f3a4b5c6d7e8",
    "email": "user@example.com",
    "name": "User Name",
    "image": null
  },
  "organizations": [
    { "id": "64a7b8c9d1e2f3a4b5c6d7f0", "name": "Acme", "role": "member", "appConfig": { "billingEnabled": true } },
    { "id": "64a7b8c9d1e2f3a4b5c6d7f3", "name": "Personal", "role": "member", "appConfig": null }
  ],
  "workspaces": [
    { "id": "64a7b8c9d1e2f3a4b5c6d7f1", "name": "Acme Studio", "organizationId": "64a7b8c9d1e2f3a4b5c6d7f0", "role": "member", "isPersonal": false },
    { "id": "64a7b8c9d1e2f3a4b5c6d7f2", "name": "My Workspace", "organizationId": "64a7b8c9d1e2f3a4b5c6d7f3", "role": "owner", "isPersonal": true }
  ],
  "creatorEnabled": true,
  "timelineEditingEnabled": false,
  "billingWorkspaceId": "64a7b8c9d1e2f3a4b5c6d7f1"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `user.id` | string | Caller's user ObjectId |
| `user.email` | string | Caller's email |
| `user.name` | string? | Display name; `null` when the account has none |
| `user.image` | string? | Avatar URL; `null` when the account has none |
| `organizations[].id` | string | Organization ObjectId |
| `organizations[].name` | string | Organization name |
| `organizations[].role` | string? | Caller's role in the organization: `owner`, `admin` or `member`; `null` when the caller reaches the organization only through a workspace in it |
| `organizations[].appConfig` | object? | The organization's boolean feature switches, or `null` when it has none. Spuree Studio's own; nothing in this skill depends on it |
| `workspaces[].id` | string | Workspace ObjectId — the `workspaceId` every other endpoint takes |
| `workspaces[].name` | string | Workspace name |
| `workspaces[].organizationId` | string | The workspace's organization; its name is in `organizations[]`. A personal workspace has one too, so tell personal from organization workspaces by `isPersonal`, not by this field |
| `workspaces[].role` | string | Caller's role in the workspace: `owner`, `admin`, `member` or `guest` (see **Workspace roles**) |
| `workspaces[].isPersonal` | boolean | `true` for the caller's personal workspace (at most one) |
| `creatorEnabled` | boolean | Whether the caller's account may run Spuree's generation APIs |
| `timelineEditingEnabled` | boolean | Whether this Spuree deployment has the video timeline editor on; a deployment switch, not a per-user grant |
| `billingWorkspaceId` | string? | The workspace whose credits pay for the caller's generation, always one of `workspaces[].id`; `null` when unknown |

`workspaces[]` holds every workspace the caller is a member of, in any role. Workspaces in an organization the caller is suspended from, and deleted workspaces, are left out. With an organization-scoped API key, `workspaces[]` and `organizations[]` hold only the key's organizations, and `billingWorkspaceId` is `null` when the paying workspace lies outside them; a key that can see no workspace gets `200` with empty lists, not `403`.

**Which workspace pays, and where new work goes.** The paying workspace is the `workspaces[]` entry whose `id` equals `billingWorkspaceId`. Its `isPersonal` says whose account the person works on: `true` is their own, `false` is an organization's, whose credits and projects the work belongs to. When the paying workspace cannot cover a charge, that one charge falls back to the caller's personal workspace. The caller can create projects and brands in a workspace when their role there is `owner`, `admin` or `member`, not as `guest`. Decide where new work goes from the table, then tell the person which workspace you are using and who pays:

| Case | Where new work goes |
| --- | --- |
| The paying workspace is personal | There. Name any other workspace the caller can create in, so they can pick it instead |
| The paying workspace is an organization's, and it is the only organization workspace the caller can create in | There. Name the personal workspace, and any other workspace they can create in, as alternatives |
| The paying workspace is an organization's, and the caller can create in more than one organization workspace | Ask which workspace, listing every workspace they can create in |
| The paying workspace is one the caller cannot create in (a `guest` seat) | Ask which workspace, listing the ones they can create in; when there is none, tell them to ask a workspace owner for the `member` role |
| `billingWorkspaceId` is `null` | One workspace they can create in: use it. More than one: ask. None: they cannot create projects yet |

| Code | Description |
| --- | --- |
| 200 | Memberships returned, also when both lists are empty |
| 401 | Missing, invalid or expired credentials, or the credential's user account no longer exists |

```bash
curl "https://data.spuree.com/api/v1/me/permissions" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

---

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

### Pick the workspace for new work

1. `GET /v1/me/permissions`.
2. Find the paying workspace: the `workspaces[]` entry whose `id` equals `billingWorkspaceId`.
3. Apply the **Which workspace pays** table. When it says ask, ask before creating anything.
4. Pass the chosen workspace's `id` as `workspaceId` to `POST /v1/projects` (**project-management** skill), and tell the person which workspace you used and who pays.

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
