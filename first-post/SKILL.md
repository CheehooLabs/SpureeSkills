---
name: first-post
description: Take a new Spuree workspace from nothing to a reviewable social post draft with the person's own agent — for a business, a product, or the person themselves (a personal brand with no website and no files is a complete answer). Create the brand, hand it their material or a one-page brand brief they approve, quote the cost, run ONE brand memory build, study a reference reel for pacing or use their own clip as the post or as a reference, generate a short vertical video, and draft the post under the brand. Use when a user says "make my first post", "set up my brand and make a post", "I'm the brand", "start my first campaign", "turn this reel into a post for my brand", "use my video for my first post", "try the example", or arrives from Studio's "make your first post with your own agent" onboarding prompt — including one that names an example kit. Requires the MCP connector (brand and post tools); with only an API key, point them to the connector first.
---

# First Post

Walk a person from an empty workspace to a post draft they can open in Studio and
approve. The aha moment is the draft link at the end, with their brand's voice
and a video shaped like a reel they like — or their own clip, when they have
one. Speak in plain language, one step at a time, and never spend credits
without an explicit yes.

## What this needs

This playbook runs over the **MCP connector** (Claude Code, Codex or Cowork
connected to `/mcp`): it uses `first_post_state`, `first_post_approve`,
`brand_lookup`, `brand_create`, `file_upload_start` / `file_upload_complete`,
`brand_build_start`, `brand_build_status`, `brand_pending_read` /
`brand_pending_commit`, `video_quote`, `video_generate` / `video_get_status` /
`video_get_result`, `post_draft_create`, `post_get`, `post_video_attach`,
`file_search`, `folder_list_files`, and `project_list` (to find the workspace) —
plus, where your tool list has them, `file_upload_inline` and `file_create` for
uploads from a cloud sandbox (**When an upload is blocked**), and
`video_pattern_read`, which reads a reel's structure on the server (Phase 6), and
`first_post_example_start`, which sets up an example kit on the server (**An
example kit**).
If `brand_create` is not among your tools, say so and send the person to the
**Connect your AI tools** guide in Studio to add the connector — the brand and
post routes do not accept an API key.

Three of those carry the money and the memory:

- **`first_post_state`** opens and reads the person's journey — every id that
  already exists, a live read of the build, job, post and balance, the budget,
  and `next`: the one step to take now. Your tool calls are recorded into the
  journey only after it is open, so call it **first**.
- **`video_quote`** prices a video without spending anything, with the same
  arguments as `video_generate`. With `brandId` it also prices the rest of the
  first post (the brand build if it is still owed, the video, the draft at 0)
  against the real balance; with `includeCatalog: true` it lists the supported
  models, resolutions, durations and ratios and the model a request naming none
  runs. A valid quote carries the `approval` you pass back to `video_generate`.
- **`first_post_approve`** records the person's yes to ONE paid step, after they
  said it and before the paid call. One approval covers exactly one build start
  or one video key; any attempt consumes it.

A connector added before these tools shipped can show a cached tool list without
them: ask the person to reconnect once. The fallback for each, if they still do
not appear, is written where it is used.

Scopes: the person must have approved `read`, `write` and `render` at consent.
`render` is what lets you start the paid steps — the brand build and the video.
If a tool answers `insufficient_scope`, tell them which scope is missing and how
to reconnect.

Start every session with `first_post_state` (or your saved file, **What you
save**, below) and resume where it says you are: follow `next.action` and its
`reason`, reuse every id it names, and never create a second brand,
build or post. When `next.requiresFreshApproval` is true, ask the person again
before any paid call. Never restart the intake because a session ended.

You also need to be able to **read local files and make HTTP requests**: the
person's brand material and the reference reel are uploaded from their machine by
PUTting bytes to a presigned URL. Being able to list a file is not the same as
being able to read it — check the bytes first (**Local files**, below) before you
plan around a path.

## Where you are running

Right after `first_post_state`, work out where your commands run. It decides how
the material and the reel reach the server, and nothing else.

- **On the person's computer** — a shell or a device bridge on their machine, or
  the paths they name are readable (**Local files**). Uploads go out over their
  own network. Continue as written.
- **In a cloud sandbox** — Claude on the web, or any session whose commands run
  on a remote machine that cannot see the person's files. Its network usually
  allows package registries and code hosts, and may refuse the storage host that
  uploads go to and the site a reel lives on. Everything before the material is
  MCP-only and works there: run the intake (Phase 0), the workspace (Phase 1) and
  the brand (Phase 2) as written. In the Phase 0 message, ask for the reel as a
  file attached to the chat, not a link — or, when `video_pattern_read` is in
  your tool list, say they can upload the video file to the brand's Generated folder in
  Studio once the brand exists, with Upload files — not Add link, which saves only the
  URL (Phase 6). Before Phase 3, tell the person once that uploads from
  here may be blocked, and that their progress is kept if they are.

Nothing about credits, quotes or approvals changes with where you run.

## What you save

With `first_post_state` in your tool list, the server keeps the record: once the
journey is open, each brand, upload, build, video and post call that
succeeds is written into it, and `first_post_approve` writes each yes with its
quote, settings and `idempotencyKey`. You save nothing by hand; you read it back.
Without that tool, write
`{workspaceId, kbEntityId, buildId, idempotencyKey, jobId, postId, version}`
— whatever you have so far — to `first-post-state.json` in the folder you are
working in, before each paid call and whenever an id arrives.

