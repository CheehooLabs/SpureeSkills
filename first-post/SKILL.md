---
name: first-post
description: Take a new Spuree workspace from nothing to a reviewable social post draft with the person's own agent — for a business, a product, or the person themselves (a personal brand with no website and no files is a complete answer). Create the brand, hand it their material or a one-page brand brief they approve, quote the cost, run ONE brand memory build, study a reference reel for pacing, generate a short vertical video, and draft the post under the brand. Use when a user says "make my first post", "set up my brand and make a post", "I'm the brand", "start my first campaign", "turn this reel into a post for my brand", or arrives from Studio's "make your first post with your own agent" onboarding prompt. Requires the MCP connector (brand and post tools); with only an API key, point them to the connector first.
---

# First Post

Walk a person from an empty workspace to a post draft they can open in Studio and
approve. The aha moment is the draft link at the end, with their brand's voice
and a video shaped like a reel they like. Speak in plain language, one step at a
time, and never spend credits without an explicit yes.

## What this needs

This playbook runs over the **MCP connector** (Claude Code, Codex or Cowork
connected to `/mcp`): it uses `brand_lookup`, `brand_create`,
`file_upload_start` / `file_upload_complete`, `brand_build_start`,
`brand_build_status`, `brand_pending_read` / `brand_pending_commit`,
`video_generate` / `video_get_status` / `video_get_result`,
`post_draft_create`, `post_get`, `post_video_attach`, `file_search`, and
`project_list` / `project_create`. If `brand_create` is not among your tools,
say so and send the person to the **Connect your AI tools** guide in Studio to add
the connector — the brand and post routes do not accept an API key.

Three more tools may appear in your tool list; this playbook names them by purpose
and never guesses their shape: **the quote tool** prices the remaining
workflow, **the capabilities/preset answer** says which video settings
are supported, and **the persisted first-post state** keeps your
progress across sessions. Use each when it is in your tool list; the fallback for
each is written where it is used.

Scopes: the person must have approved `read`, `write` and `render` at consent.
`render` is what lets you start the paid steps — the brand build and the video.
If a tool answers `insufficient_scope`, tell them which scope is missing and how
to reconnect.

Start every session by reading your saved state back (**What you save**, below)
and resuming where it says you are. Never restart the intake because a session
ended.

You also need to be able to **read local files and make HTTP requests**: the
person's brand material and the reference reel are uploaded from their machine by
PUTting bytes to a presigned URL. Being able to list a file is not the same as
being able to read it — check the bytes first (**Local files**, below) before you
plan around a path.

## What you save

Before each paid call, and whenever an id arrives, write
`{workspaceId, projectId, kbEntityId, buildId, idempotencyKey, jobId, postId, version}`
— whatever you have so far — to **the persisted first-post state**
when that tool is in your tool list, otherwise to `first-post-state.json` in the
folder you are working in. Read it back at the start of every session and after
any uncertain outcome (a timeout, `upstream_unavailable`, a dropped connection)
before deciding what to do next: a saved `buildId` means poll, not start; a saved
`idempotencyKey` means retry with the same key and body, not a new job; a saved
`kbEntityId` means reuse, not create. The person never repeats an answer because
your session ended.

## Phase 0 — Who and what

One message, five slots. Pre-fill every slot from what the person (or the
onboarding prompt) already said and ask only about the empty ones. A sparse
answer ("tennis coach, Seattle") fills a slot; never pad it with facts you were
not given.

1. **Who or what.** "Are you promoting a business or product, or yourself — a
   personal brand?" Then the name and one line on what it is. For a personal
   brand: what they do and for whom, in their words. A name alone does not tell
   a person from a persona or a shop; this question is how you find out.
2. **Website**, optional. For a business it becomes the brand's identity key and
   the build's main source. For a personal brand, "none" is a complete answer
   and ends the website questions.
3. **Audience and voice.** Who it is for; three words for how it should sound;
   anything to avoid.
4. **Platform.** Instagram, vertical `9:16`, as a proposed default. Everything
   else about the video — duration, model — comes from the capabilities/preset
   answer when that tool is in your tool list; name no model or
   resolution yourself.
