---
name: image-generation
description: Generate a still image from a text prompt (optionally guided by reference images already in Spuree) and save it as a PNG in a Spuree folder or project — quote the price in credits first, get the person's explicit approval, then generate with a stable operationId that lets you recover a lost result without paying twice
---

# Image Generation

## Overview

Spuree generates still images on request and saves each one as a PNG file in a
folder or project the caller can edit. Generation is **paid**: every image
debits credits from a workspace before the model runs. This skill covers the
three calls an agent needs — price an image, generate it, and re-read a
generation whose answer was lost — and the order they must run in.

Use this skill when an agent needs to:

- Tell the person what one image will cost before anything is spent
- Generate an image from a prompt, with or without up to 9 reference images
- Save the result into a specific Spuree folder or project and hand back its file id
- Recover the outcome of a generation whose response never arrived, without generating (or paying for) a second one

For voiceovers and music see the **voiceover** and **music-generation** skills;
for uploading reference images and downloading the PNG see **file-management**.

## The order is mandatory: quote → show the price → explicit yes → generate

Every generation follows these steps, in this order, once per image:

1. **Quote.** `POST /v1/billing/estimate` with `requestType: "text_to_image"`.
   It charges nothing and needs no workspace.
2. **Show the price in credits** to the person, together with the folder or
   project the PNG will be saved in and how the charge is routed (see **Who
   pays**; the folder does not pick the payer).
3. **Wait for an explicit yes.** A yes covers exactly one image. A second image,
   a different prompt, a different ratio or different references needs a new
   yes. Never treat a general request ("make me some pictures") as approval for
   a batch; price and confirm each one.
4. **Generate** with `POST /v1/images/text-to-image`, with a **new UUID as
   `operationId`** for that approved image.
5. **If the answer was lost**, call the same route again with the **same
   `operationId` and byte-identical arguments**, or read
   `GET /v1/images/text-to-image/{id}` when you know the job id. Neither
   charges a second time. Never start a new `operationId` to find out what
   happened to the old one.

