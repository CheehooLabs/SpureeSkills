---
name: music-generation
description: Generate a music clip from a text prompt and save it as an audio file in a Spuree folder or project — quote the price in credits first (per clip for the default model, per second for the exact-length model), get the person's explicit approval, then generate; there is no retry key, so a lost answer is checked in the folder before any second call
---

# Music Generation

## Overview

Spuree generates music clips on request and saves each one as an audio file in
a folder or project the caller can edit. Generation is **paid**: every clip
debits credits from a workspace before the model runs. This skill covers the
two calls an agent needs — price a clip and generate it — the order they must
run in, and what to do when an answer is lost, because this route has **no
retry key**.

Use this skill when an agent needs to:

- Tell the person what one music clip will cost before anything is spent
- Generate a clip from a description (genre, instruments, mood, tempo, length)
- Save the result into a specific Spuree folder or project and hand back its file id
- Decide safely what to do when the generation call timed out or failed without a clear answer

For still images and voiceovers see the **image-generation** and **voiceover**
skills; for downloading the audio see **file-management**.

## Two models, two prices

| `model` | What it makes | How it is priced | `requestType` for the quote |
| --- | --- | --- | --- |
| omitted (the default) | A clip whose length the model takes from the prompt ("a 20-second upbeat intro") | Per clip, whatever the prompt | `text_to_music` |
| `music_v2_5` | A clip of exactly `lengthMs` milliseconds (3 000–60 000, default 30 000) | Per second of `lengthMs` | `elevenlabs_music_compose` |

`music_v2_5` is available only where that provider is enabled for the
deployment; elsewhere it answers 422 `VALIDATION_ERROR` with the message
`Model 'music_v2_5' is not available.` before anything is charged. When that
happens, offer the default model instead: drop `model` and `lengthMs`, put the
length in the prompt, and quote again.

## The order is mandatory: quote → show the price → explicit yes → generate

Every clip follows these steps, in this order, once per clip:

1. **Quote.** `POST /v1/billing/estimate` with the `requestType` and `payload`
   for the model and length you will submit (table above). It charges nothing
   and needs no workspace.
2. **Show the price in credits** to the person, together with the folder or
   project the audio will be saved in and how the charge is routed (see **Who
   pays**; the folder does not pick the payer).
