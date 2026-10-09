---
name: first-post
description: Take a new Spuree workspace from nothing to a reviewable social post draft with the person's own agent — for a business, a product, or the person themselves (a personal brand with no website and no files is a complete answer). Create the brand, hand it their material or a one-page brand brief they approve, quote the cost, run ONE brand memory build, study a reference reel for pacing or use their own clip as the post or as a reference, generate a short vertical video, and draft the post under the brand. Use when a user says "make my first post", "set up my brand and make a post", "I'm the brand", "start my first campaign", "turn this reel into a post for my brand", "use my video for my first post", or arrives from Studio's "make your first post with your own agent" onboarding prompt. Requires the MCP connector (brand and post tools); with only an API key, point them to the connector first.
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
`file_search`, `folder_list_files`, and `project_list` / `project_create` —
plus, where your tool list has them, `file_upload_inline` and `file_create` for
uploads from a cloud sandbox (**When an upload is blocked**), and
`video_pattern_read`, which reads a reel's structure on the server (Phase 6).
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
`reason`, reuse every id it names, and never create a second campaign, brand,
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
  MCP-only and works there: run the intake (Phase 0), the project (Phase 1) and
  the brand (Phase 2) as written. In the Phase 0 message, ask for the reel as a
  file attached to the chat, not a link — or, when `video_pattern_read` is in
  your tool list, say they can upload it to the campaign project in Studio once
  it exists (Phase 6). Before Phase 3, tell the person once that uploads from
  here may be blocked, and that their progress is kept if they are.

Nothing about credits, quotes or approvals changes with where you run.

## What you save

With `first_post_state` in your tool list, the server keeps the record: once the
journey is open, each project, brand, upload, build, video and post call that
succeeds is written into it, and `first_post_approve` writes each yes with its
quote, settings and `idempotencyKey`. You save nothing by hand; you read it back.
Without that tool, write
`{workspaceId, projectId, kbEntityId, buildId, idempotencyKey, jobId, postId, version}`
— whatever you have so far — to `first-post-state.json` in the folder you are
working in, before each paid call and whenever an id arrives.

Read the state back at the start of every session and after any uncertain
outcome (a timeout, `upstream_unavailable`, a dropped connection, a 409) before
deciding what to do next: a saved `buildId` means poll, not start; a saved
`idempotencyKey` means replay the same key and body only to learn the outcome,
never to generate again; a saved `kbEntityId` means reuse, not create. The
person never repeats an answer because your session ended.

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
   they like — a link or a local file — teaches structure only and stays
   inspiration (Phase 6); a clip of their own can be the post itself or the
   material for a new video (Phase 6b). Ask which it is when they hand you one.
   In a cloud sandbox (**Where you are running**), ask for the reel as a file
   attached to the chat, in this same message: a link cannot be downloaded from
   there.

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
   phase it belongs to — material to Phase 3, the reel to Phase 6, their own
   clip to Phase 6b. Someone else's reel remains inspiration: never
   `kbMaterial`, never a `video_generate` reference. Offer to delete your
   working copy of a third-party reel at the end of the session; never delete
   the person's own file.
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
   > project and the brand stay as they are, nothing will be created twice, and
   > no credits have been spent. You can:
   >
   > a) open this chat in the Claude desktop app on the computer that has the
   >    files, then send me a message;
   > b) drag the files onto your brand page — `<brand webUrl>` — and tell me when
   >    they're there;
   > c) ask an admin of your Claude organization to allow `<host>` in Claude's
   >    network settings.

5. **When they come back**, call `first_post_state` and follow `next`: it resumes
   the same project and brand. Never create either again, and never re-run the
   intake.

**Material rule.** Material becomes the brand's memory. Upload only what belongs
to the person: their guidelines, product sheets, photos, their own posts, the
brief they adopted. Never upload someone else's reel, logo or copy as material.
The reference reel from Phase 6 is a pacing reference, not brand content; it
never goes in here. Their own clip from Phase 6b goes to the campaign project,
not here, unless they also want it in the brand's memory.

Upload **everything** before the build. The build reads what is there when it
runs, and a rebuild costs full price again.

## Phase 4 — The quote

Nothing paid has happened yet. This is where the person learns what the rest
will cost — once, before the first paid step.

