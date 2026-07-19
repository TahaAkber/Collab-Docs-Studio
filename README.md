# Collab Docs Studio

A small full-stack document workspace built with React, Express, Prisma, and SQLite. Users can create an account, edit rich-text documents, import text files, and share editable drafts with other registered users.

## Features

- Email/password signup and login with salted password hashes and server-side sessions
- HTTP-only authentication cookies and API-level document access checks
- Create, rename, save, reopen, and edit documents
- Bold, italic, underline, headings, body text, and ordered/unordered lists
- Import `.txt` and `.md` files into a draft (maximum 1 MB)
- Owner-only sharing with a visible “Owned by you” / “Shared by…” distinction
- SQLite persistence for documents, formatting, sessions, sharing, and import records
- Responsive UI, validation, useful error messages, and automated API tests

Imported files replace the current document body. Markdown is imported as safe text rather than rendered as HTML. Save first if the current draft contains changes you want to keep.

## Run locally

Requirements: Node.js 20 or newer.

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `npx prisma generate`.
4. Run `npx prisma db push`.
5. Run `node server/prisma/seed.js` (optional demo accounts).
6. Run `npm run dev`.

Open `http://localhost:5173`. The Vite development server proxies `/api` to the Express API on port 3001.

Seeded demo accounts all use password `DemoPass123`:

- `maya@acme.dev`
- `alex@acme.dev`
- `noor@acme.dev`

## Verification

```text
npm test
npm run build
```

The tests cover health, unauthenticated access, signup plus persisted rich-text content, and owner-only sharing.

## Architecture note

The React client is a single responsive workspace. Express owns authentication and authorization, while Prisma maps users, sessions, documents, attachments, and the many-to-many sharing relation to SQLite. Rich text is stored as HTML so formatting survives reloads. The implementation prioritizes a coherent reviewer-ready workflow and understandable access rules over real-time co-editing. Shared users can edit; only owners can grant further access.

SQLite makes local review simple. The included Render Blueprint runs schema synchronization and seed setup before startup. Render's free filesystem is ephemeral, so use a persistent Render disk or migrate Prisma to managed Postgres before treating the deployment as durable production storage. Set `DATABASE_URL` to the SQLite path on that disk when using one.

## Deployment

1. Push the repository to GitHub.
2. In Render, create a Blueprint from `render.yaml`.
3. For durable hosted data, attach a persistent disk and point `DATABASE_URL` to a file on its mount path.
4. Deploy and use the generated Render URL.

No public deployment URL is committed because it is created in the owner's Render account.

## AI-native workflow note

OpenAI Codex was used to audit the existing application against the requirements, implement the authentication/authorization flow, strengthen validation, expand tests, and review deployment documentation. AI materially accelerated cross-layer changes spanning the Prisma schema, Express routes, React UI, and test suite.

Generated output was not accepted blindly: identity supplied by browser requests was removed in favor of session-derived identity; owner reassignment through the update endpoint was rejected; imported text was escaped before insertion; and the original absolute localhost API URL was replaced with a same-origin path plus a development proxy. Correctness was checked with Prisma schema generation/synchronization, automated API tests, and a production client build. UX was reviewed around empty, loading, authentication, shared-owner, upload, and error states.
