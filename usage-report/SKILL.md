---
name: usage-report
description: Retrieve daily usage reports for a workspace or organization, broken down by API key, MCP client, and user, with allowance tracking
---

# Usage Report

## Overview

Spuree tracks API operations, searches, storage, and data transfer per workspace and organization. This skill retrieves a usage report for a date range, broken down by source (API keys, MCP clients, and users) with daily totals and the top endpoints called. Allowance limits, when configured, are included so an agent can compare consumption against quotas.

Use this skill when an agent needs to:

- Check how many API operations or searches a workspace or organization has consumed
- See which API keys or MCP clients are driving usage
- Compare current usage against configured allowance limits
- Review storage and transfer consumption for a billing period

## Authentication

```
Authorization: Bearer $SPUREE_ACCESS_TOKEN
```

Or: `X-API-Key: $SPUREE_API_KEY`. See the **authentication** skill.

With an API key, the workspace or organization must belong to one of the organizations the key is scoped to; otherwise every call answers 403.

## Base URL

```
https://data.spuree.com/api/v1
```

## Endpoints

### GET /v1/workspaces/{workspaceId}/usage-report

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Retrieve a usage report for a single workspace. The caller must be a workspace owner or admin.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string (query) | No | Start date inclusive, `yyyy-MM-dd` UTC. Defaults to the first day of the current UTC month. |
| `to` | string (query) | No | End date inclusive, `yyyy-MM-dd` UTC. Defaults to today in UTC. |

The maximum date range is 366 days. When both `from` and `to` are omitted the default period is the current UTC calendar month to date.

**Response:**

```json
{
  "scope": { "type": "workspace", "id": "64a7b8c9d1e2f3a4b5c6d7e8" },
  "organizationId": "64a7b8c9d1e2f3a4b5c6d7e8",
  "period": { "start": "2026-10-01", "end": "2026-10-23" },
  "allowances": {
    "apiOperations": { "period": 1284, "limit": 50000 },
    "searches": { "period": 37, "limit": 5000 },
    "storageBytes": { "now": 8493210624, "asOf": "2026-10-22", "limit": null },
    "transferBytes": { "period": 1073741824, "limit": null, "note": "CDN-served" }
  },
  "bySource": {
    "apiKeys": [
      {
        "apiKeyId": "key_abc123",
        "name": "CI pipeline",
        "status": "active",
        "owner": { "userId": "64a7b8c9d1e2f3a4b5c6d7e8", "name": "Alex", "email": "alex@example.com" },
        "organizations": [{ "id": "64a7b8c9d1e2f3a4b5c6d7e9", "name": "Acme" }],
        "createdAt": "2026-09-15T08:00:00Z",
        "lastUsedAt": "2026-10-23T14:32:00Z",
        "usage": { "api": 1200, "search": 30, "total": 1230 }
      }
    ],
    "mcp": [
      {
        "clientId": "anthropic-claude-code",
        "user": { "userId": "64a7b8c9d1e2f3a4b5c6d7e9", "name": "Jo", "email": "jo@example.com" },
        "usage": { "api": 84, "search": 7, "total": 91 },
        "lastSeenDay": "2026-10-22"
      }
    ],
    "users": [
      {
        "user": { "userId": "64a7b8c9d1e2f3a4b5c6d7e9", "name": "Jo", "email": "jo@example.com" },
        "usage": { "api": 42, "search": 3, "total": 45 },
        "lastSeenDay": "2026-10-21",
        "countedAgainstAllowance": false
      }
    ]
  },
  "days": [
    { "day": "2026-10-22", "api": 640, "search": 18, "total": 658 },
    { "day": "2026-10-23", "api": 644, "search": 19, "total": 663 }
  ],
  "topEndpoints": [
    { "method": "GET", "pathTemplate": "/v1/files/{fileId}", "calls": 820, "errors": 3 },
    { "method": "POST", "pathTemplate": "/v1/files", "calls": 410, "errors": 0 }
  ],
  "excludedAmbiguousUsers": 2
}
```

`allowances.apiOperations.period` and `allowances.searches.period` count API key and MCP usage only; user (JWT/OAuth) usage is reported in `bySource.users` but never counted against the allowance. `days` likewise includes only API key and MCP sources. `topEndpoints` merges API key and MCP subjects, sorted by `calls` descending, up to 20 entries.

**Attribution.** API-key usage counts toward the scope by the key's owner membership or its explicit organization scope. MCP and signed-in (JWT) usage count only for users whose non-personal workspace memberships all fall inside this workspace or organization; users who also belong to workspaces outside the scope are excluded and appear only in `excludedAmbiguousUsers`. Signed-in user usage is reported in `bySource.users` but is never counted against the allowance.

| Code | Description |
| --- | --- |
| 200 | Usage report returned |
| 401 | Missing or invalid credentials |
| 403 | Caller is not a workspace owner or admin, or the workspace is outside the API key's organization scope |
| 404 | Workspace not found or deleted |
| 422 | Invalid date format or date range exceeds 366 days |
| 503 | Storage or transfer data temporarily unavailable |

```bash
curl "https://data.spuree.com/api/v1/workspaces/{workspaceId}/usage-report?from=2026-10-01&to=2026-10-23" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

```bash
curl "https://data.spuree.com/api/v1/workspaces/{workspaceId}/usage-report" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### GET /v1/organizations/{organizationId}/usage-report

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Retrieve a usage report for an entire organization. The caller must be an organization admin.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `from` | string (query) | No | Start date inclusive, `yyyy-MM-dd` UTC. Defaults to the first day of the current UTC month. |
| `to` | string (query) | No | End date inclusive, `yyyy-MM-dd` UTC. Defaults to today in UTC. |

The maximum date range is 366 days. When both `from` and `to` are omitted the default period is the current UTC calendar month to date.

The response shape is the same as the workspace route. `scope.type` is `"organization"` and all usage across the organization's workspaces is aggregated.

| Code | Description |
| --- | --- |
| 200 | Usage report returned |
| 401 | Missing or invalid credentials |
| 403 | Caller is not an organization admin, or the organization is outside the API key's organization scope |
| 404 | Organization not found |
| 422 | Invalid date format or date range exceeds 366 days |
| 503 | Storage or transfer data temporarily unavailable |

```bash
curl "https://data.spuree.com/api/v1/organizations/{organizationId}/usage-report?from=2026-10-01&to=2026-10-23" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

```bash
curl "https://data.spuree.com/api/v1/organizations/{organizationId}/usage-report" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

## Error Handling

| Code | Meaning | Action |
| --- | --- | --- |
| 401 | Missing or invalid credentials | Refresh the token or check the API key |
| 403 | Insufficient role or scope | The caller needs workspace owner/admin or organization admin; for API keys the target must be within the key's organization scope |
| 404 | Workspace or organization not found | Verify the id |
| 422 | Invalid period | Check date format (`yyyy-MM-dd`) and ensure the range is at most 366 days |
| 503 | S3 report read failed | Storage or transfer figures are temporarily unavailable; retry later |
