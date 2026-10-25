# Connect Your AI Tool to Spuree

There are two ways to hook an AI tool up to Spuree, and they suit different clients:

- **Connector (OAuth MCP)** — paste a URL into your client, sign in through your browser, and approve access once; from then on your AI tool can work with your Spuree projects directly. (Behind the scenes: MCP is the standard protocol AI tools use to talk to services, and OAuth is the browser sign-in that authorizes it.) No keys to copy, revocable from your Spuree account at any time. This is the fuller surface: brand memory, video, image and voiceover generation, posts, feedback and Continued works exist only on the connector, and the **first-post** skill runs over it. The server URL for Claude surfaces is `https://studio.spuree.com/mcp`; ChatGPT uses its own URL (see [ChatGPT](#chatgpt)).
- **Skills + API key** — install the [Spuree skill docs](https://github.com/CheehooLabs/SpureeSkills) into your agent and authenticate against the REST API with an API key. Best for scripts, automations and CLI agents that cannot complete a browser sign-in (OpenClaw, Codex cloud), and for calling the V1 REST API from your own code. Projects, folders, files, uploads and comments are covered; generation, brands and posts are not, so the first-post skill needs the connector.

**Before you start:** you need a Spuree account — sign up at [studio.spuree.com](https://studio.spuree.com). Three domains appear in this guide: **spuree.com** is the main site, **studio.spuree.com** is the web app (and where the consent screen you'll approve is shown), and **data.spuree.com** is the API host.

## Which path should I use?

| Client | Connector (OAuth MCP) | Skills + API key | Note |
| --- | :---: | :---: | --- |
| Claude Code (CLI / desktop) | ✅ via claude.ai | ✅ | Add the connector on claude.ai; it flows into Claude Code automatically |
| Claude Code on the web & Claude Cowork | ✅ | ◐ | Connector recommended, configured at the Claude account level; Cowork can also install Agent Skills, but the connector keeps API keys out of the client |
| ChatGPT (web) | ✅ search & video | — | Custom MCP servers depend on your ChatGPT plan and workspace settings; uses its own server URL (see [ChatGPT](#chatgpt)); exposes `search`, `fetch`, `getting_started` and the video tools — no brands, uploads or posts |
| Codex (CLI / IDE / ChatGPT desktop app) | ✅ | ✅ | `codex mcp add` must pin the pre-registered `openai-codex` client id (see [Codex](#codex-openai-codex-cli--ide-extension)); the Codex tab in the ChatGPT desktop app shares the same configuration |
| OpenClaw | — | ✅ | OpenClaw's MCP OAuth relies on dynamic client registration, which Spuree's OAuth server doesn't offer, and OpenClaw documents no way to pin a pre-registered client id |
| Hermes Agent (CLI / desktop) | ✅ | ✅ | The server entry must pin the pre-registered `hermes-agent` client id (see [Hermes Agent](#hermes-agent)) |

✅ = supported · ◐ = possible but not the recommended path · — = not supported

## Client setup guides

**About the skills installer** (applies to every skills-path client below): `npx skills add …` is interactive — it prompts you to pick skills, **which agents to install for** (this choice matters: see each client's section), and an install scope, then shows a third-party security assessment before finishing. That assessment may flag the `authentication` skill as high-risk; this is a keyword-driven false positive — the skills are documentation-only (no scripts or executables), and every endpoint they describe points at Spuree's own domains. Review the installed SKILL.md files if you want to confirm, then proceed. You can also paste the install command into your agent's chat and let the agent run the installer itself — it completes non-interactively with the installer's default targets. Those defaults have been observed to cover Claude Code, but they are the installer's choice, not a guarantee: afterwards, run your client section's confirmation step (for Claude Code, `ls .claude/skills/`) before relying on the skills.

### Claude Code (CLI and desktop app)

**Connector path (recommended):**

1. On claude.ai, open **Customize > Connectors** ([claude.ai/customize/connectors](https://claude.ai/customize/connectors)). Pick Spuree from the directory if it's listed, or add it as a custom connector with server URL `https://studio.spuree.com/mcp`, then expand **Advanced settings** and set **OAuth Client ID** to `anthropic-claude-code`, leaving the client secret blank — Spuree's OAuth server has no dynamic client registration, so without the pre-registered id the connection fails. On Team/Enterprise plans, an Owner adds it in **Organization settings > Connectors** first; members then connect individually.
2. Your browser opens Spuree's consent screen on studio.spuree.com — **Authorize** plus your client's name — listing four scopes (see [Using the connector](#using-the-connector)). Click **Allow**.
3. In Claude Code, make sure you're logged in with your claude.ai account — run `/status` to check. Connectors do **not** load when your session authenticates via `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, an `apiKeyHelper`, Bedrock/Vertex, or a setup token.
4. Run `/mcp` — connectors from claude.ai appear with a claude.ai indicator. In the desktop app you can also manage them under **Customize > Connectors**.
5. Verify with a read-only call: ask *"List my Spuree projects"*.

> **Advanced:** You can try adding the server directly with `claude mcp add --transport http spuree https://studio.spuree.com/mcp` and authenticating via `/mcp` or `claude mcp login spuree`. However, Spuree's OAuth server does not support dynamic client registration, so this direct flow may fail with *"does not support dynamic client registration"*. If it does, use the claude.ai connector path above.

**Skills + API key path:**

1. In your project folder, install the skill docs: `npx skills add https://github.com/CheehooLabs/SpureeSkills` (requires Node.js 18+; `skills` is the open-source skills CLI, fetched on demand by npx; re-run later to update). **When the installer asks which agents to install to, select "Claude Code."** That selection is what creates `.claude/skills/` symlinks in your project — the location Claude Code actually reads. The universal `.agents/skills` target alone is **not** discovered by Claude Code, so skipping the picker installs the skills somewhere Claude Code never looks, with no error anywhere. Confirm with `ls .claude/skills/`.
2. Get an API key (see [Using API keys](#using-api-keys)) and set it before launching Claude Code. macOS/Linux: `export SPUREE_API_KEY="<your-api-key>"`. Windows (PowerShell): persist it with `[Environment]::SetEnvironmentVariable("SPUREE_API_KEY", "<your-api-key>", "User")`, then **fully restart Claude Code** — environment variables are read at process start, so a new tab or window is not enough.
3. Launch Claude Code **in the same folder you installed into** — a project-level install is only visible from that folder — and ask *"How do I use Spuree skills?"* — this activates the getting-started skill for a guided, read-only first run — then *"List my Spuree projects"* to verify.

### Claude Code on the web and Claude Cowork

1. Add Spuree once at the account level: on claude.ai, open **Customize > Connectors**, click **+** / **Add custom connector**, and paste `https://studio.spuree.com/mcp` (or select Spuree from the directory if listed). Expand **Advanced settings** and set **OAuth Client ID** to `anthropic-claude-code`, leaving the client secret blank — Spuree's OAuth server has no dynamic client registration, so without the pre-registered id the connection fails. On Team/Enterprise plans, an Owner adds it in **Organization settings > Connectors** first; members then connect individually.
2. Approve Spuree's **Authorize** consent screen.
3. **Claude Code on the web:** log in to [claude.ai/code](https://claude.ai/code) with the same account and start a new session — connectors added in claude.ai are provisioned into web sessions automatically.
4. **Claude Cowork:** no separate setup. Control which connectors are active via the **+** menu in the chat box or the **Customize > Connectors** page.
5. Verify: ask *"List my Spuree projects"*. Successful responses include `webUrl` links into the Spuree web app.

> Freshly added connectors may not appear in an existing conversation — start a new session. On the hosted connector, `file_create` (Markdown, JSON, CSV, YAML, XML, logs or HTML; up to 1 MiB) writes text files directly. Any other file goes through `file_upload_start`, a PUT of the bytes to the URL it returns, then `file_upload_complete` — the PUT runs in Claude's own sandbox, so it needs code execution with network egress that reaches the upload host. Where egress is blocked (Claude on the web by default), a file up to 64 KB goes through `file_upload_inline` instead. Free claude.ai plans are limited to one custom connector. Cowork can also install Agent Skills, but the connector is the recommended path on these surfaces — it keeps API keys out of the client.

### ChatGPT

Adding custom MCP servers depends on your ChatGPT workspace permissions and security settings — sign in on the web first, and if the add option is missing after signing in, check with your workspace admin. Exact menu naming varies as ChatGPT evolves.

1. Open [ChatGPT Plugins](https://chatgpt.com/plugins), sign in, and select the **+** button, then **Add custom MCP server**.
2. Name it **Spuree**, add a short description, then under **Connection** choose the public-endpoint option and paste the server URL `https://studio.spuree.com/mcp/chatgpt`. ChatGPT has its own adapter endpoint — don't use the `https://studio.spuree.com/mcp` URL meant for Claude surfaces.
3. Choose **OAuth** in the Authentication menu. Expand **Advanced OAuth settings**, set **Client ID** to `openai-chatgpt` and leave the client secret empty; if asked for **Token endpoint auth method**, choose `none` — Spuree's OAuth server has no dynamic client registration, so without the pre-registered id the connection fails. Tick **I understand and want to continue** under the custom-MCP-server warning, then click **Create as a plugin**.
4. When prompted, sign in at studio.spuree.com and review Spuree's **Authorize ChatGPT** consent screen before choosing **Allow**. The screen lists all four scopes — approval is all-or-nothing in v1. Here `read` covers `search`, `fetch`, `getting_started`, the video quote, status, result and pattern-read tools, and `likeness_list`; `render` is used only by `video_generate` and `video_finalize_draft`, which spend credits; `write` and `invite` are never exercised on this surface.
5. ChatGPT lists the tools it discovered from the server. Confirm you see `search`, `fetch`, `getting_started`, `video_quote`, `video_get_status`, `video_get_result`, `video_pattern_read`, `likeness_list`, `video_generate` and `video_finalize_draft`.
6. Install the resulting **Spuree** plugin from your personal or workspace plugins. Start a new chat, type **@Spuree**, and select the plugin from the menu before asking it to find a file; existing chats won't see the plugin.

**What you get in ChatGPT:** ten tools. `search` (full-text search with links into Spuree), `fetch` (read a file or list a project/folder's children), `getting_started` (the onboarding guide), `video_quote`, `video_get_status`, `video_get_result`, `video_pattern_read` and `likeness_list` use `read`; `video_generate` and `video_finalize_draft` use `render` and spend credits. Brands, uploads, posts and the `project_*` / `folder_*` / `file_*` tool set are **not** available here, so ChatGPT's Chat and Work modes can't make your first post — the ChatGPT desktop app's **Codex** tab, which connects as the `openai-codex` client, has the full tool set and can. Asking Chat for a tool it doesn't have returns an unknown-tool error.

**Skills + API key: not supported** — ChatGPT can't load local skill docs or hold an API key.

Try it: ask *"How do I use Spuree?"* — this runs the `getting_started` tool — or ask ChatGPT to find a file or folder by topic.

### Codex (OpenAI Codex CLI / IDE extension)

Codex runs as the CLI and as the Codex tab in the ChatGPT desktop app; both read the same configuration. Add the connector with Codex's pre-registered client id, or install skills with an API key. Codex cloud uses an environment secret (see below).

**Connector path (recommended):**

1. In a terminal, add Spuree as a streamable HTTP MCP server with the pre-registered client id: `codex mcp add spuree --url https://studio.spuree.com/mcp --oauth-client-id openai-codex`. The `--oauth-client-id openai-codex` flag is required — without it Codex attempts dynamic client registration, which Spuree's OAuth server doesn't offer. Codex prints the callback it will use, `http://127.0.0.1/callback`; that address is already registered for this client id, so there is nothing to add on Spuree's side. Needs Codex CLI 0.147 or newer (`codex --version`).
2. Sign in. Codex usually starts the browser flow right after the add; if it only says to log in, run `codex mcp login spuree`. Your browser opens Spuree's consent screen listing four scopes (see [Using the connector](#using-the-connector)). Click **Allow** — `render` is what lets Codex start paid work for you, such as a brand memory build or a video.
3. Start a new Codex session — MCP configuration is read at startup, so an existing session won't see the server. In the ChatGPT desktop app, open **Settings › MCP servers** from the Codex tab, click **Restart**, then **Authenticate** if Spuree asks.
4. Verify: ask *"List my Spuree projects"*. Codex should call the Spuree connector tools and show your projects. No API key is needed on this path.

**ChatGPT desktop app:** the app's own form adds the server as a plugin, which its Codex tab loads under the same `openai-codex` client:

1. In the ChatGPT desktop app, click **Plugins** in the sidebar, then **Add** › **Add custom MCP server**.
2. Name it **Spuree**, paste the server URL `https://studio.spuree.com/mcp`, and keep Authentication on **OAuth**.
3. Open **Advanced OAuth settings**, keep **User-Defined OAuth Client**, paste the client id `openai-codex` and leave the secret blank.
4. Tick **I understand and want to continue** and click **Create as a plugin**.
5. ChatGPT shows **Connect Spuree**; click **Continue to Spuree**, sign in when ChatGPT opens Spuree, and click **Allow access** on the **OpenAI Codex** consent screen (the name the ChatGPT app and the Codex CLI share).
6. Start a new chat in the **Codex** tab so it loads the plugin.

**Skills + API key path:** works without the connector and is what a Codex cloud workspace uses.

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com), then create an API key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys). **Save it immediately — it's shown only once.**
2. In your project repository, install the skill docs: `npx skills add https://github.com/CheehooLabs/SpureeSkills -a codex` (or choose Codex when prompted; requires Node.js 18+ — `skills` is the open-source skills CLI, fetched on demand by npx). The CLI prompts for the target — project-level `.agents/skills/` is the safest choice — then confirm the files landed: `ls .agents/skills/`. Re-run the same command to update.
3. Set the key in the environment Codex runs in, before launching it. macOS/Linux: `export SPUREE_API_KEY="<your-api-key>"`. Windows (PowerShell): `[Environment]::SetEnvironmentVariable("SPUREE_API_KEY", "<your-api-key>", "User")`, then open a **new terminal window** (not just a new tab — tabs inherit the terminal app's original environment) for it to take effect.
4. Start Codex **in the same folder you ran the install in** — a project-level install is only visible from that directory — and ask *"How do I use Spuree skills?"* — this activates the getting-started skill. You can also invoke a skill explicitly via `/skills` or a `$skill-name` mention.
5. Verify with *"List my Spuree projects"* — if projects come back, the key works.
6. Optional: if Codex answers from memory without ever calling data.spuree.com, implicit skill activation isn't kicking in — add a note to your repo's `AGENTS.md` pointing at the skills in `.agents/skills/` and stating that Spuree V1 calls go to `https://data.spuree.com/api` with the `X-API-Key` header.

> **Heads-up:** Codex also reads a **global** `~/.agents/skills/` directory. If an older install exists there, launching Codex outside your project folder silently falls back to those copies — you'll get stale skill docs (and possibly skills you never installed) with no warning. If Codex describes capabilities you don't recognize, check that location and update or remove it.

**Codex cloud / web:** the skills path works there too. Add `SPUREE_API_KEY` as a secret in your Codex **environment settings**, then paste the `npx skills add https://github.com/CheehooLabs/SpureeSkills` command into the chat — the agent installs the skills into its cloud workspace itself. The install is per-environment, and when you rotate your API key, remember to update the Codex environment secret as well.

### OpenClaw

The connector path is not available for OpenClaw today: OpenClaw's MCP OAuth (`auth: "oauth"` plus `openclaw mcp login`) relies on dynamic client registration, which Spuree's OAuth server does not offer, and OpenClaw documents no way to pin a pre-registered client id. API keys work **only** against the REST API at data.spuree.com — a static-header MCP config pointed at `https://studio.spuree.com/mcp` cannot work either. Use skills + an API key instead.

Skills are documentation, not MCP tools — nothing new appears in OpenClaw's tool list. The agent calls the REST API directly, so it needs shell/HTTP tooling enabled.

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com) and create an API key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys). **Save it immediately — it's shown only once.**
2. Install the skills globally: `npx skills add https://github.com/CheehooLabs/SpureeSkills -a openclaw -g` — this installs into `~/.openclaw/skills/`, loaded for all agents. (Run without `-g` inside your agent workspace to install into `<workspace>/skills`, which takes precedence.) Re-run to update.
3. Review the installed SKILL.md files before use — OpenClaw's own security guidance says to treat third-party skills as untrusted and read them before enabling.
4. Provide the key. Simplest: set `SPUREE_API_KEY` in the environment of the process that runs OpenClaw — your shell profile, container env, or service definition. For example: `SPUREE_API_KEY="<your-key>" <your OpenClaw start command>`. Alternative: set it per skill in `~/.openclaw/openclaw.json` under `skills.entries`, where each entry key is a skill's directory name (e.g. `authentication`): `{ "skills": { "entries": { "authentication": { "env": { "SPUREE_API_KEY": "<your-key>" } } } } }` — OpenClaw injects it per agent run if not already set. The environment-level approach covers every Spuree skill with one setting.
5. Start a **new** session — the eligible-skills snapshot is taken at session start.
6. Verify: ask *"List my Spuree projects"*. The agent should call `https://data.spuree.com/api/v1/projects` with the `X-API-Key` header and show your projects.

### Hermes Agent

**Connector path (recommended):**

Hermes lets a server entry pin its OAuth client id, and `hermes-agent` is Spuree's pre-registered client id for Hermes — that pairing is what makes the connector work without dynamic client registration, which Spuree's OAuth server doesn't offer.

1. In Hermes, open **Capabilities > MCP** and add Spuree to `mcp.json`:

   ```json
   {
     "mcpServers": {
       "spuree": {
         "url": "https://studio.spuree.com/mcp",
         "oauth": { "client_id": "hermes-agent" }
       }
     }
   }
   ```

   The `oauth.client_id` line is required — without it, Hermes attempts dynamic client registration and fails with *"Invalid registration response"*. Keep the server key named `spuree` exactly: Hermes builds its OAuth callback URL from that name, and only this one is registered for the client id — renaming the entry makes the browser sign-in fail.
2. Save, then click **Authenticate** on the new server entry. Your browser opens Spuree's consent screen listing four scopes (see [Using the connector](#using-the-connector)). Click **Allow**.
3. Start a new session — `mcp.json` changes apply after an MCP reload, so existing sessions won't see the server.
4. Verify: ask *"List my Spuree projects"*. The agent should call the Spuree connector tools and show your projects. No API key is needed on this path.

**Skills + API key path:**

The Hermes CLI and the Hermes Desktop app share one home directory (`~/.hermes` on macOS and Linux, `%LOCALAPPDATA%\hermes` on Windows), so the steps below cover both.

1. Create a Spuree account at [studio.spuree.com](https://studio.spuree.com) and create an API key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys). **Save it immediately, it's shown only once.**
2. Install the skills globally: `npx skills add https://github.com/CheehooLabs/SpureeSkills -a hermes-agent -g` (the agent name is `hermes-agent`, not `hermes`). This installs into `skills/` under the Hermes home, where every Hermes surface reads them. Re-run to update. Confirm with `hermes skills list`, the Spuree skills should show as `enabled`.
3. Review the installed SKILL.md files before use, treat third-party skills as untrusted and read them before enabling.
4. Add the key to Hermes's `.env` file, `~/.hermes/.env` on macOS and Linux, `%LOCALAPPDATA%\hermes\.env` on Windows, creating the file if it doesn't exist: `SPUREE_API_KEY=<your-api-key>`. On macOS and Linux restrict access to it: `chmod 600 ~/.hermes/.env` (on Windows, `%LOCALAPPDATA%` is already per-user). Use the `.env` file, not a shell variable. The desktop app starts its agent with its own environment, so shell exports and Windows User-scope variables never reach it. The `.env` file is read on every surface. For a CLI-only session a shell export also works, but if the same variable is set in both, the `.env` value wins: Hermes loads `.env` over existing shell exports, so a stale key in `.env` shadows a corrected export.
5. Restart Hermes: start a new CLI session, or fully quit the desktop app **including the system tray icon** and relaunch it.
6. Verify: ask *"List my Spuree projects"*. The agent should call `https://data.spuree.com/api/v1/projects` with the `X-API-Key` header and show your projects.

## Using the connector

### The consent screen

When you connect, studio.spuree.com shows a consent screen — **Authorize** plus your client's name — listing four scopes. Approval is all-or-nothing in v1 — you approve all four or decline:

| Scope | What it allows |
| --- | --- |
| `read` | List and read every catalogued resource (projects, files, folders, profile, workspaces) |
| `write` | Create, update, and permanently delete catalogued resources, including removing teammates from workspaces |
| `invite` | Manage project invitations and sharing on your behalf, including accepting or declining invitations |
| `render` | Start paid generation and render jobs on your behalf: videos, images, voiceovers and brand memory builds (a separate scope because it spends credits) |

Two things worth knowing before you click Allow:

- **`write` includes permanent deletion** and removing teammates from workspaces. That wording is deliberate.
- **`render` is the paid scope** — on the connector it gates `brand_build_start`, `video_generate`, `video_finalize_draft`, `image_generate` and `voiceover_generate`, the steps the **first-post** skill prices and confirms with you before spending credits; without it those tools answer `insufficient_scope`.

### What tools appear

On Claude surfaces (and for Codex and Hermes over the same connector), the tools cover the whole product. Call `account_context` first: it says which workspace you are working in and who pays for generations. Then, by what they do:

- **Projects, folders, files and comments:** `project_list`, `project_browse`, `project_create`, `folder_browse`, `folder_create`, `file_search`, `file_read_content`, `file_create` (text files up to 1 MiB), `file_update_content`, `file_upload_start` / `file_upload_complete` (any file), `file_upload_inline` (up to 64 KB), `destination_suggest` (ranks likely save destinations), `comment_list`, `comment_create` and their companions.
- **Sharing and members:** `project_share`, the `invite_*` tools, `workspace_list_members`, `workspace_add_member`, `workspace_update_member_role`, `workspace_remove_member`.
- **Brand memory:** `brand_lookup`, `brand_create`, `brand_build_start`, `brand_build_status`, `brand_pending_read`, `brand_pending_commit`.
- **Video:** `video_quote`, `video_generate`, `video_finalize_draft`, `video_get_status`, `video_get_result`, `video_pattern_read`, `likeness_list`.
- **Images and voiceovers:** `image_quote`, `image_generate`, `voice_list`, `voiceover_quote`, `voiceover_generate`.
- **Posts and the first post:** `post_draft_create`, `post_video_attach`, `post_get`, `post_list`, `post_update`, `post_delete`, `first_post_state`, `first_post_approve`, `first_post_example_start` — what the **first-post** skill drives.
- **Feedback and Continued works:** `feedback_create`, `feedback_list`, `feedback_get`, which the **report-feedback** skill uses to send the Spuree team a bug report or feedback you approved and to check on it; `work_list`, `work_ask`, `work_answer`, `work_task`, `work_task_status`, `work_task_snapshot` for works shared from the Continued app.
- Plus `getting_started`, a read-only orientation guide. Many responses include `webUrl` links straight into the Spuree web app.

The scope rule: reads, lists, quotes and status checks are `read`; creates, updates, deletes, drafts, uploads, feedback and work requests are `write`; sharing is `invite`; the five paid tools — `brand_build_start`, `video_generate`, `video_finalize_draft`, `image_generate` and `voiceover_generate` — are `render`.

The exact tool list depends on your client and grows as tools ship. ChatGPT's Chat and Work modes see the ten tools listed in the [ChatGPT section](#chatgpt).

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

- **Spuree side (connector):** open [studio.spuree.com/account/connections](https://studio.spuree.com/account/connections), find the connected app, and click **Revoke**. Access is cut within seconds. Tokens are scoped per app, so revoking one connector doesn't affect others. Reconnecting later shows the consent screen again and issues a fresh token.
- **Client side (connector):** also remove the connector in your client — on claude.ai under **Customize > Connectors**, in ChatGPT under **Settings > Plugins** (labelled **Connectors** or **Apps** on older builds).
- **API keys:** manage and revoke keys at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys), or via `DELETE https://data.spuree.com/api/v1/api-keys/{key_id}` (JWT Bearer required).

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

> **Caution — Option B shares your password.** Only run Option B with a **local agent you control and trust**; it sends your Spuree email and password to whatever agent executes it. Never enter your Spuree password into a hosted or third-party chat client (ChatGPT, Claude on the web, etc.), where it would be transmitted to that provider. When in doubt, prefer **Option C** (browser SSO — your password never reaches the agent) or **Option A** (create the key yourself in the web UI).

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
- If a key **is** ever pasted into a chat, treat it as exposed: create a new key, update every place the old one is stored, then revoke the old one. Places to check: your shell environment or profile, client/environment secrets (e.g. a Codex environment secret), Hermes's `.env` file (`~/.hermes/.env`; Windows: `%LOCALAPPDATA%\hermes\.env`), and on Windows the persisted User-scope variable — it lives in the registry (`HKCU\Environment`) and survives until you remove or replace it: `[Environment]::SetEnvironmentVariable("SPUREE_API_KEY", $null, "User")` deletes it.
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
| `401 invalid_token` on a connector call | The token expired or was revoked | Reconnect from your client's connector UI (e.g. ChatGPT: **Settings > Plugins > Spuree > Reconnect**) |
| `403 insufficient_scope` | The token lacks a required scope | Revoke at [studio.spuree.com/account/connections](https://studio.spuree.com/account/connections), then reconnect to re-consent to the full scope set |
| Spuree missing from `/mcp` in Claude Code | Session isn't authenticated with a claude.ai subscription login | Run `/status`; connectors don't load when `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `apiKeyHelper`, Bedrock/Vertex, or a setup token is active |
| *"does not support dynamic client registration"* when direct-adding in Claude Code | Spuree's OAuth server has no dynamic client registration | Add Spuree on claude.ai instead ([claude.ai/customize/connectors](https://claude.ai/customize/connectors)) and let it flow into Claude Code |
| `codex mcp add` or `codex mcp login` fails with *"does not support dynamic client registration"* or *"Invalid registration response"* | The server was added without `--oauth-client-id openai-codex`, so Codex tried to register itself | Remove the entry (`codex mcp remove spuree`), re-run the add command with the flag, then log in again |
| Codex: the consent screen never appears and Codex reports a redirect URI that does not match a registered URI | An older Codex that minted a per-server callback path, or a `mcp_oauth_callback_url` override on `localhost` instead of the IP literal | Upgrade Codex to 0.147 or newer, drop the `mcp_oauth_callback_url` override (or point it at `http://127.0.0.1/callback`), then log in again |
| No **Add custom MCP server** option in ChatGPT Plugins | You may be signed out, using a different workspace, or restricted by workspace settings | Sign in on the web, select the intended workspace, then ask your admin about custom MCP server access if the option is still missing |
| The ChatGPT plugin exists but is not available in a conversation | Creating or sharing a plugin does not install it for each user | Install the plugin, complete any connection prompts, then select it with an @ mention |
| Unknown-tool error in ChatGPT for `project_list` etc. | ChatGPT's Spuree surface has only `search`, `fetch`, `getting_started` and the video tools | Use those, or connect Codex or Claude for the full tool set |
| Connector doesn't appear in an existing conversation | Connectors are picked up at session start | Start a new chat — existing chats won't see the connector |
| `401` when refreshing a JWT | Refresh tokens are single-use; an old one was reused, or the 30-day refresh token expired | Log in again and store the newest `refresh_token` after every refresh |
| `POST /v1/api-keys` rejected when sent with `X-API-Key` | Key management requires a JWT Bearer, not an API key | Get a JWT via `/auth/token` (or the SSO flow) first |
| Repeated auth failures | Auth endpoints are rate-limited and repeated failed logins temporarily lock the account | Wait a few minutes and retry; slow down automated login attempts |
| Truncated results on large listings in Claude Code | MCP tool output is capped at 25,000 tokens by default | Raise the cap with the `MAX_MCP_OUTPUT_TOKENS` environment variable, or narrow the request |
| Skills installed, but the agent doesn't see them | The install didn't target your client — Claude Code reads `.claude/skills/`, which is only created when you select **Claude Code** in the installer's agent picker — or the agent was launched in a different folder than the install (project-level installs are only visible from that folder, for every client) | Re-run `npx skills add …` and select your client in the picker; launch the agent in the folder you installed into |
| Your agent can list a file in Documents, Desktop or Downloads but says it is not permitted to read it | macOS protects those folders per app; the process running your agent's commands may not hold the grant the app you type in holds | Copy the file to your Public folder (or the project folder your agent runs in) and tell it the new path, or upload it to the project in Spuree and let the agent fetch it. The server cannot read files on your computer |
| The agent makes your first post from a pasted prompt instead of the `first-post` skill | The skill is not in a location your client reads (project folder, global, or plugin), or the agent was launched in a different folder | Re-run `npx skills add …` for your client and launch it in that folder; confirm with `ls .agents/skills/first-post` (Codex) or `ls .claude/skills/first-post` (Claude Code) |
| Hermes: the key works in the CLI, but the desktop app says no key is set | The desktop agent doesn't inherit shell exports or Windows User-scope variables | Put the key in Hermes's `.env` file (`~/.hermes/.env`, Windows: `%LOCALAPPDATA%\hermes\.env`), quit the desktop app including the tray icon, relaunch |
| Hermes MCP server entry fails with *"Invalid registration response"* | The server entry has no `oauth.client_id`, so Hermes falls back to dynamic client registration, which Spuree's OAuth server doesn't offer | Add `"oauth": { "client_id": "hermes-agent" }` to the server entry, save, and authenticate again |
| `401 {"detail": "Invalid API key"}` on a V1 call | The key reached the API but doesn't exist or was revoked (a rotated-out key in a stale environment is the classic cause) | Create a new key at [studio.spuree.com/api-keys](https://studio.spuree.com/api-keys), update it everywhere it's stored, and restart the client |
| `401 "Authentication required…"` on a V1 call | No credential was sent at all — `SPUREE_API_KEY` isn't visible to the client's process | Set the variable and **fully restart** the client (environment variables are read at process start) |

Still stuck? On a connector surface, ask *"How do I use Spuree?"* (runs the `getting_started` tool); on the skills path, ask *"How do I use Spuree skills?"* (activates the getting-started skill). Both give a safe, read-only walkthrough that verifies your setup step by step.