1. With the material in place, call `video_quote` with `brandId` = the brand's
   `kbEntityId`, `folderId` = the campaign project, the planned video at the
   preset (`ratio: "9:16"`, `resolution: "720p"`, `duration: 15`, no model) and a
   one-line prompt for it. Show the person `workflow.steps` (the brand build —
   an estimate until it runs —, the video, the draft at 0),
   `workflow.totalCredits`, `balance.availableCredits` and
   `workflow.expectedRemainingCredits`, in their words.
2. Proceed only on an explicit yes to that quote. If `workflow.fits` is false,
   say the gap first (`workflow.totalCredits` minus `workflow.availableCredits`),
   then offer `recommended` or another entry of `alternatives` — a shorter or
   lower-resolution video, never a change to the brand content — and quote again
   with it. If nothing fits, stop before the build: do not start a build that
   cannot finish.
3. If `video_quote` is not in your tool list even after a reconnect, say the
   build is **about 136 credits** and call it what it is — an estimate, not a
   quote — and that the video is priced when its tool answers. Never add figures
   up yourself.

## Phase 5 — One build, confirmed

1. Name the step and its cost — the build's line from `video_quote`, or the
   Phase 4 estimate when that tool is unavailable — say that a first build goes live by
   itself when it completes, and ask for an explicit yes. Do not proceed on
   silence, or on an earlier yes to something else (the yes to the quote is not
   the yes to the build).
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
content. Nothing from it is copied, quoted or shown. A clip of the person's own
is Phase 6b; it may also be read the way a reel is.

1. **Prefer `video_pattern_read` when it is in your tool list.** The server
   reads the reel's structure for you, free, and you need no `yt-dlp` or
   `ffmpeg`: the person uploads the reel to the campaign project as a plain
   file (never material) — in Studio, or you do it with `file_upload_start` /
   `file_upload_complete`, `sessionId` = the project, no `kbMaterial` —, you
   find its `fileId` (`folder_list_files` on the project, or `file_search`),
   and call `video_pattern_read` with that `fileId`. It answers `ready` with
   the pattern (the hook, the beats with their seconds, camera behaviour,
   on-screen text, tone), `analysing` (wait 10 seconds and call again, for up
   to about two minutes), or `failed` (fall back to the local read, steps 2–5).
   In a cloud sandbox (**Where you are running**) this is the path — the reel's
   site is usually blocked there — so say so once and give the project's web
   URL for the upload; without the tool, use the file the person attached in
   Phase 0.
2. **Otherwise get the file locally.** In a cloud sandbox, do not try `yt-dlp`
   — the reel's site is usually blocked there too: use the file the person
   attached in Phase 0, or ask for it now. Otherwise, for a link, try
   `yt-dlp -o reference.mp4 "<url>"`
   if `yt-dlp` is installed; Instagram often refuses anonymous downloads, so if
   that fails, ask the person to save the video and give you the path, or to pick
   one of their own posts instead (their own content is the most reliable
   reference). Do not try to bypass a login wall. A path they give you goes
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
6. **Keep the reel out of the brand and out of generation.** Do not upload it as
   material, and never pass it to `video_generate` as a reference — that would
   put the original's subject on screen. If the person wants it kept, it stays
   in the campaign project as a plain file (no `kbMaterial`); otherwise offer to
   delete it there, and your working copy, at the end.

## Phase 6b — Their own clip

A clip the person made themselves is their content: it may be the post, the
material for a new video, or a structure reference. Ask once which it is.

1. **It is the post.** Upload it to the campaign project as a plain file —
   `file_upload_start` with `sessionId` = the project, no `kbMaterial`, the
   exact byte size → PUT → `file_upload_complete` — or, from a cloud sandbox,
   have the person upload it in Studio and find its `fileId` with
   `folder_list_files`. Skip Phase 7 entirely: no quote, no credits. In Phase 8,
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
   (`video_pattern_read`, or the local read). Unlike a reel, their own clip may
   also go in as `@video1`.

## Phase 7 — The video

1. Write a text-to-video prompt that **mirrors the pattern with the brand's own
   content**: the same beat lengths and camera behaviour, the brand's product,
   setting and tone from Phase 0 and the built brand memory. No on-screen text —
   the models render it as gibberish; captions belong in the post. For a
   personal brand the prompt describes setting, action and tone — never the
   person's face or body — and no photo of them goes in as a reference. The
   only video reference is the person's own clip (Phase 6b, `@video1`); a reel
   never goes in.