Read the state back at the start of every session and after any uncertain
outcome (a timeout, `upstream_unavailable`, a dropped connection, a 409) before
deciding what to do next: a saved `buildId` means poll, not start; a saved
`idempotencyKey` means replay the same key and body only to learn the outcome,
never to generate again; a saved `kbEntityId` means reuse, not create. The
person never repeats an answer because your session ended.

## An example kit

Studio's onboarding page can offer an **example kit**: a ready-made sample brand
— a brief, a product photo, a reference video, a concept and a suggested
prompt — published on the public asset site. The person picks "An example" or
"My own brand" on that page, and the prompt they paste says which:

- **They chose an example.** The prompt names the kit (`kit <id>`) and its
  folder, `https://assets.stagecontinuity.com/onboarding/kits/<id>/` (or
  `assets-dev.` on dev). Do not ask whether they want their own brand; follow
  the steps below instead of Phase 0 to Phase 3. If they say they want their
  own brand after all, run Phase 0 as written.
- **They chose their own brand.** Run Phase 0 as written and do not offer an
  example.
- **The prompt names no kit.** Nothing here applies.

**An example that stars the person.** A kit can star the person themself: the
prompt says the example stars them, and `kit.json` has `requires: ["likeness"]`
and a `generation.references` entry with `likeness: "self"` instead of a file
(for example `@image2`). Choosing it is their request to appear — as their own
verified likeness only (a `likeness_list` item with `isMine`), never anyone
else's. Before step 1:

- FIRST call `likeness_list`. If it reads `available: false`, tell them in one
  line that verified likeness is not open to their account, and offer a
  face-free example or their own brand (Phase 0).
- If it lists no `isMine` item, give them its `likenessWebUrl` to verify
  themself and add a photo, wait until they say they are done, then call
  `likeness_list` again.
- Only once it lists an `isMine` item, go on to step 1. If
  `first_post_example_start` answers `likeness_not_ready`, do the same and call
  it again with the same kit id; it refuses before it creates anything, so
  nothing is lost.
- In every `video_quote` and `video_generate` for this example, add their newest
  `isMine` `referenceId` (by `createdAt`) as `{type: likeness, referenceId, tag:
  @image2}` — one per likeness slot, with the slot's tag — and say in the
  prompt that the tag is them. Call `likeness_list` again before each quote,
  because they can withdraw their likeness at any time.

1. **Set it up.** The example makes no project: the brand holds the post, and
   everything it needs goes to the brand.
   - With `first_post_example_start` in your tool list, call it with the kit id
     and the workspace. It creates the brand "<kit name> (example)", copies the
     kit's brief and product photo in as brand material and its reference video
     into the brand's Generated folder, records them in `first_post_state`, and
     returns their `fileId`s with the kit's concept, suggested prompt and
     finishing. Create, upload or copy nothing for the example yourself, and
     never `brand_create` a second copy; after an uncertain outcome, call
     `first_post_state` and reuse what it names.
   - Without it, on the person's computer: read `kit.json` from the kit folder,
     download each file it lists from the same folder (skip the files whose
     `role` is `preview` or `preview_poster`: they are only shown on the page,
     never uploaded or used as a reference) and check each one's
     `sha256` against `kit.json` — on a mismatch, stop and say so; never use
     that file. Then `brand_create` named "<kit name> (example)" — no
     `project_create` — upload the brief and the product photo as material
     (Phase 3), and the reference video to the brand without `kbMaterial`
     (`file_upload_start` with `sessionId` = the brand's `kbEntityId`); it lands
     in the brand's Generated folder.
   - Without it, in a cloud sandbox: say in one line that the example needs this
     agent's desktop app or terminal, and offer their own brand (Phase 0).
2. **Show it.** Say in one line that this is an example brand created in their
   workspace — the brand, the video and the credits are real, and every paid
   step still needs their yes. Show the concept (title and one line), the
   preview video's link (`card.previewVideo` in the kit folder — the motion
   their post will follow; when its file's `role` is `preview`, it is a sample
   of what this example looks like, not the motion — for an example that stars
   them, their video stars them), the audience, the voice and the platform, and ask
   once: "Use this example as-is, or change anything?" The answer is the
   intake, not a yes to any paid step.
3. **Then the usual flow.** The brand is new, so Phase 4 quotes its build and
   the video together, and Phase 5 runs the one build. The reference mode is a
   **direct video reference** (Phase 6): the product photo is `@image1`, for
   the product's look; the reference video is `@video1`, for staging, timing
   and camera only, as `kit.json`'s `generation.references` says; in an example
   that stars them, their own likeness fills its slot (`@image2`, above). It is
   already in the brand's Generated folder, so skip the download, but still
   read it (`video_pattern_read`, or a contact sheet), and give the privacy
   notice with the first quote as usual. As in every journey, the brand's
   `kbEntityId` is the `folderId` for `video_quote` and `video_generate` and
   the place for any upload. In Phase 7, use the kit's suggested prompt
   (`generation.prompt`) unless the person changed something, and plan its
   `finishing` overlays as the editing step. Never claim anything about the
   example business beyond the kit's brief.

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
4. **Platform.** Instagram, vertical `9:16`, as a proposed default. The first-post
   video preset is `9:16`, `720p`, 15 seconds and no model (the server's
   default), which fits the starter allowance together with the build;
   `video_quote` confirms it. Name no other model or resolution yourself — a
   different one comes only from the quote's `alternatives`, picked by the
   person.
