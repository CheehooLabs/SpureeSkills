---
name: voiceover
description: Speak a text with a voice the person may use and save it as an audio file in a Spuree folder — list the voices the API offers (their own, ones shared with them, the workspace's), quote the price in credits per character, get the person's explicit approval, then generate; only listed voice ids work, raw provider voice ids are rejected, and there is no retry key
---

# Voiceover

## Overview

Spuree turns text into speech with a voice the caller is allowed to use and
saves the result as an audio file in a folder or project the caller can edit.
Voiceovers are **paid**, per character of the text, and the debit is taken
before the speech is generated. This skill covers finding a voice, pricing a
line, speaking it, the order those must run in, and what to do when an answer
is lost, because this route has **no retry key**.

Use this skill when an agent needs to:

- Show the person which voices they can speak with, and who pays for each
- Tell the person what a given text will cost before anything is spent
- Generate the voiceover into a specific Spuree folder or project and hand back its file id
- Decide safely what to do when the generation call timed out or failed without a clear answer

For still images and music see the **image-generation** and
**music-generation** skills; for downloading the audio see **file-management**.

## Voices: only what the API lists

A voiceover names its speaker by a **Spuree voice id**, and the only valid ids
are the ones two list routes return:

| Source | Route | Where it may speak | Who pays |
| --- | --- | --- | --- |
| The person's own cloned voices (`mine`) | `GET /v1/me/voices` | Any folder | The person (see **Who pays**) |
| Voices other people shared with the person (`sharedWithMe`) | `GET /v1/me/voices` | Any folder | The voice's **owner**, up to the monthly credit limit they set for this person |
| The workspace's ready-made voices (`items`) | `GET /v1/workspaces/{workspaceId}/voices` | Folders of that workspace only; a voice with `scope.kind: "brand"` only in that brand's folders | The person (see **Who pays**) |

Rules:

- **Raw provider voice ids are rejected.** The API never returns the speech
  provider's own voice id, and `POST /v1/audio/text-to-speech` answers 404
  `voice_not_found` for any `voiceId` that is not a Spuree voice id the caller
  may use — a provider id, someone else's voice, a voice of another workspace,
  a brand voice used outside its brand, or a deleted voice all look the same.
- **List again before each voiceover.** A share can be revoked at any time and
  a workspace voice can be removed; a list from earlier in the session may be
  stale.
- **Ask the person which voice to use when they have not said.** Never pick
  one for them; the choice decides whose credits are spent. Offer the voice
  whose `labels.language` matches the text when there is one.
- Cloning a new voice and adding voices to a workspace happen in Spuree Studio
  (`https://studio.spuree.com/account/voice`), not through this skill. When
  both lists are empty, send the person there.
- The route also accepts `editorId` instead of `voiceId`: an editor of the
  folder's workspace who has a voice speaks with it. Give exactly one of the
  two.

## The order is mandatory: list → quote → show the price → explicit yes → generate

Every voiceover follows these steps, in this order, once per text:

1. **List** the voices (`GET /v1/me/voices`, and `GET /v1/workspaces/{workspaceId}/voices`
   for the folder's workspace) and let the person choose.
2. **Quote.** `POST /v1/billing/estimate` with `requestType: "text_to_speech"`
   and the exact body you will submit. It charges nothing.
3. **Show the price in credits** to the person, together with the voice, the
   folder or project the audio will be saved in, and **who pays** — the
   voice's owner for a shared voice, otherwise the person's workspace.
4. **Wait for an explicit yes.** A yes covers exactly one text with that voice
   into that folder. A changed text (even one word), another voice or another
   folder needs a new quote and a new yes. Never treat a general request
   ("narrate these") as approval for a batch.
5. **Generate** with `POST /v1/audio/text-to-speech`, sending the **identical
   `text`, `voiceId` and `folderId`** you quoted.
6. **If the answer was lost** (timeout, connection dropped, a 5xx without a
   known code), do **not** call again straight away: the voiceover may already
   be charged and saved. List the folder's files, look for a new audio file,
   and ask the person before any second call — a second call is a second paid
   voiceover.

**Nothing on the server enforces step 2–4.** `POST /v1/audio/text-to-speech`
accepts a request from an API key whether or not `/v1/billing/estimate` was
ever called, and an API key is not checked for the `render` scope that gates
the connector's `voiceover_generate` tool. The server's own gates (creator
access, folder edit permission, the speaker's resolution, the credit debit)
decide whether the caller *may* spend, not whether the person *agreed* to.
This skill's order is therefore the only guard against spending the person's
— or a voice owner's — credits without their yes. Follow it every time.

## Authentication

```
X-API-Key: $SPUREE_API_KEY
```

Or: `Authorization: Bearer $SPUREE_ACCESS_TOKEN`. See the **authentication** skill.

- With an **API key**, the workspace (for the list) and the folder's workspace
  (for the voiceover) must belong to one of the organizations the key is
  scoped to; otherwise the list answers 403 and the folder 404. API keys are
  not scope-checked, so the quote step above is the only thing between a key
  and a charge.
- With an **OAuth bearer** (the MCP connector), the lists and the quote need
  `read` and the generation needs `render`; without `render` the generation
  answers 403 `insufficient_scope`.
- Every caller must hold creator-API access (an organization with it enabled,
  or an individual allowlist entry) to generate; otherwise generation answers
  403 `ACCESS_DENIED`. The lists need no such access.

## Base URL

```
https://data.spuree.com/api/v1
```

## Who pays

**A shared voice is paid by its owner.** A voiceover with a voice from
`sharedWithMe` is charged to the owner's personal workspace, through the share
that reaches the person, and counted against that share's monthly limit
(`monthlyCreditLimit`; `null` means no limit; `spentThisMonth` and `resetsAt`
say where the month stands). The person is never charged for it. A share the
owner has since revoked is refused (403 `VOICE_NOT_SHARED`); a text whose
price would pass the limit is refused (403 `SHARE_LIMIT_REACHED`); an owner
whose workspace is out of credits is refused (402 `INSUFFICIENT_CREDITS`
with `details.payer: "voice_owner"`) — offer another voice, and never ask the
person to buy credits for someone else's voice.

**Every other voice** (the person's own, or the workspace's) is paid like any
other generation. The audio lands in `folderId`, and that folder decides who
may spend and which credits are charged:

| Situation | Outcome |
| --- | --- |
| The folder is inside a project and the caller is its owner, admin or editor **and** holds `owner`, `admin` or `member` in the project's workspace | Allowed, no per-person limit |
| The folder is inside a project and the caller is a commenter or viewer there | 403 `SPEND_NOT_PERMITTED` (`details.reason: "not_a_project_editor"`) |
| The caller is an editor in the project but only a `guest` in its workspace (invited from outside) | Allowed up to the credit limit the project owner set for them; past it, 403 `PROJECT_CREDIT_LIMIT_REACHED`. No limit set means 0 |
| The folder is not inside a project (for example under an asset) and the caller is a `guest`, or no member at all | 403 `SPEND_NOT_PERMITTED` |

Credits come from the caller's billing workspace when it can cover the price,
otherwise from their personal workspace, otherwise from the folder's
workspace. An API key scoped to organizations that exclude the billing
workspace's organization charges the folder's workspace directly. When you
show the price, name the voice, the folder or project and who pays; the person
chooses, and the choice decides whose credits are spent. If the person has
several workspaces and has not said which one, ask before you quote — do not
pick one for them.

A refused request is never charged. A generation that fails after the debit
(provider error, provider busy) is refunded.

## Endpoints

### GET /v1/me/voices

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

The caller's own cloned voices and the voices other people shared with them.
Free, read-only, no parameters. Works for any authenticated caller; a person
with no voices gets empty lists.

**Response:**

```json
{
  "mine": [
    {
      "id": "6700a1b2c3d4e5f6a7b8c9d0",
      "name": "My voice",
      "labels": { "language": "en" },
      "previewUrl": "https://...",
      "createdAt": "2026-10-02T08:00:00Z",
      "updatedAt": "2026-10-02T08:00:00Z",
      "sharedWith": [
        { "id": "6700a1b2c3d4e5f6a7b8c9e1", "granteeEmail": "colleague@example.com", "monthlyCreditLimit": 50, "spentThisMonth": 12, "createdAt": "2026-10-10T09:30:00Z" }
      ]
    }
  ],
  "sharedWithMe": [
    { "id": "6700a1b2c3d4e5f6a7b8c9f2", "name": "Alex's voice", "ownerName": "Alex", "monthlyCreditLimit": 50, "spentThisMonth": 12, "resetsAt": "2026-12-01T00:00:00Z" }
  ],
  "limit": 3
}
```

| Field | Type | Description |
| --- | --- | --- |
| `mine[].id` | string | The `voiceId` to send. Usable in any folder |
| `mine[].labels.language` | string? | The language the voice was recorded in, when known (`en`, `zh-Hant`, `zh`); it speaks other languages with that accent |
| `mine[].previewUrl` | string? | A short-lived link to the voice reading a fixed line; read it fresh from this list, never store it |
| `mine[].sharedWith[]` | array | The people this voice is shared with, each with the limit set for them and this month's spend |
| `sharedWithMe[].id` | string | The `voiceId` to send. Usable in any folder; **the owner pays** |
| `sharedWithMe[].ownerName` | string? | Who pays |
| `sharedWithMe[].monthlyCreditLimit` | integer \| null | The owner's limit for this person per UTC month; `null` is no limit. Credits left this month = limit − `spentThisMonth` |
| `sharedWithMe[].resetsAt` | datetime | When `spentThisMonth` goes back to 0 |
| `limit` | integer | How many voices of their own the person may hold |

| Code | Description |
| --- | --- |
| 200 | Lists returned (possibly empty) |
| 401 | Missing or invalid credentials |

```bash
curl "https://data.spuree.com/api/v1/me/voices" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

---

### GET /v1/workspaces/{workspaceId}/voices

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

The workspace's ready-made voices, the default first, then by name. Free,
read-only; any member of the workspace. Use the workspace the folder you will
speak into belongs to (`workspaceId` on the folder or project, **folder-management**
/ **project-management**).

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `workspaceId` | string (path) | Yes | 24-hex ObjectId of the workspace |

**Response:**

```json
{
  "items": [
    {
      "id": "6700a1b2c3d4e5f6a7b8c9a3",
      "name": "Narrator",
      "labels": { "language": "en", "accent": "american", "gender": "female", "age": "middle-aged", "description": "warm", "use_case": "narration" },
      "previewUrl": "https://...",
      "kind": "library",
      "scope": { "kind": "workspace", "brandId": null },
      "isDefault": true,
      "usedBy": [ { "kind": "editor", "id": "6700a1b2c3d4e5f6a7b8c9b4", "name": "Mia", "brandId": "6700a1b2c3d4e5f6a7b8c9c5" } ],
      "createdAt": "2026-09-20T10:00:00Z",
      "updatedAt": "2026-09-20T10:00:00Z"
    }
  ]
}
```

| Field | Type | Description |
| --- | --- | --- |
| `items[].id` | string | The `voiceId` to send. Usable only in this workspace's folders |
| `items[].scope` | object | `kind: "workspace"` speaks anywhere in the workspace; `kind: "brand"` with `brandId` speaks only in that brand's folders |
| `items[].isDefault` | boolean | The workspace's default voice; at most one |
| `items[].labels` | object | Descriptive labels (`language`, `accent`, `gender`, `age`, `description`, `use_case`), any of which may be absent |
| `items[].usedBy[]` | array | The brand editors and characters that speak with it (informational) |

Where a deployment has workspace voices switched off, this list is empty and a
workspace voice named directly answers 404 `voice_not_found`; the person's own
and shared voices still work.

| Code | Description |
| --- | --- |
| 200 | Voices returned (possibly empty) |
| 400 | `INVALID_PARAMETER` — malformed `workspaceId` |
| 401 | Missing or invalid credentials |
| 403 | `workspace_access_denied` — the caller is not a member of the workspace, or it is outside the API key's organizations. OAuth bearer without `read`: `insufficient_scope` |

```bash
curl "https://data.spuree.com/api/v1/workspaces/{workspaceId}/voices" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

---

### POST /v1/billing/estimate

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Price a voiceover before generating it. Reads nothing about any workspace's
balance and writes nothing; any authenticated caller may call it.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `requestType` | string (body) | Yes | `"text_to_speech"` |
| `payload` | object (body) | Yes | The body you will submit: `{"text", "voiceId", "folderId"}`. Only `text` affects the price. Unknown keys are ignored. |

**Count what the debit counts.** The debit bills the characters of `text`
*after* leading and trailing whitespace is removed; the estimate counts the
string exactly as sent. So trim the text yourself before quoting, send that
trimmed string to both calls, and the quote equals the charge. Characters are
counted as code points (a CJK character is one). The ceiling is 5,000
characters after trimming.

**Response:**

```json
{
  "requestType": "text_to_speech",
  "billable": true,
  "credits": 3,
  "dimensions": { "text_chars": 500 }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `billable` | boolean | `false` means no debit will be taken at all. Never render that as "price unknown". |
| `credits` | integer \| null | Credits this text will cost (per character, at least 1), or `null` when not billable. |
| `dimensions.text_chars` | integer | The character count that was priced. If it is not the length you expect, the text you sent is not the text you meant to price. |

The figure is produced by the same pricing function the debit uses, so quote
every time rather than counting characters yourself. It says what the text
costs, not whether the payer can cover it or whether a shared voice's monthly
limit allows it; both are decided at generation time.

| Code | Description |
| --- | --- |
| 200 | Price returned (also for a non-billable type, with `billable: false`) |
| 401 | Missing or invalid credentials |
| 422 | `requestType` missing (FastAPI validation body) |
| 429 | Rate limit exceeded; wait `Retry-After` seconds |

```bash
curl -X POST "https://data.spuree.com/api/v1/billing/estimate" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "requestType": "text_to_speech",
    "payload": {
      "text": "Welcome to the autumn collection. Every piece is made to last.",
      "voiceId": "6700a1b2c3d4e5f6a7b8c9a3",
      "folderId": "665f1a2b3c4d5e6f70810000"
    }
  }'
```

---

### POST /v1/audio/text-to-speech

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Speak `text` with one voice and register the result as an MP3 file in
`folderId`. **Paid**, per character: the credits quoted above are debited
before the speech is generated. Call it only after the person's explicit yes
for this exact text, voice and folder (see the order above).

Synchronous: the response is a completed job with the file id already in it.
There is no separate status or result route. Generation usually takes seconds;
allow at least 60 s for the HTTP call.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `text` | string (body) | Yes | The words to speak, verbatim. 1–5,000 characters after leading and trailing whitespace is removed; whitespace alone is refused. Send the trimmed string you quoted. |
| `voiceId` | string (body) | One of the two | An `id` from `GET /v1/me/voices` (`mine` or `sharedWithMe`) or from `GET /v1/workspaces/{workspaceId}/voices` for the folder's workspace. Never a provider's voice id. |
| `editorId` | string (body) | One of the two | An editor of the folder's workspace who has a voice; the editor's voice speaks. |
| `folderId` | string (body) | Yes | 24-hex ObjectId of the folder or project the audio is saved in. The caller must be able to edit it. |
| `label` | string (body) | No | What this voiceover is ("Intro narration"), up to 80 characters. Becomes the file's name; omitted, the start of the text names it. |

**There is no retry key.** The route takes no `operationId` and no
`Idempotency-Key`; every accepted call is a new paid voiceover. When a call
ends without a clear answer — a timeout, a dropped connection, or a 5xx whose
code is not in the table below — the voiceover may still be running and can be
charged and saved after your call gave up. Wait about a minute, list the
folder (`GET /v1/sessions/{sessionId}/files` in **folder-management**) and look
for a new audio file. If there is none, ask the person before calling again;
if there is one, that is the voiceover.

**Response (200):** a completed `AnimationJob`:

```json
{
  "id": "665f1a2b3c4d5e6f70819203",
  "jobType": "text_to_speech",
  "status": "completed",
  "createdBy": "you@example.com",
  "createdAt": "2026-11-03T09:12:44Z",
  "updatedAt": "2026-11-03T09:12:49Z",
  "folderId": "665f1a2b3c4d5e6f70810000",
  "input": {
    "text": "Welcome to the autumn collection. Every piece is made to last.",
    "voiceId": "6700a1b2c3d4e5f6a7b8c9a3",
    "editorId": null,
    "folderId": "665f1a2b3c4d5e6f70810000",
    "label": "Intro narration",
    "model": "eleven_v3"
  },
  "output": {
    "fileIds": { "audio": "665f1a2b3c4d5e6f70819999" },
    "voiceName": "Narrator",
    "characters": 62,
    "durationSec": 4.8
  },
  "error": null,
  "billing": null
}
```

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Job id (informational; there is no route to read it back) |
| `status` | string | `completed` on a 200 from this route |
| `folderId` | string | Where the audio was registered |
| `input.voiceId` | string | The Spuree voice that spoke — never the provider's id |
| `output.fileIds.audio` | string | The new MP3's id. `GET /v1/files/{fileId}` gives its `downloadUrl` and name; the Studio page is `https://studio.spuree.com/files/{fileId}` |
| `output.voiceName` | string | The voice's name |
| `output.characters` | integer \| null | The provider's own character count, when it reports one |
| `output.durationSec` | number | Approximate length in seconds |

**Status codes:**

| Code | Description |
| --- | --- |
| 200 | Voiceover generated and saved; completed job returned |
| 401 | Missing or invalid credentials |
| 402 | `INSUFFICIENT_CREDITS` — the payer cannot cover the price. `details.payer: "voice_owner"` means the shared voice's owner is out of credits (their balance is not shown): offer another voice. `details.payer: "project_owner"` means the project owner's credits are short: ask them to add credits. Otherwise the person's workspace is short and `details` carries `requiredCredits`, `spendableCredits` and `shortfallCredits` when known. `PLAN_LIMIT_EXCEEDED` — over the plan's limit. Nothing generated, nothing charged |
| 403 | `VOICE_NOT_SHARED` — the owner stopped sharing this voice with the person. `SHARE_LIMIT_REACHED` — the text would pass the owner's monthly limit; `details` carries `limit`, `spent` and `resetsAt`. `SPEND_NOT_PERMITTED` — the caller may not spend here (`details.reason`; `voice_owner_not_billed` means the shared voice's owner cannot be billed right now — offer another voice). `PROJECT_CREDIT_LIMIT_REACHED` — the per-person limit in this project is used up. `ACCESS_DENIED` — no creator-API access or no edit permission on the folder. OAuth bearer without `render`: `insufficient_scope`. Nothing charged |
| 404 | `voice_not_found` — not a voice the caller may use in this folder (a provider id, someone else's, another workspace's, another brand's, removed). `editor_not_found` — no such editor in the folder's workspace. `editor_has_no_voice`. Or `folderId` does not resolve to a folder the caller can see. Nothing charged |
| 422 | `VALIDATION_ERROR` — empty or whitespace-only `text`, more than 5,000 characters after trimming, both or neither of `voiceId` / `editorId`, a `label` over 80 characters, a malformed `folderId`. Nothing charged |
| 429 | Rate limit exceeded; wait `Retry-After` seconds. The request was not accepted, so retrying is not a second voiceover |
| 500 | `JOB_PROCESSING_FAILED` — the speech provider failed, was busy or rejected the text. The debit is refunded; the next attempt needs a new yes |

Errors use the V1 envelope: `{"error": {"code", "message", "requestId", "details"}}`.

```bash
curl -X POST "https://data.spuree.com/api/v1/audio/text-to-speech" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 90 \
  -d '{
    "text": "Welcome to the autumn collection. Every piece is made to last.",
    "voiceId": "6700a1b2c3d4e5f6a7b8c9a3",
    "folderId": "665f1a2b3c4d5e6f70810000",
    "label": "Intro narration"
  }'
```

## Error Handling

| Code | Meaning | Action |
| --- | --- | --- |
| 401 | Missing or invalid credentials | Refresh the token or check the API key |
| 402 `INSUFFICIENT_CREDITS` with `payer: "voice_owner"` | The shared voice's owner is out of credits | Nothing was charged. Say so and offer another voice; do not ask the person to buy credits for someone else's voice |
| 402 `INSUFFICIENT_CREDITS` with `payer: "project_owner"` | The project owner's credits are short | Nothing was charged. Ask the project owner to add credits |
| 402 `INSUFFICIENT_CREDITS` (other) / `PLAN_LIMIT_EXCEEDED` | The person's workspace cannot cover the text | Nothing was charged. Offer a shorter text, or credits added by a workspace owner or admin |
| 403 `VOICE_NOT_SHARED` | The share was revoked | Nothing was charged. List the voices again and ask which to use |
| 403 `SHARE_LIMIT_REACHED` | The owner's monthly limit for this person would be passed | Nothing was charged. Offer a shorter text, another voice, or waiting until `details.resetsAt`; only the owner can raise the limit |
| 403 `SPEND_NOT_PERMITTED` | The caller's role does not allow spending here, or (`voice_owner_not_billed`) the shared voice's owner cannot be billed now | Nothing was charged. Read `details.reason`; offer another voice, or ask a workspace admin / project owner for the role |
| 403 `PROJECT_CREDIT_LIMIT_REACHED` | The per-person limit the project owner set is used up | Nothing was charged. Ask the project owner to raise it |
| 403 `ACCESS_DENIED` / `insufficient_scope` | No creator-API access, no edit permission on the folder, or an OAuth token without `render` | Nothing was charged. Fix access or reconnect with the `render` scope |
| 404 `voice_not_found` / `editor_not_found` / `editor_has_no_voice` | The speaker is not one the caller may use in this folder | Nothing was charged. List the voices again (the folder's workspace for workspace voices) and ask the person which to use. A provider's own voice id never works |
| 404 (folder) | Folder not visible | Check the id and the API key's organization scope |
| 422 | Invalid body | Fix the request; nothing was charged |
| 429 | Rate limit exceeded | Wait `Retry-After` seconds, then send the same request once |
| 500 `JOB_PROCESSING_FAILED` | The generation failed after the debit | Refunded. Ask the person before trying once more |
| Timeout, connection lost, or a 5xx without a known code | The outcome is unknown; the voiceover may have been charged and saved | Wait about a minute, list the folder for a new audio file, and ask the person before any second call. A second call is a second paid voiceover |

## Workflow

1. Confirm with the person which folder or project the audio goes to (find it
   with **folder-management** or **project-management**); note its
   `workspaceId`.
2. `GET /v1/me/voices` and `GET /v1/workspaces/{workspaceId}/voices`. Show
   the choices with who pays for each; let the person pick. If both lists are
   empty, send them to `https://studio.spuree.com/account/voice`.
3. Trim the text. `POST /v1/billing/estimate` with
   `{"requestType": "text_to_speech", "payload": {"text", "voiceId", "folderId"}}`.
4. Tell the person: the price in credits, the character count, the voice, the
   folder, and who pays. Wait for their yes.
5. `POST /v1/audio/text-to-speech` with the identical `text`, `voiceId` and
   `folderId` (plus a `label` if useful).
6. On 200, give them `output.fileIds.audio`, `durationSec` and the Studio link
   `https://studio.spuree.com/files/{fileId}`; `GET /v1/files/{fileId}` has the
   `downloadUrl`.
7. On an unknown outcome, check the folder before anything else. For another
   text, go back to step 3 (and to step 2 if the voice may have changed).
