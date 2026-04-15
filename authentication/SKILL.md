---
name: authentication
description: Obtain and refresh JWT access tokens, and manage API keys for the Spuree V1 API
---

# Authentication

## Overview

Spuree is an agent-friendly cloud storage. Projects contain folders (nestable) and files at any level. Authenticate with a JWT token or API key to access all V1 endpoints.

Tokens follow OAuth2 conventions and are issued as NextAuth-compatible JWTs.

Use this skill when an agent needs to:

- Set up API access for the first time
- Log in with email and password to get an access token
- Refresh an expired access token using a refresh token
- Exchange an authorization code for tokens (browser SSO flow)
- Create, list, or revoke API keys

## Getting Started

First-time setup — three options:

### Option A: User creates API key from web UI

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com)
2. Go to [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys) and create a key. **Save it immediately** — the key is only shown once.
3. Set the environment variable:
   ```bash
   export SPUREE_API_KEY="<your-api-key>"
   ```

### Option B: Agent logs in with email and password

If the user provides their email and password, the agent can set up its own API key:

1. Log in with `POST /auth/token` to get a temporary JWT
2. Create an API key with `POST /v1/api-keys`
3. Store the key in `$SPUREE_API_KEY`

### Option C: Agent opens browser for SSO login

The agent can authenticate without the user sharing their password:

1. Start a local HTTP server on an ephemeral port (49152–65535) to receive the callback.
2. Open the user's browser to the Spuree sign-in page with `source=api` and the port:
   ```
   https://studio.spuree.com/auth/signin?source=api&port=<port>
   ```
   The user logs in via Google SSO (or email/password) in the browser.
3. After login, Spuree redirects to `http://localhost:<port>/callback?token=<exchange-code>`. The agent receives the exchange code from this callback (valid for 60 seconds).
4. Exchange the code for a JWT:
   ```bash
   curl -X POST "https://studio.spuree.com/api/auth/token/exchange" \
     -H "Content-Type: application/json" \
     -d '{"code": "<exchange-code>"}'
   ```
5. Create an API key with the JWT (`POST /v1/api-keys`) and store it in `$SPUREE_API_KEY`.

---

Once `$SPUREE_API_KEY` is set, the agent authenticates with `X-API-Key: $SPUREE_API_KEY` on all requests. No login or token refresh needed.

**Verify it works** — ask your agent:

> "List my Spuree projects"

The agent should show you which projects you have access to. If it works, your API key is set up correctly.

**Try it out** — ask your agent something like:

> "Upload this file to my Spuree project"

## Base URLs

Spuree uses two hosts:

| Host | Purpose | Endpoints |
| --- | --- | --- |
| `https://studio.spuree.com/api` | Authentication (login, refresh, exchange) | `/auth/token`, `/auth/token/refresh`, `/auth/token/exchange` |
| `https://data.spuree.com/api` | All V1 data APIs (projects, files, etc.) | `/v1/projects`, `/v1/files`, `/v1/api-keys`, ... |

All other skills in this repo use `https://data.spuree.com/api`. Only the token endpoints below use `studio.spuree.com`.

## Token Lifecycle

| Token | Lifetime | Format |
| --- | --- | --- |
| `access_token` | 1 hour | NextAuth JWT |
| `refresh_token` | 30 days | Opaque hex string |
| `exchange_code` | 60 seconds | Opaque string |

The `access_token` is what you pass as `Authorization: Bearer <access_token>` to V1 API endpoints.

Alternatively, you can create **API keys** for long-lived, non-interactive access. API keys are passed via `X-API-Key` header and can be scoped to specific organizations.

## Token Response Format

All three endpoints return the same OAuth2-compliant response:

```json
{
  "access_token": "eyJhbGciOiJkaXIiLCJlbmMiOi...",
  "refresh_token": "a1b2c3d4e5f6...",
  "expires_in": 3600,
  "user": {
    "id": "64a7b8c9d1e2f3a4b5c6d7e8",
    "email": "user@example.com",
    "name": "User Name",
    "image": "https://...",
    "organizationId": "64a7b8c9d1e2f3a4b5c6d7f0",
    "role": "admin",
    "workspaces": [
      {
        "workspaceId": "64a7b8c9d1e2f3a4b5c6d7f1",
        "workspaceName": "My Workspace",
        "role": "owner"
      }
    ]
  }
}
```

## Endpoints

### POST /auth/token

Log in with email and password.

**Description:** Validates credentials and returns an access token and refresh token. Rate limited to 10 requests per minute per IP.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `email` | string | Yes | User's email address |
| `password` | string | Yes | User's password |

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Login successful, tokens returned |
| 400 | Invalid request body or missing fields |
| 401 | Invalid email or password, or account locked |
| 429 | Rate limit exceeded (10 req/min) |
| 500 | Internal server error |

**Error Messages (401):**

| Message | Cause |
| --- | --- |
| `Invalid email or password` | Wrong credentials |
| `Password is not set for this user` | User registered via OAuth only |
| `Account is temporarily locked...` | Too many failed attempts (5 failures → 15 min lock) |

**Example:**

```bash
curl -X POST "https://studio.spuree.com/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "mypassword"
  }'
```

---

### POST /auth/token/refresh

Refresh an expired access token.

**Description:** Exchanges a valid refresh token for a new access token and refresh token pair. The old refresh token is atomically revoked to prevent reuse. Rate limited to 10 requests per minute per IP.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `refresh_token` | string | Yes | The refresh token from a previous login or refresh |

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | New tokens issued |
| 400 | Missing refresh token |
| 401 | Invalid or expired refresh token |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Example:**