5. **Materials, and a reel they like — or a clip of their own.** "Do you have
   files of your own — photos, past posts, a bio, a CV, product sheets,
   guidelines? If not, I'll write a one-page brand brief from your answers for
   you to approve." Only their own content (material rule, Phase 3); for a
   personal brand their own photos are owned material. Then the video: a reel
   they like — a link or a local file — can be a direct video reference (the
   clip itself goes to `video_generate`) or teach structure only (Phase 6) —
   propose the direct reference unless they say otherwise; a clip of their own can be the post itself or the
   material for a new video (Phase 6b). When they hand you their own clip, ask
   in this same message — "Is it the finished post, or material for a new
   video?" — and record the answer: it decides what the quote covers (Phase 4)
   and whether a video is generated at all (Phase 7). In a cloud sandbox
   (**Where you are running**), ask for the reel as a file attached to the
   chat, in this same message: a link cannot be downloaded from there.

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
   > it to `<brand files link>` in Studio and I'll fetch it from there.

4. **Offer one recovery path per failure, in this order.** (a) A copy into an
   accessible folder — the person's `~/Public`, the folder you are running in,
   or any folder outside Documents, Desktop and Downloads; fastest, and it needs
   no network. (b) An upload in the web app to the brand's Generated folder, which you
   then read through the **file-management** skill (`GET /v1/files/{fileId}`;
   you fetch the download URL yourself) — for the reel this is a plain
   file, never material, and you delete it from the folder after the analysis
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
   phase it belongs to — material to Phase 3, the reel to Phase 6, their own
   clip to Phase 6b. Someone else's reel is never `kbMaterial`; it reaches
   `video_generate` only as a direct reference the person chose (Phase 6,
   step 6). Offer to delete your
   working copy of a third-party reel at the end of the session; never delete
   the person's own file.
7. **Never bypass a login wall** to obtain a reel. On Windows, Controlled Folder
   Access can refuse writes and, rarely, reads; the same message and the same
   recovery paths apply.

## Phase 1 — A place to work

You need a **workspace id** for the brand. **Do not create a project**: the
brand holds this post.

- If the onboarding prompt named a `workspaceId`, use it.
- Otherwise call `project_list`. Its `workspaces` map names the workspaces the
  person can see; with exactly one, use it. With none (a brand-new account and
  no projects yet), ask the person to paste the workspace id shown on their
  Studio onboarding page.
- Everything you upload or generate for the post goes to the brand (Phase 2).
  Pass the brand's `kbEntityId` as `video_generate`'s `folderId`, and as
  `file_upload_start`'s `sessionId` **without** `kbMaterial` for a plain file
  (a reel, their own clip): the server puts both in the brand's **Generated
  folder**. The person sees it on the brand page's Files tab, Generated view —
  the `<brand files link>` is the brand's `webUrl` with
  `?tab=all-files&files=generated`. A file the person uploads there themselves
  you find by listing that folder: `folder_list_files` on the brand's
  `kbEntityId` answers `generatedFolderId` (the brand's own listing holds only
  its material), and `folder_list_files` on that id lists the folder. Fall back
  to `file_search` by its name for a file not listed yet. `generatedFolderId` is
  a folder id: never pass it as a `brandId` or `kbEntityId`.

## Phase 2 — The brand

**With a website.** `brand_lookup` with the workspace and website first. If it
exists, reuse its `kbEntityId` and skip to Phase 3 — tell the person their brand
already exists and open its `webUrl`, pasted from the result. Otherwise
`brand_create` with the workspace, the name, the website and any social links.
A 409 `brand_exists` carries the holder's `kbEntityId` in `details`: use that
brand rather than creating another.

**Without a website** (a personal brand, or a business with no site). A brand
without a website has no identity key, so `brand_lookup` cannot find it and a
second create is not refused. Search by name instead — `file_search` with
`q=<name>`, `type=asset`, `entityType=brand`, `workspaceId=<ws>`:

- 0 hits → `brand_create` with the workspace and the name, no website. Always
  pass the name: a personal brand is named by the person, never "Untitled brand".
- 1 hit whose name matches exactly → "You already have a brand called X
  (`<its webUrl, pasted from the hit>`). Use it?" On yes, reuse its
  `kbEntityId`.
- 2 or more hits, or a near match → list name · id · `webUrl` for each (id and
  `webUrl` pasted from the hit) and ask which one, or "new". Never pick
  silently.

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
   (multipart mode returns one URL per part). If the PUT is refused by the
   network, stop here: **When an upload is blocked**, below.
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
`fileFormat: md`, the exact byte size) → PUT → `file_upload_complete`. The brief
is text, so when `file_create` takes `kbMaterial` it can go up with no PUT at all
— `file_create` with `sessionId` = `kbEntityId`, `fileName: brand-brief.md`, the
brief as `content` and `kbMaterial: true`; in a cloud sandbox, use that first.

