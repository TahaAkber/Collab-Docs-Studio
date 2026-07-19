# Collab Docs Studio

A lightweight collaborative document editor built with Node.js, React, Express, Prisma, and SQLite.

## What it demonstrates

- Create, rename, and edit rich-text documents in the browser
- Upload `.txt` and `.md` files to import content into a document
- Share documents between seeded users
- Persistent storage with Prisma + SQLite

## Supported file types

- `.txt`
- `.md`

## Run locally

1. `npm install`
2. `npx prisma db push`
3. `node server/prisma/seed.js` (or let the API seed on startup)
4. `npm run dev`

## Technical notes

- Frontend: React + Vite
- Backend: Express
- Persistence: Prisma ORM with SQLite
- Design priority: quick document creation, simple sharing, preserved formatting through HTML content

## Architecture decision

The app favors a lean, fast path: SQLite for local persistence, a plain Express API for clear server logic, and a browser-based rich-text editor using `contentEditable` and `document.execCommand`. This keeps the product demo coherent while proving full-stack ability.