3. **Wait for an explicit yes.** A yes covers exactly one clip with that model
   and length. A second clip, a different length or a different model needs a
   new quote and a new yes. Never treat a general request ("make me a few
   tracks") as approval for a batch.
4. **Generate** with `POST /v1/music/text-to-music`, with the **same `model`
   and `lengthMs`** you quoted.
5. **If the answer was lost** (timeout, connection dropped, a 5xx without a
   known code), do **not** call again straight away: the clip may already be
   charged and saved. List the folder's files, look for a new audio file, and
   ask the person before any second call — a second call is a second paid clip.

**Nothing on the server enforces step 1–3.** `POST /v1/music/text-to-music`
accepts a request from an API key whether or not `/v1/billing/estimate` was
ever called, and an API key is not checked for the `render` scope that gates
the connector's `music_generate` tool. The server's own gates (creator access,
folder edit permission, the credit debit) decide whether the caller *may*
spend, not whether the person *agreed* to. This skill's order is therefore the
only guard against spending the person's credits without their yes. Follow it
every time.

## Authentication

```
X-API-Key: $SPUREE_API_KEY
```

Or: `Authorization: Bearer $SPUREE_ACCESS_TOKEN`. See the **authentication** skill.

- With an **API key**, the folder's workspace must belong to one of the
  organizations the key is scoped to; otherwise the folder answers 404. API
  keys are not scope-checked, so the quote step above is the only thing
  between a key and a charge.
- With an **OAuth bearer** (the MCP connector), the quote needs `read` and the
  generation needs `render`; without `render` the generation answers 403
  `insufficient_scope`.
- Every caller must hold creator-API access (an organization with it enabled,
  or an individual allowlist entry); otherwise generation answers 403
  `ACCESS_DENIED`.

## Base URL

```
https://data.spuree.com/api/v1
```

## Who pays

The audio lands in `folderId`, and that folder decides who may spend and which
credits are charged:

| Situation | Outcome |
| --- | --- |
| The folder is inside a project and the caller is its owner, admin or editor **and** holds `owner`, `admin` or `member` in the project's workspace | Allowed, no per-person limit |
| The folder is inside a project and the caller is a commenter or viewer there | 403 `SPEND_NOT_PERMITTED` (`details.reason: "not_a_project_editor"`) |
| The caller is an editor in the project but only a `guest` in its workspace (invited from outside) | Allowed up to the credit limit the project owner set for them; past it, 403 `PROJECT_CREDIT_LIMIT_REACHED`. No limit set means 0 |
| The folder is not inside a project (for example under an asset) and the caller is a `guest`, or no member at all | 403 `SPEND_NOT_PERMITTED` |

The folder decides **where the audio is saved and who may spend there**. It
does not choose the payer. No request parameter selects the payer either; the
server routes the charge: the caller's billing workspace when it can cover
the price, otherwise their personal workspace, otherwise the folder's
workspace. An API key scoped to organizations that exclude the billing
workspace's organization skips that workspace and charges the folder's
workspace directly. So the payer can differ from the folder's workspace.

When you show the price, name the folder or project and the workspace it
belongs to, then state the routing in those words: "charged to your billing
workspace if it covers the price, otherwise your personal workspace, otherwise
this folder's workspace". `GET /v1/me/permissions` (**workspace-management**)
tells you the caller's `billingWorkspaceId`; balances decide the rest, and the
quote does not reveal them. If you cannot tell which workspace will be charged,
say so and do not name one.

A refused request is never charged. A generation that fails after the debit
(vendor error, vendor busy) is refunded.

## Endpoints

### POST /v1/billing/estimate

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Price one clip before generating it. Reads nothing about any workspace's
balance and writes nothing; any authenticated caller may call it.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `requestType` | string (body) | Yes | `"text_to_music"` for the default model; `"elevenlabs_music_compose"` for `music_v2_5` |
| `payload` | object (body) | No | For the default model, `{}` (the price does not depend on the prompt). For `music_v2_5`, `{"model": "music_v2_5", "lengthMs": <ms>}` with the exact `lengthMs` you will submit — a quote at one length and a generation at another are two different prices. Unknown keys are ignored. |

**Response (default model):**

```json
{
  "requestType": "text_to_music",
  "billable": true,
  "credits": 7,
  "dimensions": {}
}
```

**Response (`music_v2_5`, 30 s):**

```json
{
  "requestType": "elevenlabs_music_compose",
  "billable": true,
  "credits": 6,
  "dimensions": { "model_id": "music_v2_5", "duration_sec": 30.0 }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `billable` | boolean | `false` means no debit will be taken at all. Never render that as "price unknown". |
| `credits` | integer \| null | Credits the clip will cost, or `null` when not billable. |
| `dimensions` | object | The pricing axes actually read from `payload`. For `music_v2_5`, `duration_sec` must show the length you sent; if it is missing, the payload was not read and the price is the reference price, not yours. |

The figure is produced by the same pricing function the debit uses, so quote
every time rather than remembering a number. It says what the clip costs, not
whether the workspace can pay; affordability is decided at generation time.
The quote does not check whether `music_v2_5` is enabled; only the generation
does.

| Code | Description |
| --- | --- |
| 200 | Price returned (also for a non-billable type, with `billable: false`) |
| 401 | Missing or invalid credentials |
| 422 | `requestType` missing (FastAPI validation body) |
| 429 | Rate limit exceeded; wait `Retry-After` seconds |

```bash
# Default model: priced per clip
curl -X POST "https://data.spuree.com/api/v1/billing/estimate" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"requestType": "text_to_music", "payload": {}}'