**When an upload is blocked.** A PUT that fails the way a network policy refuses
— a proxy 403 or 407, "CONNECT tunnel failed" or a rejected CONNECT, a refused
connection to the storage host — fails the same way every time. On the first
one:

1. **Stop.** Do not retry it with another command, another host, another tool,
   or a proxy setting.
2. **Record it.** If `first_post_state` takes `uploadBlocked`, call it once with
   the storage `host` and the `error` line, so the person's onboarding page shows
   why the journey is waiting.
3. **Send what can still go.** If `file_upload_inline` is in your tool list, it
   carries the bytes inside the tool call, so it is for small files only — up to
   64 KB. Shrink a photo first (a JPEG about 640 px on its long side), upload that
   copy with the brand's `kbEntityId` and `kbMaterial: true`, and say you sent a
   smaller copy. Text material goes through `file_create` as above. If every
   file went up this way, continue with Phase 4. If any could not — too big, or
   not a photo you can shrink — go to step 4 and name those files: the build
   reads only what is there, and a rebuild costs full price again.
4. **Otherwise, tell the person once**, in plain words, with exactly these
   options — and nothing else to try:

   > I couldn't upload your files from here: this chat runs in a cloud sandbox
   > whose network blocks the storage service. Your progress is saved — the
   > brand stays as it is, nothing will be created twice, and
   > no credits have been spent. You can:
   >
   > a) open this chat in the Claude desktop app on the computer that has the
   >    files, then send me a message;
   > b) drag the files onto your brand page — `<brand webUrl>` — and tell me when
   >    they're there;
   > c) ask an admin of your Claude organization to allow `<host>` in Claude's
   >    network settings.

5. **When they come back**, call `first_post_state` and follow `next`: it resumes
   the same brand. Never create it again, and never re-run the
   intake.

**Material rule.** Material becomes the brand's memory. Upload only what belongs
to the person: their guidelines, product sheets, photos, their own posts, the
brief they adopted. Never upload someone else's reel, logo or copy as material.
The reference reel from Phase 6 is a pacing reference, not brand content; it
never goes in here. Their own clip from Phase 6b goes to the brand's Generated folder
(a plain upload),
not here, unless they also want it in the brand's memory.

Upload **everything** before the build. The build reads what is there when it
runs, and a rebuild costs full price again.

If you mention an uploaded file, give the `webUrl` from its result, pasted as
is, or point at the brand page (`<brand webUrl>`); never type a file id.

## Phase 4 — The quote

Nothing paid has happened yet. **Do Phase 6/6b's reference inspection, upload
and mode selection now, then return here.** That analysis uses the intake and
does not require built brand memory. At this pre-build pass, prepare the clip
and plan only; generation and draft attachment wait until after Phase 5.
Include the actual intended references in this budget quote so its cost includes
video-reference processing. Use a provisional prompt from the intake and
reference plan; Phase 7 writes the final prompt from the built brand memory,
quotes it again, and obtains a separate generation approval.

1. With the material in place, call `video_quote` with `brandId` = the brand's
   `kbEntityId`, `folderId` = the same `kbEntityId`, the planned video at the
   preset (`ratio: "9:16"`, `resolution: "720p"`, `duration: 15`, no model) and a
   provisional prompt and the selected references. Show the person `workflow.steps` (the brand build —
   an estimate until it runs —, the video, the draft at 0),
   `workflow.totalCredits`, `balance.availableCredits` and
   `workflow.expectedRemainingCredits`, in their words.
2. Show the quote as the price review for Phase 5; one explicit yes to the
   named brand build and its price covers that step. Before that yes, say that
   the first brand-memory build publishes live automatically when it completes;
   this is not publication of the social post. The yes approves the build only,
   not the provisional video. If `workflow.fits` is false,
   say the gap first (`workflow.totalCredits` minus `workflow.availableCredits`),
   then offer `recommended` or another entry of `alternatives` — a shorter or
   lower-resolution video, never a change to the brand content — and quote again
   with it. If nothing fits, stop before the build: do not start a build that
   cannot finish.
3. **When their own clip is the post** (the Phase 0 answer), the fit check is
   the brand build alone. Call `video_quote` with `brandId` exactly as in step
   1, read only the build's line of `workflow.steps`, and say that the video
   line does not apply — no video is generated. `workflow.fits` and
   `workflow.totalCredits` include that video, so do not stop on them: the
   person needs the build's credits, which you read against
   `balance.availableCredits`. Proceed on a yes to the build; Phase 7's quote
   and approval are skipped, and Phase 8 attaches the clip.
4. If `video_quote` is not in your tool list even after a reconnect, say the
   build is **about 136 credits** and call it what it is — an estimate, not a
   quote — and that the video is priced when its tool answers. Never add figures
   up yourself.

## Phase 5 — One build, confirmed

1. Name the step and its cost — the build's line from `video_quote`, or the
   Phase 4 estimate when that tool is unavailable — say that a first build goes live by
   itself when it completes, and ask for an explicit yes. Do not proceed on
   silence or a yes to something else. If the person already explicitly
   approved this named build and unchanged quoted price in Phase 4 **after
   the automatic live-publication disclosure**, proceed with that approval
   rather than asking the same question again. If that disclosure was missing,
   state it and obtain approval before starting the build.