5. **Materials, and a reel they like.** "Do you have files of your own — photos,
   past posts, a bio, a CV, product sheets, guidelines? If not, I'll write a
   one-page brand brief from your answers for you to approve." Only their own
   content (material rule, Phase 3); for a personal brand their own photos are
   owned material. And, if they have one, a reel they like for pacing — a link
   or a local file; it stays inspiration (Phase 6).

Do not ask for anything you can read from the tools or that the onboarding prompt
already carried (it usually names the `workspaceId` and `site`).

**Preserve, then propose.** Restate the captured facts as a short list, mark each
default you chose with "(proposed — change anything)", and ask one question:
"Anything to change before I set up the brand?" Edits arrive in one reply; apply
them and move on. Never re-run the intake, and never ask a question twice.

## Local files: check you can read them before you plan around them

The person names local paths in Phase 0 — material files, a folder, the reel.
Being able to list a file is not the same as being able to read it: on a Mac,
files in Documents, Desktop and Downloads are protected per app, and the process
that runs your commands may not hold the grant the app the person types in
holds. One does not cover the other. So, before you plan uploads or analysis:

1. **Read the first byte of every path**, in one pass. Expand `~`, keep the path
   quoted exactly as given (spaces and non-ASCII characters are ordinary), and
   read one byte — macOS/Linux: `head -c 1 "<path>" >/dev/null`; PowerShell 7:
   `Get-Content -LiteralPath "<path>" -AsByteStream -TotalCount 1 | Out-Null`
   (Windows PowerShell 5.1 takes `-Encoding Byte` in place of `-AsByteStream`).
   For a folder, read the first byte of its first regular file. `ls`, `stat`,
   `find`, Finder metadata or a listing another process produced prove nothing
   about the bytes.
2. **Classify once**: readable; does not exist (a typo, a move, or your view of
   `~` differs from the person's); exists but cannot be read ("Operation not
   permitted", "Permission denied"); or a cloud placeholder (zero or tiny size
   with a sync flag — `stat` succeeds, the bytes are not local). A video that
   reads as a few hundred bytes is a Finder alias or a shortcut, not the video.
3. **Say what you found in one message**, grouped by outcome, and **keep every
   intake answer**. Never ask for the same path again. For a protected file, in
   the person's words:

   > I can see `<name>` but I'm not allowed to read it. On a Mac, files in
   > Documents, Desktop and Downloads are protected per app, and the tool that
   > runs my commands may not have the permission the app you're typing in has —
   > one does not cover the other. Easiest fix: copy it into your Public folder
   > (or into `<the folder I'm working in>`) and tell me the new name. Or upload
   > it to the `<campaign project>` in Studio and I'll fetch it from there.

4. **Offer one recovery path per failure, in this order.** (a) A copy into an
   accessible folder — the person's `~/Public`, the folder you are running in,
   or any folder outside Documents, Desktop and Downloads; fastest, and it needs
   no network. (b) An upload in the web app to the campaign project, which you
   then read through the **file-management** skill (`GET /v1/files/{fileId}`;
   you fetch the download URL yourself) — for the reel this is a plain project
   file, never material, and you delete it from the project after the analysis
   if the person wants. (c) A chat attachment, only when your client is known to
   hand you a path you can read; do not promise it. Never (d): changing the
   person's OS permissions — no `tccutil`, no scripted System Settings, no Full
   Disk Access as a first move. If they ask, point them to their own System
   Settings → Privacy & Security → Files and Folders and say it is their choice
   to make; do not walk them through it.
5. **Say what the server cannot do**, once, if it comes up: "Spuree's server
   never sees files on this computer; it only receives bytes my tools send. If I
   can't read a file, nothing on Spuree's side can change that."
6. **Then continue.** Once a path reads, re-read only that path and resume the
   phase it belongs to — material to Phase 3, the reel to Phase 6. The reel
   remains inspiration: never `kbMaterial`, never a `video_generate` reference.
   Offer to delete your working copy of a third-party reel at the end of the
   session; never delete the person's own file.
7. **Never bypass a login wall** to obtain a reel. On Windows, Controlled Folder
   Access can refuse writes and, rarely, reads; the same message and the same
   recovery paths apply.

## Phase 1 — A place to work

You need a **workspace id** for the brand and a **project** for the video.