# music_v2_5: priced by the exact length you will submit
curl -X POST "https://data.spuree.com/api/v1/billing/estimate" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"requestType": "elevenlabs_music_compose", "payload": {"model": "music_v2_5", "lengthMs": 30000}}'
```

---

### POST /v1/music/text-to-music

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Generate one clip and register it as an audio file in `folderId`. **Paid**:
the credits quoted above are debited before the model runs. Call it only after
the person's explicit yes for this exact clip (see the order above).

Synchronous: the response is a completed job with the file id already in it.
There is no separate status or result route. Generation usually takes well
under a minute; allow at least 60 s for the HTTP call.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string (body) | Yes | Genre, instruments, mood, tempo — and, for the default model, the length. Non-empty. |
| `folderId` | string (body) | Yes | 24-hex ObjectId of the folder or project the audio is saved in. The caller must be able to edit it. |
| `model` | string (body) | No | Omit for the default model. `music_v2_5` makes exactly `lengthMs`. Any other value is 422. |
| `lengthMs` | integer (body) | No | Exact length in milliseconds, 3000–60000, default 30000. `music_v2_5` only: with the default model it is 422. Send the value you quoted. |

**There is no retry key.** The route takes no `operationId` and no
`Idempotency-Key`; every accepted call is a new paid clip. When a call ends
without a clear answer — a timeout, a dropped connection, or a 5xx whose code
is not in the table below — the clip may still be running and can be charged
and saved after your call gave up. Wait about a minute, list the folder
(`GET /v1/sessions/{sessionId}/files` in **folder-management**) and look for a
new audio file. If there is none, ask the person before calling again; if
there is one, that is the clip.

**Response (200):** a completed `AnimationJob`:

```json
{
  "id": "665f1a2b3c4d5e6f70819203",
  "jobType": "text_to_music",
  "status": "completed",
  "createdBy": "you@example.com",
  "createdAt": "2026-11-03T09:12:44Z",
  "updatedAt": "2026-11-03T09:13:09Z",
  "folderId": "665f1a2b3c4d5e6f70810000",
  "input": {
    "prompt": "A 20-second upbeat acoustic intro, guitar and light percussion",
    "folderId": "665f1a2b3c4d5e6f70810000",
    "model": "lyria-3-pro-preview"
  },
  "output": { "tokens": 321, "fileIds": { "audio": "665f1a2b3c4d5e6f70819999" } },
  "error": null,
  "billing": null
}
```

With `music_v2_5`, `input` carries `model: "music_v2_5"` and `lengthMs`, and
`output` is `{ "fileIds": { "audio": "<fileId>" }, "lengthMs": 30000 }`.

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Job id (informational; there is no route to read it back) |
| `status` | string | `completed` on a 200 from this route |
| `folderId` | string | Where the audio was registered |
| `input` | object | The request as accepted. The default model is recorded as the model the generation ran and was priced on |
| `output.fileIds.audio` | string | The new file's id. `GET /v1/files/{fileId}` gives its `downloadUrl` and name; the Studio page is `https://studio.spuree.com/files/{fileId}` |
| `output.lengthMs` | integer | `music_v2_5` only: the length made |
| `output.tokens` | integer | Default model only: vendor token count, informational |

**Status codes:**

