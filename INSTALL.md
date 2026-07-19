# Connect Your AI Tool to Spuree

There are two ways to hook an AI tool up to Spuree, and they suit different clients:

- **Connector (OAuth MCP)** — paste a URL into your client, sign in through your browser, and approve access once; from then on your AI tool can work with your Spuree projects directly. (Behind the scenes: MCP is the standard protocol AI tools use to talk to services, and OAuth is the browser sign-in that authorizes it.) No keys to copy, revocable from your Spuree account at any time. Best for hosted and chat-style clients (claude.ai surfaces, ChatGPT). The server URL for Claude surfaces is `https://spuree.com/mcp`; ChatGPT uses its own URL (see [ChatGPT](#chatgpt)).
- **Skills + API key** — install the [Spuree skill docs](https://github.com/CheehooLabs/SpureeSkills) into your agent and authenticate against the REST API with an API key. Best for CLI agents (Codex, OpenClaw, local Claude Code) and for the full V1 API surface, including binary file uploads, which the hosted connector does not offer.

**Before you start:** you need a Spuree account — sign up at [studio.spuree.com](https://studio.spuree.com). Three domains appear in this guide: **spuree.com** is the main site (and the consent screen you'll approve), **studio.spuree.com** is the web app, and **data.spuree.com** is the API host.

> **Note:** The Spuree connector is currently in early access. If the OAuth flow is not yet enabled for your account and your client supports skills (Claude Code, Codex, OpenClaw), use the skills + API key path in the meantime. ChatGPT has no skills path — if the connector isn't enabled for your account yet, wait for general availability.

## Which path should I use?

| Client | Connector (OAuth MCP) | Skills + API key | Note |
| --- | :---: | :---: | --- |
| Claude Code (CLI / desktop) | ✅ via claude.ai | ✅ | Add the connector on claude.ai; it flows into Claude Code automatically |
| Claude Code on the web & Claude Cowork | ✅ | ◐ | Connector recommended, configured at the Claude account level; Cowork can also install Agent Skills, but the connector keeps API keys out of the client |
| ChatGPT (web) | ✅ read-only | — | Paid plan required; uses its own server URL (see [ChatGPT](#chatgpt)); exposes `search`, `fetch`, and `getting_started` only |
| Codex (CLI / IDE) | — | ✅ | Codex's MCP OAuth login isn't compatible with Spuree's OAuth server today |
| OpenClaw | — | ✅ | The Spuree MCP endpoint is OAuth-only; OpenClaw's native MCP client doesn't support OAuth flows |

✅ = supported · ◐ = possible but not the recommended path · — = not supported

## Client setup guides

### Claude Code (CLI and desktop app)

**Connector path (recommended):**

1. On claude.ai, open **Customize > Connectors** ([claude.ai/customize/connectors](https://claude.ai/customize/connectors)). Pick Spuree from the directory if it's listed, or add it as a custom connector with server URL `https://spuree.com/mcp`. On Team/Enterprise plans, an Owner adds it in **Organization settings > Connectors** first; members then connect individually.
2. Your browser opens Spuree's consent screen on spuree.com — **Authorize** plus your client's name — listing four scopes (see [Using the connector](#using-the-connector)). Click **Allow**.
3. In Claude Code, make sure you're logged in with your claude.ai account — run `/status` to check. Connectors do **not** load when your session authenticates via `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, an `apiKeyHelper`, Bedrock/Vertex, or a setup token.
4. Run `/mcp` — connectors from claude.ai appear with a claude.ai indicator. In the desktop app you can also manage them under **Settings > Connectors**.
5. Verify with a read-only call: ask *"List my Spuree projects"*.

> **Advanced:** You can try adding the server directly with `claude mcp add --transport http spuree https://spuree.com/mcp` and authenticating via `/mcp` or `claude mcp login spuree`. However, Spuree's OAuth server does not support dynamic client registration, so this direct flow may fail with *"does not support dynamic client registration"*. If it does, use the claude.ai connector path above.

**Skills + API key path:**

1. Install the skill docs: `npx skills add https://github.com/CheehooLabs/SpureeSkills` (re-run later to update). Requires Node.js 18+; `skills` is the open-source skills CLI, fetched on demand by npx.
2. Get an API key (see [Using API keys](#using-api-keys)) and export it before launching Claude Code: `export SPUREE_API_KEY="<your-api-key>"`.
3. Ask *"How do I use Spuree skills?"* — this activates the getting-started skill for a guided, read-only first run — then *"List my Spuree projects"* to verify.

### Claude Code on the web and Claude Cowork

1. Add Spuree once at the account level: on claude.ai, open **Customize > Connectors**, click **+** / **Add custom connector**, and paste `https://spuree.com/mcp` (or select Spuree from the directory if listed). On Team/Enterprise plans, an Owner adds it in **Organization settings > Connectors** first; members then connect individually.
2. Approve Spuree's **Authorize** consent screen.
3. **Claude Code on the web:** log in to [claude.ai/code](https://claude.ai/code) with the same account and start a new session — connectors added in claude.ai are provisioned into web sessions automatically.
4. **Claude Cowork:** no separate setup. Control which connectors are active via the **+** menu in the chat box or the **Customize > Connectors** page.
5. Verify: ask *"List my Spuree projects"*. Successful responses include `webUrl` links into the Spuree web app.

> Freshly added connectors may not appear in an existing conversation — start a new session. Note that on the hosted connector surface, `file_create` (Markdown, up to 1 MiB) is the only way to write file content; binary uploads require the skills + API key path on a local client. Free claude.ai plans are limited to one custom connector. Cowork can also install Agent Skills, but the connector is the recommended path on these surfaces — it keeps API keys out of the client.

### ChatGPT

Custom connectors require a paid ChatGPT plan — Plus, Pro, Business/Team, Enterprise, or Edu; they're not available on the free tier. Exact menu naming varies as ChatGPT evolves; on current ChatGPT you may need to enable Developer mode first.

1. Open **Settings > Connectors > Advanced** and enable **Developer mode**.
2. Go to **Settings > Connectors > Create** (on some builds: **Custom connectors > Add**).
3. Name the connector **Spuree**, paste the server URL `https://spuree.com/mcp/chatgpt`, and leave authentication set to **OAuth**. ChatGPT has its own adapter endpoint — don't use the `https://spuree.com/mcp` URL meant for Claude surfaces.
4. ChatGPT redirects to spuree.com and shows Spuree's **Authorize ChatGPT** consent screen. Click **Allow**. The screen lists all four scopes — approval is all-or-nothing in v1 — but the ChatGPT surface can only ever call its three read-only tools, so the `write`, `invite`, and `render` scopes are never exercised there.
5. The connector appears in the tool picker — start a new chat; existing chats won't see the connector.

**What you get in ChatGPT:** a read-only surface with exactly three tools — `search` (full-text search with links into Spuree), `fetch` (read a file or list a project/folder's children), and `getting_started` (the onboarding guide). The full `project_*` / `folder_*` / `file_*` tool set is **not** available from ChatGPT, and asking for those tools returns an unknown-tool error.

**Skills + API key: not supported** — ChatGPT can't load local skill docs or hold an API key.

Try it: ask *"How do I use Spuree?"* — this runs the `getting_started` tool — or ask ChatGPT to find a file or folder by topic.

### Codex (OpenAI Codex CLI / IDE extension)

The connector path is not available for Codex today (Codex's MCP OAuth login requires dynamic client registration, which Spuree's OAuth server doesn't offer). Use skills + an API key:

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com), then create an API key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys). **Save it immediately — it's shown only once.**
2. In your project repository, install the skill docs: `npx skills add https://github.com/CheehooLabs/SpureeSkills -a codex` (or choose Codex when prompted; requires Node.js 18+ — `skills` is the open-source skills CLI, fetched on demand by npx). The CLI prompts for the target — project-level `.agents/skills/` is the safest choice — then confirm the files landed: `ls .agents/skills/`. Re-run the same command to update.
3. Export the key in the environment Codex runs in, before launching it: `export SPUREE_API_KEY="<your-api-key>"`.
4. Start Codex and ask *"How do I use Spuree skills?"* — this activates the getting-started skill. You can also invoke a skill explicitly via `/skills` or a `$skill-name` mention.
5. Verify with *"List my Spuree projects"* — if projects come back, the key works.
6. Optional: if Codex answers from memory without ever calling data.spuree.com, implicit skill activation isn't kicking in — add a note to your repo's `AGENTS.md` pointing at the skills in `.agents/skills/` and stating that Spuree V1 calls go to `https://data.spuree.com/api` with the `X-API-Key` header.

### OpenClaw

The connector path is not available for OpenClaw today: the Spuree MCP endpoint is OAuth-only, and OpenClaw's native MCP client supports only static headers. API keys work **only** against the REST API at data.spuree.com — a static-header MCP config pointed at `https://spuree.com/mcp` cannot work. Use skills + an API key instead.

Skills are documentation, not MCP tools — nothing new appears in OpenClaw's tool list. The agent calls the REST API directly, so it needs shell/HTTP tooling enabled.

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com) and create an API key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys). **Save it immediately — it's shown only once.**
2. Install the skills globally: `npx skills add https://github.com/CheehooLabs/SpureeSkills -a openclaw -g` — this installs into `~/.openclaw/skills/`, loaded for all agents. (Run without `-g` inside your agent workspace to install into `<workspace>/skills`, which takes precedence.) Re-run to update.
3. Review the installed SKILL.md files before use — OpenClaw's own security guidance says to treat third-party skills as untrusted and read them before enabling.
4. Provide the key. Simplest: set `SPUREE_API_KEY` in the environment of the process that runs OpenClaw — your shell profile, container env, or service definition. For example: `SPUREE_API_KEY="<your-key>" <your OpenClaw start command>`. Alternative: set it per skill in `~/.openclaw/openclaw.json` under `skills.entries`, where each entry key is a skill's directory name (e.g. `authentication`): `{ "skills": { "entries": { "authentication": { "env": { "SPUREE_API_KEY": "<your-key>" } } } } }` — OpenClaw injects it per agent run if not already set. The environment-level approach covers every Spuree skill with one setting.
5. Start a **new** session — the eligible-skills snapshot is taken at session start.
6. Verify: ask *"List my Spuree projects"*. The agent should call `https://data.spuree.com/api/v1/projects` with the `X-API-Key` header and show your projects.

## Using the connector

### The consent screen

When you connect, spuree.com shows a consent screen — **Authorize** plus your client's name — listing four scopes. Approval is all-or-nothing in v1 — you approve all four or decline:

| Scope | What it allows |
| --- | --- |
| `read` | List and read every catalogued resource (projects, files, folders, profile, workspaces) |
| `write` | Create, update, and permanently delete catalogued resources, including removing teammates from workspaces |
| `invite` | Manage project invitations and sharing on your behalf, including accepting or declining invitations |
| `render` | Trigger render jobs on your behalf (separate scope because it consumes paid compute) |

Two things worth knowing before you click Allow:

- **`write` includes permanent deletion** and removing teammates from workspaces. That wording is deliberate.
- **`render` currently enables nothing in connectors** — it covers REST endpoints only, and no render tools are exposed on the MCP surface yet.

### What tools appear

On Claude surfaces, the connector exposes tools grouped by scope — for example `project_list`, `project_browse`, `folder_browse`, `file_search`, `file_read_content`, and `comment_list` (read); `project_create`, `folder_create`, `file_update`, `file_create` (Markdown file creation), and `comment_create` (write); `project_share` and the `invite_*` tools (invite). Plus `getting_started`, a read-only orientation guide, and `destination_suggest`, which ranks likely save destinations. Many responses include `webUrl` links straight into the Spuree web app.

The exact tool list depends on your client and may grow as new skills ship — ChatGPT sees only `search`, `fetch`, and `getting_started`.

### Good first prompts (Claude surfaces)

These prompts assume the full tool set on Claude surfaces; for ChatGPT, use the prompts in the [ChatGPT section](#chatgpt). Start read-only, then work up:

- *"How do I use Spuree?"* — runs the `getting_started` tool for a guided walkthrough
- *"List my Spuree projects"* — `project_list`, the recommended first success
- *"Show me what's in [project]"* — `project_browse`
- *"Create a project called [name]"* — `project_create`
- *"Share this project with [email]"* — `project_share`
- *"Leave a comment on [file]"* — `comment_create`

A successful first call looks like this (illustrative — your project names and links will differ):

> **You:** List my Spuree projects
>
> **Agent:** You have three projects:
> 1. **Spring Lookbook** — [open in Spuree](https://studio.spuree.com/projects/1024)
> 2. **Product Renders** — [open in Spuree](https://studio.spuree.com/projects/1057)
> 3. **Archive 2025** — [open in Spuree](https://studio.spuree.com/projects/1112)

### Revoking access

- **Spuree side (connector):** open [spuree.com/account/connections](https://spuree.com/account/connections), find the connected app, and click **Disconnect**. Access is cut within seconds. Tokens are scoped per app, so revoking one connector doesn't affect others. Reconnecting later shows the consent screen again and issues a fresh token.
- **Client side (connector):** also remove the connector in your client — on claude.ai under **Customize > Connectors**, in ChatGPT under **Settings > Connectors**.
- **API keys:** manage and revoke keys at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys), or via `DELETE /v1/api-keys/{key_id}` (JWT Bearer required).

## Using API keys

### Base URLs

| Host | Serves |
| --- | --- |
| `https://studio.spuree.com/api` | Auth endpoints only: `/auth/token`, `/auth/token/refresh`, `/auth/token/exchange` |
| `https://data.spuree.com/api` | All V1 data APIs: `/v1/projects`, `/v1/files`, `/v1/api-keys`, … |

### Getting a key

Full details live in the [authentication skill](https://github.com/CheehooLabs/SpureeSkills/blob/main/authentication/SKILL.md) (in-repo: `./authentication/SKILL.md`). Three options:

- **Option A (easiest):** create a key in the web UI at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys), save it immediately (shown only once), then `export SPUREE_API_KEY="<your-api-key>"`.
- **Option B (agent-driven):** the agent exchanges your email/password at `POST https://studio.spuree.com/api/auth/token` for a 1-hour JWT, then mints a key with `POST https://data.spuree.com/api/v1/api-keys` using `Authorization: Bearer <access_token>`.
- **Option C (browser SSO — no password shared with the agent):** the agent starts a local callback server on an ephemeral port (49152–65535), opens `https://studio.spuree.com/auth/signin?source=api&port=<port>`, receives a single-use exchange code (valid 60 seconds) at `http://localhost:<port>/callback`, trades it via `POST https://studio.spuree.com/api/auth/token/exchange`, then creates the key as in Option B.

### Two headers, two credentials

Every V1 data endpoint accepts either:

| Header | Credential | Lifetime |
| --- | --- | --- |
| `X-API-Key: <key>` | API key | Long-lived — no expiry unless `expiresAt` was set; no refresh needed |
| `Authorization: Bearer <jwt>` | JWT access token | 1 hour; refresh proactively at ~55 minutes via `/auth/token/refresh` (refresh tokens live 30 days) |

If both headers are sent, the JWT wins. Refresh tokens are single-use — always store the newest one; reusing an old one returns 401, and a failed refresh means logging in again.

**One asymmetry to remember:** an API key can read and write data, but it cannot manage API keys. Creating (`POST /v1/api-keys`), listing (`GET /v1/api-keys`), and revoking (`DELETE /v1/api-keys/{key_id}`) all require a JWT Bearer.

### Key custody

- The key is shown **once**, at creation. Save it immediately.
- Keep it in an environment variable (`SPUREE_API_KEY`) — never paste it into a chat conversation, prompt, or log.
- Keys are user-scoped and grant the full V1 surface for your user, optionally restricted to specific organizations at creation time.
- Revoke a key you no longer need at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys) or with `DELETE /v1/api-keys/{key_id}` (JWT Bearer required).

### First request

```bash
curl -H "X-API-Key: $SPUREE_API_KEY" https://data.spuree.com/api/v1/projects
```

If your projects come back as JSON, you're connected.

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `401 invalid_token` on a connector call | The token expired or was revoked | Reconnect from your client's connector UI (e.g. ChatGPT: **Settings > Connectors > Spuree > Reconnect**) |
| `403 insufficient_scope` | The token lacks a required scope | Disconnect at [spuree.com/account/connections](https://spuree.com/account/connections), then reconnect to re-consent to the full scope set |
| Spuree missing from `/mcp` in Claude Code | Session isn't authenticated with a claude.ai subscription login | Run `/status`; connectors don't load when `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, Bedrock/Vertex, or a setup token is active |
| *"does not support dynamic client registration"* when direct-adding in Claude Code | Spuree's OAuth server has no dynamic client registration | Add Spuree on claude.ai instead ([claude.ai/customize/connectors](https://claude.ai/customize/connectors)) and let it flow into Claude Code |
| No way to add a connector in ChatGPT Settings | Free tier (custom connectors need a paid plan), or Developer mode isn't enabled | Upgrade to a paid plan (Plus, Pro, Business/Team, Enterprise, Edu), then enable **Settings > Connectors > Advanced > Developer mode** (naming varies as ChatGPT evolves) |
| Unknown-tool error in ChatGPT for `project_list` etc. | ChatGPT's Spuree surface has only `search`, `fetch`, and `getting_started` | Use those three tools; the full tool set is available on Claude surfaces |
| Connector doesn't appear in an existing conversation | Connectors are picked up at session start | Start a new chat — existing chats won't see the connector |
| `401` when refreshing a JWT | Refresh tokens are single-use; an old one was reused, or the 30-day refresh token expired | Log in again and store the newest `refresh_token` after every refresh |
| `POST /v1/api-keys` rejected when sent with `X-API-Key` | Key management requires a JWT Bearer, not an API key | Get a JWT via `/auth/token` (or the SSO flow) first |
| Repeated auth failures | Auth endpoints are rate-limited and repeated failed logins temporarily lock the account | Wait a few minutes and retry; slow down automated login attempts |
| Truncated results on large listings in Claude Code | MCP tool output is capped at 25,000 tokens by default | Raise the cap with the `MAX_MCP_OUTPUT_TOKENS` environment variable, or narrow the request |

Still stuck? On a connector surface, ask *"How do I use Spuree?"* (runs the `getting_started` tool); on the skills path, ask *"How do I use Spuree skills?"* (activates the getting-started skill). Both give a safe, read-only walkthrough that verifies your setup step by step.