2. After the yes, call `first_post_approve` with `step: "brand_build"`, the
   `kbEntityId`, and the quote: the build's credits from `video_quote`'s
   `workflow.steps` with `source: "quote"` (or the Phase 4 estimate with
   `source: "stated"`). Then ONE `brand_build_start` with the `kbEntityId`;
   record the `buildId` as soon as it answers. 402 is a shortfall:
   say what is short and stop. 409
   `brand_memory_build_in_progress` means one is already running: poll that
   instead of starting another.
3. Poll `brand_build_status` every 5–10 seconds. Report progress in the person's
   words ("reading your website", "writing the brand profile"), not node names.
4. **A first build publishes live by itself.** When status is `completed`, the
   brand memory is live; share the brand's `webUrl`, pasted from the result.
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

The reel teaches **structure** — hook, beats, pacing, camera behaviour — and,
when the person chooses, it is also a **direct video reference**: the clip
itself goes to `video_generate` as `@video1` (step 6). Its words, product and
brand are never copied or quoted into the prompt or the caption. A clip of the person's own
is Phase 6b; it may also be read the way a reel is.

1. **Prefer `video_pattern_read` when it is in your tool list.** The server
   reads the reel's structure for you, free, and you need no `yt-dlp` or
   `ffmpeg`: the person uploads the reel's video file (the MP4) to
   the brand's Generated folder as a plain file (never material) with Upload files — a saved link
   (Add link) holds only the URL, and `video_pattern_read` answers that it is a
   link, not a video — in Studio, or you do it with `file_upload_start` /
   `file_upload_complete`, `sessionId` = the brand's `kbEntityId`, no
   `kbMaterial` —, you find its `fileId` (list the Generated folder as in Phase 1),
   and call `video_pattern_read` with that `fileId` and `referenceKind: "reel"`
   when the tool exposes it. It answers `ready` with
   the pattern (the hook, the beats with their seconds, camera behaviour,
   on-screen text, tone), `analysing` (wait 10 seconds and call again, for up
   to about two minutes), or `failed` (fall back to the local read, steps 2–5).
   In a cloud sandbox (**Where you are running**) this is the path — the reel's
   site is usually blocked there — so say so once and give the
   `<brand files link>` for the upload; without the tool, use the file
   the person attached in Phase 0.
2. **Otherwise get the file locally.** In a cloud sandbox, do not try `yt-dlp`
   — the reel's site is usually blocked there too: use the file the person
   attached in Phase 0, or ask for it now. Otherwise, for a link, try
   `yt-dlp -o reference.mp4 "<url>"`
   if `yt-dlp` is installed. Instagram often refuses anonymous downloads. **If any
   download fails** — `yt-dlp`, the browser, `curl` or a fetch — stop at once and
   do not try another route. Say in one message: "I couldn't download that Reel.
   Save the MP4 on your device and upload it to <brand files link> with
   Upload files (not Add link), then tell me when it's there." — the brand's
   `webUrl` with `?tab=all-files&files=generated`. Then read it with step 1, or through the
   **file-management** skill when `video_pattern_read` is not in your tool list.
   One of their own posts is an equally good reference (their own content is the
   most reliable). Do not try to bypass a login wall. A path they give you goes
   through the **Local files** check before `ffprobe`.
3. **Read its shape** with `ffprobe` (duration, aspect) and a scene-cut pass
   (`ffmpeg -i reference.mp4 -vf "select='gt(scene,0.3)',showinfo" -f null -`)
   to get the cut timestamps.
4. **Look at it before you describe it.** Put the cut frames on ONE contact
   sheet and view the image:
   `ffmpeg -i reference.mp4 -vf "select='gt(scene,0.3)',scale=320:-1,tile=4x2" -frames:v 1 sheet.jpg`
   — with fewer than four cuts, eight evenly spaced frames instead:
   `ffmpeg -i reference.mp4 -vf "fps=8/<duration>,scale=320:-1,tile=4x2" -frames:v 1 sheet.jpg`.
   Cut times alone cannot tell you the hook, a push-in from a cut, or whether
   there are titles; the sheet can.
5. **Write the pattern** from what you saw: the hook in the first second, the
   beats with their lengths, camera behaviour, whether and when on-screen text
   appears, the caption's shape. It names kinds of things — "a reveal", "a
   close-up on texture" — never the original's product, person or words.
6. **Keep the reel out of the brand; send it to generation only when chosen.**
   Never upload it as material. When the person chose it as a direct video
   reference, upload it to the brand as a plain file (no
   `kbMaterial`) and attach it in Phase 7 the way Phase 6b step 2 attaches
   their own clip: `references: [{type: "file", fileId: "<id>", tag: "@video1"}]`
   in `video_quote` and `video_generate`, `@video1` named in the prompt, the
   same clip-length limits (trim a longer reel to the part they want with
   `ffmpeg` when you can). **Before that quote, tell them once, in plain words,
   about privacy:** the clip is sent to the video model together with the
   prompt, and a clip that shows a real person is refused
   (`REFERENCE_VIDEO_PRIVACY`, nothing charged) — on that refusal, offer
   structure only. Otherwise the reel stays structure only. If the person wants
   it kept, it stays in the brand's Generated folder; otherwise offer
   to delete it there, and your working copy, at the end.