2. **Settings are the preset** — `9:16`, `720p`, 15 seconds, no model — or the
   alternative the person picked from a quote. A reel shorter than 15 seconds
   may set a shorter duration (never below 4). Never guess a model name or a
   resolution.
3. Call `video_quote` again with the final prompt and those settings — and the
   `references` from Phase 6b, if any — the build has changed the balance. Show
   the person the prompt, `price.credits` and what
   will be left, and ask for a yes. An `invalid` verdict names the problem and
   priced `alternatives`; an `unaffordable` one names the shortfall: offer
   `recommended` before any top-up, and quote the one they pick.
4. After the yes, generate a unique `idempotencyKey` for THIS generation and call
   `first_post_approve` with `step: "video"`, the exact `video_generate`
   arguments you will send (minus the key) as `settings`, that
   `idempotencyKey`, the quote (`credits` = `price.credits`, `source: "quote"`)
   and the brief. Then call `video_generate` with that same key and those same
   arguments, the project as `folderId`, and the quote's `approval`
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
3. `post_video_attach` with the video's `fileId` — the generated video's from
   `video_get_result`, or the person's own clip's from Phase 6b — and the post's
   current `version`. 409 means the post moved — `post_get`, then attach again.
4. Share the video's preview link and the draft's **`webUrl`**. That page is
   where the person reviews, approves and publishes, in Studio; you never approve
   or publish from here.

Say what happened in one short list: the brand (link), the material count, the
video (preview link), the draft (link), and the credits spent — as
`first_post_state`'s `budget.spent` and the job's `billing` report them, never a
number you added up yourself.

## When something goes wrong

| What you see | What to do |
| --- | --- |
| `brand_create` is not a tool | The connector is not set up or the person is on an API key. Send them to Studio's Connect your AI tools guide; stop. |
| `insufficient_scope` | Name the missing scope (`write` or `render`) and ask them to reconnect and approve it. |
| 409 `brand_exists` | Use the `kbEntityId` in `details`; do not create another brand. |
| Two or more brands with the person's name (no website) | List name · id · link and let the person pick, or say "new". Never pick silently. |
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
| Reel will not download | Ask for the file, or for one of their own posts. Never bypass a login wall. |
| `video_pattern_read` answers `analysing` for more than about two minutes, or `failed` | Fall back to the local read (Phase 6, steps 2–5) if you can run `ffmpeg`; in a cloud sandbox, say so once and write the pattern from the person's description of the reel. |
| Video `failed` with `REFERENCE_VIDEO_PRIVACY` | The reference clip shows a real person; nothing was charged. Offer to attach the clip to the post as it is (Phase 6b, step 1) or to use it as structure only; a new prompt is a new paid job with a new quote, a new yes and a new key. |
| A PUT to the upload URL fails with a proxy 403/407, "CONNECT tunnel failed" or a refused connection to the storage host | A network policy, not a glitch — usually a cloud sandbox. Do not retry it by any other route. Follow **When an upload is blocked** (Phase 3): record it through `first_post_state` if it takes `uploadBlocked`, send small files and the brief inline if those tools exist, otherwise one message with the three options. Progress is saved; nothing is created twice. |
| A path exists (listing, `stat`) but reading it fails with "Operation not permitted" / "Permission denied" | Say so once, keep the intake, offer the accessible-folder copy or the web upload (**Local files**). Do not retry the same path; do not change OS permissions. |
| A path does not exist | Show the exact string you tried and ask for the corrected path once; offer an `ls` of a folder you *can* read if that helps. |
| A file reads as zero bytes or a sync placeholder | Ask the person to open it once so it downloads, or to copy it; do not upload the placeholder. |
| Video `failed` | Terminal. Ask before generating again with a changed prompt. |
| 409 on `post_video_attach` | `post_get` for the current version, then attach once more. |

## Principles

- **Their content only.** Material is the person's own; their own clip may be
  the post or a reference; someone else's reel is structure only and never
  enters the brand or the generation.
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
  generated video shows setting, action and tone, never the person's face.
- **The links are the finish.** The video preview and the draft's `webUrl` end
  the job; approval and publishing happen in Studio, and the credits spent are
  what `first_post_state`'s budget and the job's `billing` say.
