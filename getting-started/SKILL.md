---
name: getting-started
description: Guides people through using Spuree for the first time. Always use this skill when the user asks how to use Spuree skills or tools, what Spuree can do, which Spuree capabilities are available, for Spuree help or a tutorial, or to get started with Spuree. Explains the public capability set, confirms the connection with a safe read-only first step, and offers a guided walkthrough without searching the user's workspace files for documentation.
---

# Getting Started with Spuree

Guide a new user from “what is this?” to a safe first success. Speak in plain
language and take one step at a time.

This skill is the single entry point for both orientation and the interactive
walkthrough. Do not look through the user's local project files to answer questions
about Spuree. Explain the installed or connected Spuree capabilities from this
guide instead.

## Choose the right path

First identify what the user asked for:

- **Orientation:** For “How do I use Spuree skills?”, “What can Spuree do?”, or
  similar questions, explain the capabilities below and offer the walkthrough.
  Do not start making changes.
- **Walkthrough:** For “Get me started”, “Help me try Spuree”, or an accepted
  walkthrough offer, continue through the phases below.

Then adapt to the capabilities available in the current client:

- **Full MCP or locally installed skills:** Use `project_list`, or delegate to
  **project-management**, for the read-only first success. Other project, folder,
  file, and invitation actions may also be available.
- **Search/fetch web connector:** Some ChatGPT connections expose only `search`,
  `fetch`, and `getting_started`. Explain that this surface is read-only. Ask what
  the user wants to find, call `search`, and use `fetch` to read the selected
  result.

Never claim an unavailable capability. Use the tools actually present in the
current client.

## Public capabilities

Phrase these as examples the user can ask for, not as API names.

**Find and understand**

- “Find files or folders about the hero character.”
- “Show me what is inside this project or folder.”
- “Read this text, Markdown, JSON, CSV, or source file.”

**Organize**

- “Create or rename a project.”
- “Create, move, or rename a folder.”
- “Upload, download, replace, move, rename, or delete a file.”

**Collaborate**

- “Share or unshare a project.”
- “Show, accept, decline, cancel, or resend a project invitation.”

The public Spuree skills cover cloud storage and collaboration. Do not advertise
internal creator capabilities such as motion or video generation.

## Guided walkthrough

### Phase 0 — Confirm authentication

- On a hosted web connector, OAuth is already part of the connection. Continue
  without asking for an API key.
- With locally installed skills, use **authentication** if the user is not signed
  in. Do not ask them to paste credentials into the conversation.

### Phase 1 — Get a read-only first success

Prefer listing projects:

1. Tell the user you will check their Spuree connection.
2. Call `project_list`, or use **project-management** to list projects.
3. Present the result as a short numbered list and acknowledge the successful
   connection.

If the current client exposes only `search` and `fetch`, ask for a topic or file
name instead. Search for it, show the results, and fetch the item they select.

Translate failures into plain guidance:

| What happens | What to say |
| --- | --- |
| Authentication fails | “Your Spuree connection needs to be renewed. Reconnect Spuree, then I can try again.” |
| Spuree cannot be reached | “I can't reach Spuree right now. Let's retry once the connection is available.” |
| No projects exist | “You're connected, but there are no projects yet. If creation tools are available, would you like me to create one?” |
| No search results | “The connection works, but nothing matched. Want to try a different phrase?” |

### Phase 2 — Browse something useful

If projects can be listed, let the user choose one, then use `project_browse` or
the **project-management** skill to show its immediate contents. Continue into a
folder with `folder_browse` or **folder-management** only when the user asks.

On the search/fetch connector, let the user choose a search result and call
`fetch` to read it.

### Phase 3 — Offer a next action

After the first success, offer two or three relevant examples from the capability
menu. Do not create, rename, share, upload, replace, or delete anything until the
user explicitly chooses that action.

## Principles

- **One step at a time.** Guide, show the result, and wait.
- **Orientation before action.** A help question deserves an overview, not an
  immediate mutation or filesystem search.
- **Read-only first.** Establish trust before offering changes.
- **Use the current surface.** Full tools and search/fetch connectors have
  different capabilities.
- **Delegate API details.** Endpoint schemas remain in the domain skills and MCP
  tool definitions.
