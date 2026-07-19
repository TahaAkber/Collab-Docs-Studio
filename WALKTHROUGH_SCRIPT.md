# Walkthrough Script (approximately 4 minutes)

## 0:00–0:25 — Introduction

This is Collab Docs Studio, a small full-stack collaborative document editor. The live application is deployed on Railway with persistent SQLite storage. I will demonstrate authentication, rich-text editing, importing a file, and sharing a document with another registered user, then briefly cover architecture, tradeoffs, and my AI workflow.

## 0:25–1:05 — Authentication and document creation

Users can create an account or log in with an existing account. Passwords are never stored directly: the server hashes them with a unique salt, and authentication uses an HTTP-only session cookie. After logging in, the sidebar clearly separates owned documents from documents shared by someone else. I’ll create a new document and give it a meaningful title.

## 1:05–1:45 — Editing and persistence

The editing surface supports bold, italic, underline, headings, body text, and ordered or unordered lists. The title and formatted HTML are saved through the API. After saving and reopening the document, both its content and formatting remain intact. Validation prevents blank or excessively long titles and provides visible error messages.

## 1:45–2:15 — File import

Users can import a text or Markdown file of up to one megabyte. The import replaces the current body, records attachment metadata, and escapes the uploaded text before storing it as editor HTML. The interface clearly states the supported extensions, size limit, and replacement behavior.

## 2:15–2:50 — Sharing end to end

The document owner can grant access to another registered user. Sharing is owner-only at the API layer, not merely hidden in the interface. After logging in as Alex, the document appears as “Shared by Maya.” Alex can open, edit, and save it, but cannot grant access to more users. This demonstrates the owned-versus-shared distinction and the complete access flow.

## 2:50–3:30 — Architecture and intentional scope

The React client and Express API deploy as one service. Prisma manages users, sessions, documents, attachments, and the many-to-many sharing relationship in SQLite. Railway mounts a persistent volume at `/data`, and startup synchronizes the schema before serving traffic. I prioritized a coherent editing and sharing workflow, clear authorization, easy local setup, and reliable deployment. I intentionally deprioritized real-time co-editing, cursors, comments, version history, email invitations, password recovery, granular roles, and DOCX parsing.

## 3:30–4:05 — AI workflow and verification

I used OpenAI Codex to audit requirements and accelerate coordinated changes across the schema, server, client, tests, and deployment. I reviewed and changed generated output: browser-provided identity was rejected in favor of server sessions, ownership reassignment was blocked, imported text was escaped, and Railway’s duplicate dependency install was removed after reading build logs. I verified the result with Prisma validation, four automated API tests, a production build, and live Railway smoke tests covering homepage, health, login, documents, and persistent storage.

## 4:05–4:15 — Close

That is the complete Collab Docs Studio workflow. The README contains local setup and test commands, while separate architecture and AI workflow notes document the key decisions in more detail.