```bash
curl -X POST "https://studio.spuree.com/api/auth/token/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "a1b2c3d4e5f6..."
  }'
```

**Notes:**

- Each refresh token can only be used once. After refresh, use the new `refresh_token` for subsequent refreshes.
- If a refresh token is reused (already revoked), it returns 401.

---

### POST /auth/token/exchange

Exchange an authorization code for tokens.

**Description:** Exchanges a one-time authorization code for an access token and refresh token. Used by agents and desktop apps that authenticate via the browser (see Getting Started Option C). The login flow starts at `studio.spuree.com/auth/signin?source=api` — after the user completes login, the exchange code is delivered to the agent's local callback server. Rate limited to 10 requests per minute per IP.

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `code` | string | Yes | The authorization exchange code |

**Status Codes:**

| Code | Description |
| --- | --- |
| 200 | Tokens issued |
| 400 | Missing exchange code |
| 401 | Invalid or expired exchange code |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

**Example:**

```bash
curl -X POST "https://studio.spuree.com/api/auth/token/exchange" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "exchange-code-here"
  }'
```

**Notes:**

- Exchange codes expire after 60 seconds.
- Each code can only be used once.

## API Keys

API keys provide long-lived authentication for automated workflows. They are scoped to a user and optionally restricted to specific organizations.

All V1 endpoints accept either `Authorization: Bearer <jwt>` or `X-API-Key: <api-key>`. When both are provided, JWT takes priority.

### POST /v1/api-keys

Create a new API key.

**Auth:** Requires JWT (Bearer token only, not API key).

**Request Body:**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `name` | string | Yes | Descriptive name for the key |
| `scopes` | object | No | `{ "organizations": ["orgId1", ...] }` — restrict to specific orgs. Omit for all orgs. |
| `expiresAt` | datetime | No | Expiration timestamp (ISO 8601). Omit for no expiry. |

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "CI Pipeline Key",
  "key": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": null,
  "lastUsedAt": null,
  "scopes": { "organizations": ["64a7b8c9d1e2f3a4b5c6d7f0"] },
  "status": "active"
}
```

> **Important:** The `key` field is only returned once at creation. Store it securely.

**Example:**

```bash
curl -X POST "https://data.spuree.com/api/v1/api-keys" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CI Pipeline Key",
    "scopes": { "organizations": ["64a7b8c9d1e2f3a4b5c6d7f0"] }
  }'
```

---

### GET /v1/api-keys

List all active API keys for the authenticated user.

**Auth:** Requires JWT (Bearer token only).

**Response:**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "CI Pipeline Key",
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": null,
    "lastUsedAt": "2024-03-10T14:30:00Z",
    "scopes": { "organizations": ["64a7b8c9d1e2f3a4b5c6d7f0"] },
    "status": "active"
  }
]
```

**Example:**

```bash
curl "https://data.spuree.com/api/v1/api-keys" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

### DELETE /v1/api-keys/{key_id}

Revoke an API key (soft delete).

**Auth:** Requires JWT (Bearer token only).

**Response:**

```json
{ "success": true }
```

**Example:**

```bash
curl -X DELETE "https://data.spuree.com/api/v1/api-keys/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer $SPUREE_ACCESS_TOKEN"
```

---

## Token Storage

Store tokens in environment variables using these standard names:

```
SPUREE_ACCESS_TOKEN=eyJhbGci...    # JWT access token (1 hour)
SPUREE_REFRESH_TOKEN=a1b2c3d4...   # For refreshing access token (30 days)
SPUREE_API_KEY=a1b2c3d4...             # API key (64-char hex, long-lived)
```

All Spuree skills reference these variable names. V1 endpoints accept either `Authorization: Bearer $SPUREE_ACCESS_TOKEN` or `X-API-Key: $SPUREE_API_KEY`.

## Common Patterns

### Agent Login Flow

1. **Obtain tokens** with email and password:

   ```
   POST /auth/token → { access_token, refresh_token, expires_in, user }
   ```

2. **Use access token** for V1 API calls:

   ```
   Authorization: Bearer {access_token}
   ```

3. **Refresh** before the token expires (every ~55 minutes):

   ```
   POST /auth/token/refresh → { access_token, refresh_token, ... }
   ```

### Token Refresh Strategy

- `expires_in` is `3600` (1 hour). Refresh proactively at ~55 minutes to avoid failed requests.
- Always store and use the latest `refresh_token` — old ones are revoked after use.
- If refresh fails with 401, the user must log in again with email/password.

### API Key for Automation

For CI/CD pipelines or long-running agents that can't refresh tokens:

1. **Log in** to get a JWT
2. **Create an API key** scoped to the needed organizations:
   ```
   POST /v1/api-keys → { key: "a1b2c3d4..." }
   ```
3. **Use the API key** for all subsequent requests:
   ```
   X-API-Key: a1b2c3d4...
   ```

API keys don't expire by default (unless `expiresAt` is set) and don't need refreshing.

## Error Handling

| Error | Cause | Resolution |
| --- | --- | --- |
| 401 (invalid credentials) | Wrong email or password | Verify credentials |
| 401 (account locked) | 5 failed login attempts | Wait 15 minutes, then retry |
| 401 (invalid refresh token) | Token expired, revoked, or reused | Log in again with email/password |
| 401 (invalid exchange code) | Code expired or already used | Request a new exchange code |
| 429 (rate limit) | More than 10 requests/min from same IP | Wait and retry with backoff |

## Rate Limits

All authentication endpoints share the same rate limit: **10 requests per minute per IP**. Implement exponential backoff when receiving 429 responses.
