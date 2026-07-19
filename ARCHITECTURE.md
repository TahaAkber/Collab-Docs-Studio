# Architecture Note

## Overview

Collab Docs Studio is a single-service full-stack application. A React/Vite client provides authentication, document navigation, rich-text editing, upload, and sharing interfaces. An Express API serves both the compiled client and JSON endpoints. Prisma maps application data to SQLite.

## Main components

- **React client:** Maintains the authenticated workspace state, renders owned and shared documents, and uses a browser `contentEditable` surface for rich text.
- **Express API:** Implements validation, authentication, document CRUD, sharing, file import, and static production asset delivery.
- **Session authentication:** Passwords are salted and hashed with Node's `scrypt`. Random session tokens are stored as SHA-256 hashes and sent to browsers only through HTTP-only, same-site cookies.
- **Prisma and SQLite:** Persist users, sessions, documents, document ownership, sharing relationships, and import records. Rich-text HTML is stored so formatting survives refreshes.
- **Railway deployment:** Railpack builds the client and runs the Node service. A 500 MB volume mounted at `/data` stores the SQLite database across deployments.

## Access model

Every document has exactly one owner. Owners and explicitly shared users can read and edit it. Only the owner can grant access to another registered user. The API derives identity from the authenticated session; it never trusts a browser-supplied owner ID.

## Priorities and tradeoffs

The implementation prioritizes a complete, understandable single-user editing and sharing flow, safe identity handling, low setup cost, and reviewer-friendly deployment. SQLite and one Node service keep local setup and hosting simple.

Real-time cursor presence, simultaneous conflict resolution, comments, revision history, granular viewer/editor roles, password recovery, email invitations, and DOCX parsing were intentionally deprioritized. Those features require substantially more infrastructure and would weaken the clarity of the core workflow within the project scope.

## Reliability

Input validation covers account details, titles, permissions, supported upload extensions, and the 1 MB file limit. Imported text is escaped before becoming editor HTML. API errors use consistent JSON responses. Automated tests cover health, authentication enforcement, persisted formatted content, and owner-only sharing.