### Agree on reference use and the action to preserve

Before the video quote, name the selected mode in plain language: **direct
video reference**, **structure only**, or **no reference**. A finished clip
of their own skips generation. Any clip can be a direct reference — their own
or a reel they like — once they have had the privacy notice (Phase 6, step 6);
`referenceKind` says which. Never
silently change modes or imply that analysis attached footage to generation.

Write a timestamped plan from what you actually inspected: opening state,
main action, the relationship between changes on screen, camera, pacing, and
ending. List **must preserve** and **approved changes**. A drink emptying while
an indicator fills must not become a stationary drink with decorative hearts
unless the person chooses that change. When they revise the idea, remove
superseded directions. Inspect motion around the key action; cut times and a
few still frames cannot establish that suction looks natural.

Assign each image/video a role and distinguish generation inputs from editing
assets. Plan exact logos, lettering, percentages, and watermarks as editing
with the supplied assets. Record position, size, opacity and start/end times;
"center" means both horizontal and vertical center. Honor a clear placement
instruction; resolve ambiguity that would obscure an essential feature before
rendering. Before the paid video approval, verify that a local shell or
available editing tool can apply those changes and upload the finished video.
If editing or upload is unavailable, disclose that limit and include a desktop
or user-upload handoff in the plan; never assume the 64 KB inline uploader can
carry an edited video.

Keep this plan with the approved brief. When `first_post_approve` exposes
`brief.creativePlan`, supply:

- `referenceMode`: `direct`, `structure_only`, or `none`;
- `referenceKind`: `own` or `reel` when footage is involved;
- `referenceFileIds`: the inspected/selected clip IDs (direct mode needs the
  actual attached video IDs in `@video1`, `@video2`, … order; a local-only
  structure analysis may have none);
- `mustPreserve`, `approvedChanges`, and `finishing`: concise lists.

The server binds the plan to that video approval and returns it on resume.
If an older connector lacks this field, preserve the same information in
`brief.text` and explicitly check the references before every submission.
A saved plan describes the person's intent, not proof of ownership or a
promise that generation will match it perfectly.

## Phase 6b — Their own clip

A clip the person made themselves is their content: it may be the post, the
material for a new video, or a structure reference. Phase 0 recorded which it
is; follow that answer and do not ask again.

1. **It is the post.** Upload it to the brand as a plain file —
   `file_upload_start` with `sessionId` = the brand's `kbEntityId`, no `kbMaterial`, the
   exact byte size → PUT → `file_upload_complete` — or, from a cloud sandbox,
   have the person upload it to the `<brand files link>` in Studio and find
   its `fileId` by listing the Generated folder (Phase 1). Skip Phase 7 entirely: no quote, no credits. In Phase 8,
   `post_video_attach` that `fileId`.
2. **It is material for a new video.** Phase 7 runs with the clip as `@video1`:
   upload it as above, pass
   `references: [{type: "file", fileId: "<id>", tag: "@video1"}]`
   in `video_quote` and `video_generate`, and name `@video1` in the prompt —
   what to take from it: the setting, the motion, the product. Say before the
   quote: the clip must be at most 15 seconds (30 on Seedance 2.5) and a longer
   one is refused, nothing charged; the quote prices the clip, so quote WITH the
   reference in the body; a clip that shows a real person is refused by Seedance
   (`REFERENCE_VIDEO_PRIVACY`, nothing charged) — then offer step 1 or step 3;
   Wan may refuse a 15 s output with a reference clip. `first_post_approve` gets
   the same `settings`, `references` included.
3. **It is a structure reference.** Read it the way Phase 6 reads a reel
   (`video_pattern_read` with `referenceKind: "own"` when supported, or the local
   read). Keep the own-footage kind on subsequent polls and in the saved brief.
   Switch to direct mode only when
   the person chooses it and the clip is eligible; structure-only mode never attaches `@video1`.

## Phase 7 — The video

Skip this phase when the person's own clip is the post (Phase 0, Phase 6b): no
quote, no approval, no job — Phase 8 attaches the clip.

1. Write a text-to-video prompt that **mirrors the pattern with the brand's own
   content**: the same beat lengths and camera behaviour, the brand's product,
   setting and tone from Phase 0 and the built brand memory. Add exact on-screen
   text and logos during the agreed editing step instead
   of asking generation to reproduce their lettering. For a
   personal brand the prompt describes setting, action and tone — never the
   person's face or body — and no photo of them goes in as a reference. The
   video reference, if any, is the clip the person chose as a direct reference
   — their own (Phase 6b) or a reel (Phase 6, step 6) — as `@video1`.
2. **Settings are the preset** — `9:16`, `720p`, 15 seconds, no model — or the
   alternative the person picked from a quote. A reel shorter than 15 seconds
   may set a shorter duration (never below 4). Never guess a model name or a
   resolution. Honor an explicitly requested model using the quote
   tool to resolve its supported name and settings. Adapt prompt syntax and
   tags for it while preserving the approved concept and action.