- If the onboarding prompt named a `workspaceId`, use it.
- Otherwise call `project_list`. Its `workspaces` map names the workspaces the
  person can see; with exactly one, use it. With none (a brand-new account and
  no projects yet), ask the person to paste the workspace id shown on their
  Studio onboarding page.
- Create one project for this campaign with `project_create` (name it after the
  brand, e.g. "Acme — first post"). Its id is the `folderId` the video lands in
  and the session the reel is uploaded to.

## Phase 2 — The brand

**With a website.** `brand_lookup` with the workspace and website first. If it
exists, reuse its `kbEntityId` and skip to Phase 3 — tell the person their brand
already exists and open its `webUrl`. Otherwise `brand_create` with the
workspace, the name, the website and any social links. A 409 `brand_exists`
carries the holder's `kbEntityId` in `details`: use that brand rather than
creating another.

**Without a website** (a personal brand, or a business with no site). A brand
without a website has no identity key, so `brand_lookup` cannot find it and a
second create is not refused. Search by name instead — `file_search` with
`q=<name>`, `type=asset`, `entityType=brand`, `workspaceId=<ws>`:

- 0 hits → `brand_create` with the workspace and the name, no website. Always
  pass the name: a personal brand is named by the person, never "Untitled brand".
- 1 hit whose name matches exactly → "You already have a brand called X (link).
  Use it?" On yes, reuse its `kbEntityId`.
- 2 or more hits, or a near match → list name · id · link for each and ask which
  one, or "new". Never pick silently.

`brand_create` is the FREE shell; it never builds. Keep the `kbEntityId` and save
it (**What you save**). The search index trails writes by a few seconds,
so a brand created moments ago may not show up yet: within a session the
`kbEntityId` you created is the truth; across sessions read your saved state
first and, when unsure, send the person to their brand list in Studio. After an
uncertain create, `file_search` by name before creating again, and never create
twice in one session.

## Phase 3 — Material

**With files.** For every file of the person's own material, once it has passed
the **Local files** check:

1. `file_upload_start` with `sessionId` = the brand's `kbEntityId`,
   `kbMaterial: true`, the file name without extension, the lowercase extension,
   the exact byte size and, if you can compute it, the CRC32 (base64).
2. PUT the bytes to the returned `uploadUrl` with exactly the `requiredHeaders`
   (multipart mode returns one URL per part).
3. `file_upload_complete` with the `fileId`.

**Without files.** Write a one-page brief from the confirmed facts and nothing
else, as `brand-brief.md`, under these headings — they mirror what the build
writes into the brand profile:

- **Subject** — who or what, in their words.
- **Offerings** — what they do; a personal brand's offering is their practice
  ("private tennis coaching for adult beginners").
- **Audiences** — who it is for.
- **Voice** — the three words, and how they show up in a caption.
- **Approved claims** — only sentences the person said or confirmed.
- **Banned topics / Do not say** — invented credentials, rankings, numbers,
  testimonials, anyone else's name, and whatever they asked to avoid.
- **Channels** — the platform.
- **Visual guidelines** — setting, palette, mood. No description of the person's
  face or body.

Open the file with the line "Written by your agent from your answers on <date>.
Edit anything; nothing here was scraped." Show the whole brief. The person edits
it or says "use it"; only then upload it as material — `file_upload_start`
(`sessionId` = `kbEntityId`, `kbMaterial: true`, `fileName: brand-brief`,
`fileFormat: md`, the exact byte size) → PUT → `file_upload_complete`. A
browser-only client cannot upload material; say so plainly and send the person
to the web app.

**Material rule.** Material becomes the brand's memory. Upload only what belongs
to the person: their guidelines, product sheets, photos, their own posts, the
brief they adopted. Never upload someone else's reel, logo or copy as material.
The reference reel from Phase 6 is a pacing reference, not brand content; it
never goes in here.

Upload **everything** before the build. The build reads what is there when it
runs, and a rebuild costs full price again.

## Phase 4 — The quote

Nothing paid has happened yet. This is where the person learns what the rest
will cost — once, before the first paid step.

1. With the material in place, call **the quote tool** for the
   remaining workflow — one brand build and one video, with any preset from the
   capabilities/preset answer — and show the quote against the
   person's credit allowance, in their words.