**Nothing on the server enforces step 1–3.** `POST /v1/images/text-to-image`
accepts a request from an API key whether or not `/v1/billing/estimate` was
ever called, and an API key is not checked for the `render` scope that gates
the connector's `image_generate` tool. The server's own gates (creator access,
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
  organizations the key is scoped to; otherwise the folder answers 404 and the
  job reader answers 404 as well. API keys are not scope-checked, so the quote
  step above is the only thing between a key and a charge.
- With an **OAuth bearer** (the MCP connector), the quote and the job reader
  need `read` and the generation needs `render`; without `render` the
  generation answers 403 `insufficient_scope`.
- Every caller must hold creator-API access (an organization with it enabled,
  or an individual allowlist entry); otherwise generation answers 403
  `ACCESS_DENIED`.

## Base URL

```
https://data.spuree.com/api/v1
```

## Who pays

The PNG lands in `folderId`, and that folder decides who may spend and which
credits are charged:

| Situation | Outcome |
| --- | --- |
| The folder is inside a project and the caller is its owner, admin or editor **and** holds `owner`, `admin` or `member` in the project's workspace | Allowed, no per-person limit |
| The folder is inside a project and the caller is a commenter or viewer there | 403 `SPEND_NOT_PERMITTED` (`details.reason: "not_a_project_editor"`) |
| The caller is an editor in the project but only a `guest` in its workspace (invited from outside) | Allowed up to the credit limit the project owner set for them; past it, 403 `PROJECT_CREDIT_LIMIT_REACHED`. No limit set means 0 |
| The folder is not inside a project (for example under an asset) and the caller is a `guest`, or no member at all | 403 `SPEND_NOT_PERMITTED` |

The folder decides **where the PNG is saved and who may spend there**. It
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
(vendor error, references that could not be loaded) is refunded.

## Endpoints

### POST /v1/billing/estimate

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Price one image before generating it. Reads nothing about any workspace's
balance and writes nothing; any authenticated caller may call it.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `requestType` | string (body) | Yes | `"text_to_image"` |
| `payload` | object (body) | No | The body you are about to send to `POST /v1/images/text-to-image`. The image price does not depend on the prompt, ratio or references, so `{}` prices the same as the full body. Unknown keys are ignored. |

**Response:**

```json
{
  "requestType": "text_to_image",
  "billable": true,
  "credits": 3,
  "dimensions": { "model_id": "gemini-3.1-flash-lite-image" }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `billable` | boolean | `false` means no debit will be taken at all. Never render that as "price unknown". |
| `credits` | integer \| null | Credits one image will cost, or `null` when not billable. |
| `dimensions` | object | The pricing axes actually read. For images this is the model the service runs; the caller cannot choose it. |

The figure is produced by the same pricing function the debit uses, so quote
every time rather than remembering a number: the price can change with the
model or the rates. It says what the image costs, not whether the workspace can
pay; affordability is decided at generation time.

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
  -d '{"requestType": "text_to_image", "payload": {}}'
```

---

### POST /v1/images/text-to-image

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Generate one image and register it as a PNG file in `folderId`. **Paid**: the
credits quoted above are debited before the model runs. Call it only after the
person's explicit yes for this exact image (see the order above).

Synchronous: the response is a completed job with the file id already in it.
Generation takes seconds; allow at least 60 s for the HTTP call.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `prompt` | string (body) | Yes | What the image shows. Non-empty. |
| `folderId` | string (body) | Yes | 24-hex ObjectId of the folder or project the PNG is saved in. The caller must be able to edit it. |
| `operationId` | string (body) | Required by this skill | A UUID you mint for this one approved image. Optional on the wire, but without it a lost answer cannot be recovered and any retry is a second paid image, so always send one. |
| `referenceImageFileIds` | string[] (body) | No | Up to 9 Spuree file ids of images the result should follow (a character, product, place or style). They must already be files in Spuree that the caller can read — not local paths, URLs or chat attachments. |
| `aspectRatio` | string (body) | No | `16:9`, `9:16` or `1:1`. Omit for the model's default. |
| `fileName` | string (body) | No | Name for the PNG, without extension, up to 255 characters. |

**How `operationId` works.** The server remembers each `operationId` with a
fingerprint of the arguments it was first used with.

- Same id, identical arguments, generation finished → the original completed
  job is returned; nothing is generated or charged.
- Same id while the first call is still running or its outcome is not yet
  known → 409 with `details.code: "image_generation_pending"` and
  `details.jobId` when known. Wait a few seconds and call again with the same
  id, or read `GET /v1/images/text-to-image/{jobId}`.
- Same id after the first attempt failed → 409
  `details.code: "image_generation_failed"`. The charge was refunded. A new
  attempt needs the person's yes again and a **new** UUID.
- Same id with different arguments → 409
  `details.code: "image_operation_conflict"`. The id is spent; a different
  image needs a new UUID (and a new yes).

**Output naming.** With `fileName`, that name is used. Without it and without
references, the prompt names the file (`a robot on a beach` →
`a_robot_on_a_beach.png`). With references the prompt describes the input, so
the output is named `generated_image_<UTC timestamp>_<6 hex>`. A name already
taken in the folder gains `_v2`, `_v3`; read the final name from
`GET /v1/files/{fileId}` (**file-management**) rather than recomputing it.

**Response (200):** a completed `AnimationJob`:

```json
{
  "id": "665f1a2b3c4d5e6f70819203",
  "jobType": "text_to_image",
  "status": "completed",
  "createdBy": "you@example.com",
  "createdAt": "2026-11-03T09:12:44Z",
  "updatedAt": "2026-11-03T09:12:51Z",
  "folderId": "665f1a2b3c4d5e6f70810000",
  "input": {
    "operationId": "2f1c7d3e-9b4a-4c8e-8e1a-5b6d7c8e9f00",
    "prompt": "A ceramic mug on a wooden table, soft morning light",
    "fileName": null,
    "folderId": "665f1a2b3c4d5e6f70810000",
    "referenceImageFileIds": [],
    "aspectRatio": "1:1",
    "model": "gemini-3.1-flash-lite-image"
  },
  "output": { "tokens": 1120, "fileIds": { "png": "665f1a2b3c4d5e6f70819999" } },
  "error": null,
  "billing": null
}
```

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Job id; pass it to `GET /v1/images/text-to-image/{id}` |
| `status` | string | `completed` on a 200 from this route |
| `folderId` | string | Where the PNG was registered |
| `input` | object | The request as accepted, plus `model`, the image model the generation ran and was priced on (not a request field) |
| `output.fileIds.png` | string | The new file's id. `GET /v1/files/{fileId}` gives its `downloadUrl` and final `fileName`; the Studio page is `https://studio.spuree.com/files/{fileId}` |
| `output.tokens` | integer | Vendor token count, informational |
| `billing` | null | Not computed on this route; the job reader below fills it |

**Status codes:**

| Code | Description |
| --- | --- |
| 200 | Image generated and saved; completed job returned |
| 401 | Missing or invalid credentials |
| 402 | `INSUFFICIENT_CREDITS` — the paying workspace cannot cover the price; `details` carries `requiredCredits`, `spendableCredits` and `shortfallCredits` when known. `PLAN_LIMIT_EXCEEDED` — over the workspace plan's limit. Nothing generated, nothing charged |
| 403 | `ACCESS_DENIED` — no creator-API access, or no edit permission on the folder. `SPEND_NOT_PERMITTED` — the caller may not spend here (`details.reason`). `PROJECT_CREDIT_LIMIT_REACHED` — the per-person limit in this project is used up. OAuth bearer without `render`: `insufficient_scope`. Nothing charged |
| 404 | `folderId` does not resolve to a folder the caller can see (deleted, or outside an API key's organizations) |
| 409 | `CONFLICT` with `details.code` one of `image_generation_pending`, `image_generation_failed`, `image_operation_conflict` (see above) and `details.jobId` when known |
| 422 | `VALIDATION_ERROR` — empty `prompt`, malformed `folderId`, more than 9 references, an unknown `aspectRatio`, `operationId` not a UUID |
| 429 | Rate limit exceeded; wait `Retry-After` seconds, then retry with the same `operationId` |
| 500 | `JOB_PROCESSING_FAILED` — the model failed, or none of the reference images could be loaded. The debit is refunded; the next attempt needs a new yes and a new `operationId` |

Errors use the V1 envelope: `{"error": {"code", "message", "requestId", "details"}}`.

```bash
curl -X POST "https://data.spuree.com/api/v1/images/text-to-image" \
  -H "X-API-Key: $SPUREE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "operationId": "2f1c7d3e-9b4a-4c8e-8e1a-5b6d7c8e9f00",
    "prompt": "A ceramic mug on a wooden table, soft morning light",
    "folderId": "665f1a2b3c4d5e6f70810000",
    "aspectRatio": "1:1"
  }'
```

---

### GET /v1/images/text-to-image/{id}

<!-- spuree-agent
surfaces: ["local", "desktop", "backend", "hosted-web"]
webSafe: true
-->

Read a generation you submitted, without generating anything. Use it when a
409 gave you `details.jobId`, or when you kept the job id from a response and
want to confirm what was charged.

| Parameter | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string (path) | Yes | The job id from `POST /v1/images/text-to-image` or from a 409's `details.jobId` |

**Response (200):** the same `AnimationJob` shape, with `billing` filled in:

| `billing` field | Description |
| --- | --- |
| `state` | `settled` (charged and kept), `debited` (charged, outcome still open), `rejected` (the debit refused: 402/403), `none`, `not_metered`, `not_billable`, or `unknown` when the ledger could not be read (never shown as zero) |
| `chargedCredits`, `refundedCredits`, `reservedCredits` | The figures behind `state` |
| `failureClass` | `none`, `validation`, `balance`, `permission`, `provider` (vendor failed after the debit; refunded) or `delivery` (made but could not be stored; refunded) |
| `providerStarted` | Whether the model was reached |

| Code | Description |
| --- | --- |
| 200 | Job returned |
| 401 | Missing or invalid credentials |
| 404 | `ANIMATION_JOB_NOT_FOUND` — no such job, another user's job, a deleted folder, or a job outside an API key's organizations; all collapse to 404 |

```bash
curl "https://data.spuree.com/api/v1/images/text-to-image/665f1a2b3c4d5e6f70819203" \
  -H "X-API-Key: $SPUREE_API_KEY"
```

## Error Handling

| Code | Meaning | Action |
| --- | --- | --- |
| 401 | Missing or invalid credentials | Refresh the token or check the API key |
| 402 `INSUFFICIENT_CREDITS` / `PLAN_LIMIT_EXCEEDED` | The paying workspace cannot cover the image | Nothing was charged. Tell the person; a workspace owner or admin can add credits or change the plan. Do not retry until they have |
| 403 `SPEND_NOT_PERMITTED` | The caller's role does not allow spending in this folder | Nothing was charged. Read `details.reason`; a workspace admin can promote a guest, a project owner can make a viewer an editor |
| 403 `PROJECT_CREDIT_LIMIT_REACHED` | The per-person limit the project owner set is used up | Nothing was charged. Ask the project owner to raise it |
| 403 `ACCESS_DENIED` / `insufficient_scope` | No creator-API access, no edit permission on the folder, or an OAuth token without `render` | Nothing was charged. Fix access or reconnect with the `render` scope |
| 404 | Folder or job not visible | Check the id and the API key's organization scope |
| 409 `image_generation_pending` | The same `operationId` is still running | Wait a few seconds; retry with the same `operationId`, or read the job by `details.jobId` |
| 409 `image_generation_failed` | The same `operationId` failed earlier | Refunded. Ask the person again; use a new `operationId` |
| 409 `image_operation_conflict` | The `operationId` was used with different arguments | Use a new `operationId` for the new image (after a yes) |
| 422 | Invalid body | Fix the request; nothing was charged |
| 429 | Rate limit exceeded | Wait `Retry-After` seconds, then retry with the same `operationId` |
| 500 `JOB_PROCESSING_FAILED` | The generation failed after the debit | Refunded. Ask the person before trying again, with a new `operationId` |
| Timeout, connection lost, or a 5xx without a known code | The outcome is unknown | Call again with the **same** `operationId` and unchanged arguments; it returns the image if one was made and never charges twice. Do not mint a new id to find out |

## Workflow

1. Confirm with the person which folder or project the image goes to (find it
   with **folder-management** or **project-management**). This sets the
   destination and who may spend there; it does not pick the payer.
2. `POST /v1/billing/estimate` with `{"requestType": "text_to_image", "payload": {}}`.
3. Tell the person: the price in credits, the folder, the payer routing
   (billing workspace first, then personal workspace, then the folder's
   workspace; the payer can differ from the folder's workspace), and what you
   will generate. Wait for their yes.
4. Mint a UUID and `POST /v1/images/text-to-image` with it as `operationId`.
5. On 200, give them `output.fileIds.png` and the Studio link
   `https://studio.spuree.com/files/{fileId}`; `GET /v1/files/{fileId}` has the
   `downloadUrl`.
6. On an unknown outcome, repeat step 4 with the same `operationId`. For a
   second image, go back to step 2.