3. Call `video_quote` again with the final prompt and those settings — and the
   `references` from Phase 6b, if any — the build has changed the balance. Show
   one complete review: the full prompt, timestamped plan, reference mode,
   actual attached file names and prompt tags, resolved model, duration, ratio,
   resolution, `price.credits`, and remaining balance. Say explicitly whether
   the actual reference video is attached. List editing assets separately.
   Verify each tag maps to an eligible uploaded file in `references`; an
   `@video1` mention, URL, or local path alone does not supply footage. Ask for
   one yes to this exact package, not repeated approvals of its unchanged parts.
   An `invalid` verdict names the problem and
   priced `alternatives`; an `unaffordable` one names the shortfall: offer
   `recommended` before any top-up, and quote the one they pick.
4. After the yes, generate a unique `idempotencyKey` for THIS generation and call
   `first_post_approve` with `step: "video"`, the exact `video_generate`
   arguments you will send (minus the key) as `settings`, that
   `idempotencyKey`, the quote (`credits` = `price.credits`, `source: "quote"`)
   and the brief with its creative plan. Then call `video_generate` with that
   same key and those same
   arguments, the brand's `kbEntityId` as `folderId`, and the quote's `approval`
   (`approvedCredits` and `approvedPricingVersion`); record the `jobId` as soon
   as it answers. Without `first_post_state`, save the key and the full request
   to your file first. A new key means a new paid job. After an uncertain
   outcome, replay only the same key and body to learn what happened — never a
   new key, and never without being asked.
5. Poll `video_get_status` every 10–20 seconds. Its `billing` says what the job
   charged, refunded or still holds. `failed` is terminal — report it and its
   `billing` (a refused job has `chargedCredits: 0`), and ask before trying a
   different prompt; a different prompt is a new paid job with a new quote, a
   new yes and a new key.
6. `video_get_result` returns the `fileId`, the file's `webUrl` and an expiring
   `downloadUrl`. The `webUrl` is the preview link: paste it as returned (never
   the `downloadUrl`, which is for fetching bytes) and inspect the output against
   the approved plan. Check the initial, middle,
   and final states, main action, subject identity, timing and ending. Show any
   mismatch instead of calling it finished. When a local shell or editing tool
   and upload path are available, complete authorized editing with exact assets,
   verify placement/timing and final media properties, and attach the finished
   version. Save raw and finished outputs separately. If editing or upload is
   unavailable, attach the available generated file to the same draft, label it
   as unfinished with the pending changes, and offer a desktop handoff or ask
   the person to upload their edited file. Keep the plan and existing draft IDs
   for that handoff; replace the draft attachment once the edited file is ready.
   Never claim the raw draft includes overlays that were not applied. Ask
   for a new paid approval only when regeneration is needed. Comparison videos
   do not replace the selected draft until the person chooses one.

The **text-to-video** skill has the prompt craft (anchors, camera language,
what the models can and cannot do); use its patterns, not its endpoint details.

## Phase 8 — The draft

1. Write the caption in the brand's voice from Phase 0 and the brand memory: one
   hook line, the body, a call to action; hashtags separately, without `#`. No
   claims the person did not give you — no credentials, rankings, numbers or
   testimonials they did not state, and nobody else's name. Preserve any
   caption credit required by the person or workspace, before the hashtags.
2. `post_draft_create` with `brandId` = the `kbEntityId`, the platform, the
   caption and hashtags. Keep `postId` and `version` (**What you save**).
3. `post_video_attach` with the finished video's `fileId` — upload the edited
   deliverable when finishing was needed, otherwise use `video_get_result`,
   or the person's own clip from Phase 6b — and the post's
   current `version`. 409 means the post moved — `post_get`, then attach again.
4. Share the video's preview link and the draft's **`webUrl`**, both pasted from
   the results. That page is where the person reviews, approves and publishes, in
   Studio; you never approve or publish from here.