2. Proceed only on an explicit yes to that quote. A shortfall ends it
   here: say what is short and stop; do not start a build that cannot
   finish.
3. Until the quote tool is in your tool list, say the build is **about 136
   credits** and call it what it is — an estimate, not a quote — and that the
   video is priced when its tool answers. The quote tool's number wins the moment
   it is available; never add the two up yourself.

## Phase 5 — One build, confirmed

1. Name the step and its cost — the build's line from the quote, or the Phase 4
   estimate while there is no quote tool — say that a first build goes live by
   itself when it completes, and ask for an explicit yes. Do not proceed on
   silence, or on an earlier yes to something else (the yes to the quote is not
   the yes to the build).
2. Save the request (**What you save**), then `brand_build_start` with the
   `kbEntityId`; record the `buildId` as soon as it answers. 402 is a shortfall:
   say what is short and stop. 409
   `brand_memory_build_in_progress` means one is already running: poll that
   instead of starting another.
3. Poll `brand_build_status` every 5–10 seconds. Report progress in the person's
   words ("reading your website", "writing the brand profile"), not node names.
4. **A first build publishes live by itself.** When status is `completed`, the
   brand memory is live; share the brand's `webUrl`.
5. Only a **rebuild** stages a draft. If the build status says a version is
   awaiting confirmation: `brand_pending_read`, show the person what it holds
   (version, article count, the infobox cards), and only after they agree call
   `brand_pending_commit` with that exact version. A 409 there means the draft
   changed — read again, never retry blindly.
6. `failed` is terminal. Report the build's `error` sentence and stop; do not
   start another build on your own.

Never retry a paid action automatically. If a start may or may not have
happened, read your saved state and then the build status before anything else.

## Phase 6 — The reference reel

The reel teaches **structure** — hook, beats, pacing, camera behaviour — never
content. Nothing from it is copied, quoted or shown.

1. **Get the file locally.** For a link, try `yt-dlp -o reference.mp4 "<url>"`
   if `yt-dlp` is installed; Instagram often refuses anonymous downloads, so if
   that fails, ask the person to save the video and give you the path, or to pick
   one of their own posts instead (their own content is the most reliable
   reference). Do not try to bypass a login wall. A path they give you goes
   through the **Local files** check before `ffprobe`.
2. **Read its shape** with `ffprobe` (duration, aspect) and a scene-cut pass
   (`ffmpeg -i reference.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null -`)
   to get the cut timestamps. Write a short pattern: the hook in the first second,
   the beats with their lengths, camera behaviour, whether there is on-screen
   text, the caption's shape.
3. **Keep the reel out of the brand and out of generation.** Do not upload it as
   material, and never pass it to `video_generate` as a reference — that would
   put the original's subject on screen. If the person wants it kept, upload it
   to the campaign project as a plain file (no `kbMaterial`).

## Phase 7 — The video

1. Write a text-to-video prompt that **mirrors the pattern with the brand's own
   content**: the same beat lengths and camera behaviour, the brand's product,
   setting and tone from Phase 0 and the built brand memory. No on-screen text —
   the models render it as gibberish; captions belong in the post. For a
   personal brand the prompt describes setting, action and tone — never the
   person's face or body — and no photo of them goes in as a reference.
2. **Settings come from the capabilities/preset answer** when that
   tool is in your tool list: ratio, duration and model exactly as it reports
   them, with the duration as close to the reel's length as the supported range
   allows. Without it, keep ratio `9:16`, set the duration to the reel's length
   within what `video_generate`'s own description allows, and leave model and
   resolution unset. Never guess a model name or a resolution.
3. Show the person the prompt, the duration and the video's line from the quote
   (or say that it is priced when the tool answers), and ask for a yes.
4. Generate a unique `idempotencyKey` for THIS generation and save it with the
   full request (**What you save**) **before** calling `video_generate` with the
   prompt, the project as `folderId`, the ratio and the duration; record the
   `jobId` as soon as it answers. A new key means a new paid job. After an
   uncertain outcome, retry only with the same key and body — never with a new
   key, and never without being asked.
5. Poll `video_get_status` every 10–20 seconds. `failed` is terminal — report it
   and ask before trying a different prompt; a different prompt is a new paid
   job with a new key and its own yes.
