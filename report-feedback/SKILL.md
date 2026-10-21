---
name: report-feedback
description: Report a bug, share feedback or request a feature to the Spuree team on the person's behalf, and check what happened to the reports they already sent. Use when a user says "report this bug", "tell the Spuree team", "send feedback", "I wish Spuree could…", "feature request", "did anyone look at my report?", or "what happened to my bug report", and — once per conversation, as an offer only — after a Spuree tool fails on the server side. Always shows the person the exact text and files only after they say yes. Requires the MCP connector (`feedback_create`, `feedback_list`, `feedback_get`); with only an API key, send them to the Help menu in Studio.
---

# Report Feedback

Send the Spuree team a bug report or feedback in the person's own words, and
tell them what happened to the reports they already sent. A report is filed
**as the person** — it appears under "My reports" in Studio, the team reads it
and may reply there — so nothing is ever filed without their explicit yes.

## What this needs

This skill runs over the **MCP connector** (Claude Code, Codex, Cowork or another
client connected to `/mcp`). It uses three tools:

| Tool | What it does | Scope |
| --- | --- | --- |
| `feedback_create` | Files one bug report or piece of feedback as the person | `write` |
| `feedback_list` | Lists the person's own reports, newest first, with their status | `read` |
| `feedback_get` | Reads one of the person's own reports, including the team's reply | `read` |

If these tools are not in your tool list, do not look for another way to file.
Tell the person they can report it themselves in Studio: open the **Help** menu
(the "?" button) and choose **Report a bug** or **Share feedback**; **My
reports** in the same menu shows what happened to each one. A connector added
before these tools shipped can show a cached tool list without them: ask the
person to reconnect once.

These tools do not accept an API key. If a tool answers `insufficient_scope`,
tell the person which scope is missing (`write` to file, `read` to look reports
up) and that reconnecting the connector asks for it again.

## When to use it

- **The person asks.** "Report this", "tell the team", "send feedback", "file a
  bug", "I'd like a feature that…", "is anyone looking at my report?"
- **A Spuree tool failed on the server side.** Offer — do not file — **once per
  conversation**, after a tool call answers `upstream_unavailable`,
  `invalid_upstream_response`, or another 5xx-class failure:

  > "That looks like a problem on Spuree's side. Want me to send the team a
  > short bug report about it? I'll show you exactly what I'd send first."

  If they say no, or ignore it, do not offer again in this conversation.

Never offer a report for:

- validation errors (a missing field, a value out of range, a bad id) — fix the
  call instead;
- running out of credits, a plan limit, or a quote the person declined;
- a refusal that explains itself (a permission the person lacks, content the
  service will not generate, a feature that is off);
- the person's own mistake or a question you can answer.

## Filing a report

### 1. Choose the type

| The person wants to… | `type` | Description starts with |
| --- | --- | --- |
| Tell the team something is broken | `bug` | what they were doing |
| Share an opinion, praise or a complaint | `feedback` | the point, in their words |
| Ask for something Spuree does not do yet | `feedback` | `Feature request:` |

There is no separate feature-request type: a feature request is `feedback`
whose description starts with `Feature request:`.

### 2. Draft the description

Write it the way the person would say it to a colleague, 1–5000 characters:

- **Bug:** what they were trying to do, what happened, what they expected, and
  whether it happens every time. Name the tool that failed and the error it
  returned.
- **Feedback / feature request:** the request or opinion and why it matters to
  them.

Leave out anything secret: no access tokens, API keys, passwords, share links,
signed URLs or personal data the person did not choose to share.

### 3. Show it and ask

Show the person the **exact** type and description you will send, and any
context you will attach, then ask:

> "Here's the report I'll send to the Spuree team as you:
>
> **Bug** — *When I asked for a 15-second vertical video for my bakery brand,
> `video_generate` failed twice with `upstream_unavailable`. I expected the job
> to start; it happens every time today.*
>
> Send it?"

Edit it until they are happy. Only a clear yes counts. If they say no, drop it.

### 4. File it

Call `feedback_create` once, after the yes:

| Field | Required | Notes |
| --- | --- | --- |
| `type` | Yes | `bug` or `feedback` |
| `description` | Yes | The text the person approved, unchanged, 1–5000 characters |
| `personConfirmed` | Yes | Must be `true`. Send it only after the person said yes to this exact text |
| `idempotencyKey` | Yes | A fresh random id (for example a UUID) for this one report. Reuse the **same** key if you retry the same report after a timeout |
| `agentContext` | No | Facts about a failed tool call (below) |
| `workspaceId` | No | The workspace the problem happened in, when you know it |

`agentContext` is optional and best-effort. Include only what you observed:

| Field | Notes |
| --- | --- |
| `toolName` | The tool that failed, for example `video_generate` |
| `errorCode` | The error code it returned, for example `upstream_unavailable` |
| `httpStatus` | The HTTP status, when the tool reported one |
| `requestId` | A request or job id from the failed call, when there is one |
| `resourceIds` | Up to 10 ids of things involved — a brand, a post, a video job, a file |
| `clientSurface` | Where you are running, for example `claude-code` or `codex` |

**No screenshots or attachments.** If a file shows the problem and it is
already in Spuree, put its file id in `resourceIds` and say so in the
description. Do not upload a new file just to report a bug.

### 5. Tell them where it went

On success the tool returns `{id, status, replayed, reportsWebUrl, next}`.
Give the person `reportsWebUrl`: their report in **My reports** in Studio,
where they will see the team's status and any reply.

- `replayed: true` means this exact report was already filed (the same
  `idempotencyKey`); nothing new was sent. Say it is already with the team.
- Do not file the same problem again in this conversation. If something new
  happens, ask before filing a second report.

### When filing is refused

A refusal comes back as `{filed: false, reason, next}`. Follow `next`, tell the
person in plain words, and point them to **Help → Report a bug** in Studio as
the way to send it themselves:

| What happens | What to say |
| --- | --- |
| Agent filing is turned off right now | "I can't send reports for you at the moment. You can send it yourself from the Help menu in Studio." |
| Too many reports from agents recently | "I've hit the limit on reports I can send for you for now. You can still send it from the Help menu in Studio, or I can try later." |
| The tool is not available on this connection | "This connection can't send reports yet. You can send it from the Help menu in Studio." |

Never retry a refusal in a loop, and never paste the report into a comment, a
file or a post as a workaround.

## Checking on reports

When the person asks what happened to a report:

1. Call `feedback_list` (optional `page`, starting at 0). Each item carries its
   type, the start of the description, `status` and when it was sent; the
   result also carries `reportsWebUrl`.
2. If they mean a specific one, call `feedback_get` with its `reportId` to read
   the full report and any reply from the team.
3. Answer in plain words:

| `status` | What it means |
| --- | --- |
| `new` | The team has it and has not looked yet |
| `triaged` | The team has looked at it and is working out what to do |
| `resolved` | The team has finished with it; share their note if there is one |

The tools only ever return the person's own reports. A report id that is not
theirs, or no longer exists, is answered as not found — say "I can't find that
report" and offer the list instead.

## Principles

- **Their words, their yes.** Every report is filed as the person, with text
  they approved. Never file silently, and never file more than they agreed to.
- **One offer, then drop it.** Offer a report once per conversation after a
  server-side failure; never nag.
- **Facts, not guesses.** Context is what you saw — tool, error, ids — not a
  diagnosis.
- **Nothing secret.** No tokens, keys, share links or signed URLs in a report.
- **Point to Studio.** The person can always send or follow a report from the
  Help menu and My reports.