Say what happened in one short list: the brand (link), the material count, the
video (preview link), the draft (link) — every link pasted from a tool result —
and the credits spent — as `first_post_state`'s `budget.spent` and the job's
`billing` report them, never a number you added up yourself.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| `brand_create` is not a tool | The connector is not set up or the person is on an API key. Send them to Studio's Connect your AI tools guide; stop. |
| `insufficient_scope` | Name the missing scope (`write` or `render`) and ask them to reconnect and approve it. |
| 409 `brand_exists` | Use the `kbEntityId` in `details`; do not create another brand. |
| Two or more brands with the person's name (no website) | List name · id · `webUrl` (both pasted from the hit) and let the person pick, or say "new". Never pick silently. |
| `brand_create` may or may not have happened | `file_search` by name in the workspace before creating again; never create twice in one session. |
| 402 on a paid start | A shortfall; nothing was charged. Say the numbers it carries (`requiredCredits`, `spendableCredits`, `shortfallCredits`), offer its cheaper `quote.recommended` or `alternatives` before a top-up, and quote the one the person picks; a new submission needs their yes and a NEW `idempotencyKey`. The `billingWebUrl` is where a workspace owner adds credits. |
| 400 `INVALID_ADVANCED_OPTIONS` on `video_generate` | The settings are not supported; nothing was charged. Offer the priced alternatives it carries, quote the one the person picks, and submit it with their yes and a NEW key. |
| 409 `QUOTE_STALE` on `video_generate` | The price or pricing version moved since the quote; nothing was charged. Quote again, ask again, and submit with a NEW key and the new `approval`. |
| 409 on `first_post_approve` | That key is already approved with other settings or already attempted. Do not reuse it; ask for a fresh yes and use a new key. |
| `first_post_state`, `video_quote` or `first_post_approve` is not in your tool list | Ask the person to reconnect once (a cached tool list lags a deploy). If they still do not appear, say so once and use the fallback written in its phase: `first-post-state.json`, the Phase 4 estimate, the preset. Never guess a price, a model or a resolution. |
| A session ended mid-flow | Read your saved state first and resume at the phase it shows. Never re-run the intake. |
| 409 `brand_memory_build_in_progress` | Poll `brand_build_status`; never start a second build. |
| Build `failed` | Report its `error` sentence. Do not rebuild on your own. |
| `upstream_unavailable` on a paid start | Read your saved state, then the status, before anything else; retry only with the same `idempotencyKey` and body. |
| An example kit's `kit.json` or a file it lists will not download | Say so once and offer their own brand (Phase 0); do not fetch the kit from anywhere else. |
| A downloaded kit file's `sha256` does not match `kit.json` | Stop; do not upload or use that file. Say so once and offer their own brand. |
| Reel will not download (`yt-dlp`, the browser or a fetch) | Stop; do not try another route. Ask for the MP4 uploaded to the brand's Generated folder with Upload files, not Add link (Phase 6, step 2), or for one of their own posts. Never bypass a login wall. |
| `video_pattern_read` says the file is a saved link | A link card holds only the URL. Ask the person to upload the video file itself with Upload files (not Add link), then call again with the new `fileId`. |
| `video_pattern_read` answers `analysing` for more than about two minutes, or `failed` | Fall back to the local read (Phase 6, steps 2–5) if you can run `ffmpeg`; in a cloud sandbox, say so once and write the pattern from the person's description of the reel. |
| `first_post_state` says `approve_video` but the person's clip is the post | Do not quote or generate. Upload the clip to the brand if it is not there yet, then `post_video_attach` it; the server then recognises the attached clip and moves on. |
| Video `failed` with `REFERENCE_VIDEO_PRIVACY` | The reference clip shows a real person; nothing was charged. Offer to use it as structure only, or — when it is their own clip — to attach it to the post as it is (Phase 6b, step 1); a new prompt is a new paid job with a new quote, a new yes and a new key. |
| A PUT to the upload URL fails with a proxy 403/407, "CONNECT tunnel failed" or a refused connection to the storage host | A network policy, not a glitch — usually a cloud sandbox. Do not retry it by any other route. Follow **When an upload is blocked** (Phase 3): record it through `first_post_state` if it takes `uploadBlocked`, send small files and the brief inline if those tools exist, otherwise one message with the three options. Progress is saved; nothing is created twice. |
| A path exists (listing, `stat`) but reading it fails with "Operation not permitted" / "Permission denied" | Say so once, keep the intake, offer the accessible-folder copy or the web upload (**Local files**). Do not retry the same path; do not change OS permissions. |
| A path does not exist | Show the exact string you tried and ask for the corrected path once; offer an `ls` of a folder you *can* read if that helps. |
| A file reads as zero bytes or a sync placeholder | Ask the person to open it once so it downloads, or to copy it; do not upload the placeholder. |
| Video `failed` | Terminal. Ask before generating again with a changed prompt. |
| 409 on `post_video_attach` | `post_get` for the current version, then attach once more. |

## Principles

- **Their content only, as material.** Material is the person's own; their own
  clip may be the post or a reference; someone else's reel never enters the
  brand, and enters generation only as a direct reference they chose, after
  the privacy notice. An example kit's files are material only for its own
  "(example)" brand.
- **One build.** Everything uploaded first, then one confirmed build.
- **Quote first, then a yes per step.** The remaining workflow is quoted before
  the first paid step; every paid step is then named, priced and confirmed on its
  own; nothing paid is retried automatically.
- **Save before you spend.** Request, idempotency key and job ids are written down
  before each paid call and read back after any doubt.
- **Supported settings only.** The preset, or an alternative `video_quote`
  offered and the person picked; never a guessed model or resolution.
- **Preserve, then propose.** Every answer the person gives survives; defaults are
  labelled as proposed; nothing is asked twice.
- **Facts from the person and the brand memory.** No invented claims, credentials,
  rankings, numbers or testimonials, and no likeness: a personal brand's
  generated video shows setting, action and tone, never the person's face —
  except through their own verified likeness, in an example that stars them.
- **The links are the finish.** The video preview and the draft's `webUrl` end
  the job; approval and publishing happen in Studio, and the credits spent are
  what `first_post_state`'s budget and the job's `billing` say.
- **Links are pasted, never typed.** Every link you show is copied character for
  character from a tool result — a `webUrl`, a preview link, or a `link` field
  when the result carries one (then prefer `link`). Never type an id, never
  build a URL from an id, never shorten or "fix" one: two ids in one session
  can differ in their last two characters. A result with no link gets no link;
  say where the thing lives instead.