6. `video_get_result` returns the `fileId` and a preview link. Share the link and
   ask whether to use it or try once more.

The **text-to-video** skill has the prompt craft (anchors, camera language,
what the models can and cannot do); use its patterns, not its endpoint details.

## Phase 8 — The draft

1. Write the caption in the brand's voice from Phase 0 and the brand memory: one
   hook line, the body, a call to action; hashtags separately, without `#`. No
   claims the person did not give you — no credentials, rankings, numbers or
   testimonials they did not state, and nobody else's name.
2. `post_draft_create` with `brandId` = the `kbEntityId`, the platform, the
   caption and hashtags. Keep `postId` and `version` (**What you save**).
3. `post_video_attach` with the video's `fileId` and the post's current
   `version`. 409 means the post moved — `post_get`, then attach again.
4. Share the video's preview link and the draft's **`webUrl`**. That page is
   where the person reviews, approves and publishes, in Studio; you never approve
   or publish from here.

Say what happened in one short list: the brand (link), the material count, the
video (preview link), the draft (link), and the credits spent — as **the billing
outcome** reports them, never a number you added up yourself.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| `brand_create` is not a tool | The connector is not set up or the person is on an API key. Send them to Studio's Connect your AI tools guide; stop. |
| `insufficient_scope` | Name the missing scope (`write` or `render`) and ask them to reconnect and approve it. |
| 409 `brand_exists` | Use the `kbEntityId` in `details`; do not create another brand. |
| Two or more brands with the person's name (no website) | List name · id · link and let the person pick, or say "new". Never pick silently. |
| `brand_create` may or may not have happened | `file_search` by name in the workspace before creating again; never create twice in one session. |
| 402 on a paid start | A shortfall: say what is short and stop. The amount comes from the quote or from the 402's own answer, not from the estimate in this file. |
| The quote tool, the capabilities answer or the state tool is not in your tool list | Say so once and use the fallback written in its phase: the Phase 4 estimate, the video tool's own documented bounds, `first-post-state.json`. Never guess a price, a model or a resolution. |
| A session ended mid-flow | Read your saved state first and resume at the phase it shows. Never re-run the intake. |
| 409 `brand_memory_build_in_progress` | Poll `brand_build_status`; never start a second build. |
| Build `failed` | Report its `error` sentence. Do not rebuild on your own. |
| `upstream_unavailable` on a paid start | Read your saved state, then the status, before anything else; retry only with the same `idempotencyKey` and body. |
| Reel will not download | Ask for the file, or for one of their own posts. Never bypass a login wall. |
| A path exists (listing, `stat`) but reading it fails with "Operation not permitted" / "Permission denied" | Say so once, keep the intake, offer the accessible-folder copy or the web upload (**Local files**). Do not retry the same path; do not change OS permissions. |
| A path does not exist | Show the exact string you tried and ask for the corrected path once; offer an `ls` of a folder you *can* read if that helps. |
| A file reads as zero bytes or a sync placeholder | Ask the person to open it once so it downloads, or to copy it; do not upload the placeholder. |
| Video `failed` | Terminal. Ask before generating again with a changed prompt. |
| 409 on `post_video_attach` | `post_get` for the current version, then attach once more. |

## Principles

- **Their content only.** Material is the person's own; the reel is a pacing
  reference and never enters the brand or the generation.
- **One build.** Everything uploaded first, then one confirmed build.
- **Quote first, then a yes per step.** The remaining workflow is quoted before
  the first paid step; every paid step is then named, priced and confirmed on its
  own; nothing paid is retried automatically.
- **Save before you spend.** Request, idempotency key and job ids are written down
  before each paid call and read back after any doubt.
- **Supported settings only.** Ratio, duration and model come from the
  capabilities answer or the tool's own description, never from a guess.
- **Preserve, then propose.** Every answer the person gives survives; defaults are
  labelled as proposed; nothing is asked twice.
- **Facts from the person and the brand memory.** No invented claims, credentials,
  rankings, numbers or testimonials, and no likeness: a personal brand's video
  shows setting, action and tone, never the person's face.
- **The links are the finish.** The video preview and the draft's `webUrl` end
  the job; approval and publishing happen in Studio, and the credits spent are
  what the billing outcome says.