| Code | Description |
| --- | --- |
| 200 | Clip generated and saved; completed job returned |
| 401 | Missing or invalid credentials |
| 402 | `INSUFFICIENT_CREDITS` — the paying workspace cannot cover the price; `details` carries `requiredCredits`, `spendableCredits` and `shortfallCredits` when known. `PLAN_LIMIT_EXCEEDED` — over the workspace plan's limit. Nothing generated, nothing charged |
| 403 | `ACCESS_DENIED` — no creator-API access, or no edit permission on the folder. `SPEND_NOT_PERMITTED` — the caller may not spend here (`details.reason`). `PROJECT_CREDIT_LIMIT_REACHED` — the per-person limit in this project is used up. OAuth bearer without `render`: `insufficient_scope`. Nothing charged |
| 404 | `folderId` does not resolve to a folder the caller can see (deleted, or outside an API key's organizations) |
| 422 | `VALIDATION_ERROR` — empty `prompt`, malformed `folderId`, `lengthMs` outside 3000–60000, `lengthMs` with the default model, an unknown `model`, or `music_v2_5` where it is not enabled (`Model 'music_v2_5' is not available.`). Nothing charged |
| 429 | Rate limit exceeded; wait `Retry-After` seconds. The request was not accepted, so retrying is not a second clip |
| 500 | `JOB_PROCESSING_FAILED` — the model failed or was busy. The debit is refunded; the next attempt needs a new yes |

Errors use the V1 envelope: `{"error": {"code", "message", "requestId", "details"}}`.

```bash
# Default model
curl -X POST "https://data.spuree.com/api/v1/music/text-to-music" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 90 \
  -d '{
    "prompt": "A 20-second upbeat acoustic intro, guitar and light percussion",
    "folderId": "665f1a2b3c4d5e6f70810000"
  }'

# Exact length with music_v2_5 (where enabled)
curl -X POST "https://data.spuree.com/api/v1/music/text-to-music" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 90 \
  -d '{
    "prompt": "Warm lo-fi beat, soft piano, vinyl crackle",
    "folderId": "665f1a2b3c4d5e6f70810000",
    "model": "music_v2_5",
    "lengthMs": 30000
  }'
```

## Error Handling

| Code | Meaning | Action |
| --- | --- | --- |
| 401 | Missing or invalid credentials | Refresh the token or check the API key |
| 402 `INSUFFICIENT_CREDITS` / `PLAN_LIMIT_EXCEEDED` | The paying workspace cannot cover the clip | Nothing was charged. Tell the person; a workspace owner or admin can add credits or change the plan. Do not retry until they have |
| 403 `SPEND_NOT_PERMITTED` | The caller's role does not allow spending in this folder | Nothing was charged. Read `details.reason`; a workspace admin can promote a guest, a project owner can make a viewer an editor |
| 403 `PROJECT_CREDIT_LIMIT_REACHED` | The per-person limit the project owner set is used up | Nothing was charged. Ask the project owner to raise it |
| 403 `ACCESS_DENIED` / `insufficient_scope` | No creator-API access, no edit permission on the folder, or an OAuth token without `render` | Nothing was charged. Fix access or reconnect with the `render` scope |
| 404 | Folder not visible | Check the id and the API key's organization scope |
| 422 `VALIDATION_ERROR` naming `music_v2_5` | That model is not enabled here | Nothing was charged. Offer the default model: drop `model` and `lengthMs`, say the length in the prompt, quote again |
| 422 (other) | Invalid body | Fix the request; nothing was charged |
| 429 | Rate limit exceeded | Wait `Retry-After` seconds, then send the same request once |
| 500 `JOB_PROCESSING_FAILED` | The generation failed after the debit | Refunded. Ask the person before trying once more |
| Timeout, connection lost, or a 5xx without a known code | The outcome is unknown; the clip may have been charged and saved | Wait about a minute, list the folder for a new audio file, and ask the person before any second call. A second call is a second paid clip |

## Workflow

1. Confirm with the person which folder or project the clip goes to (find it
   with **folder-management** or **project-management**). This sets the
   destination and who may spend there; it does not pick the payer.
2. Pick the model with them: the default when the length can be approximate,
   `music_v2_5` when it must be exact (and where it is enabled).
3. `POST /v1/billing/estimate` with the matching `requestType` and, for
   `music_v2_5`, the exact `lengthMs`.
4. Tell the person: the price in credits, the model and length, the folder,
   and the payer routing (billing workspace first, then personal workspace,
   then the folder's workspace; the payer can differ from the folder's
   workspace). Wait for their yes.
5. `POST /v1/music/text-to-music` with the same `model` and `lengthMs`.
6. On 200, give them `output.fileIds.audio` and the Studio link
   `https://studio.spuree.com/files/{fileId}`; `GET /v1/files/{fileId}` has the
   `downloadUrl`.
7. On an unknown outcome, check the folder before anything else. For a second
   clip, go back to step 3.
