# Collab Docs Studio

A lightweight collaborative document editor built with Node.js, React, Express, Prisma, and SQLite.

## What it demonstrates

- Create, rename, and edit rich-text documents in the browser
- Upload `.txt` and `.md` files to import content into a document
- Share documents between seeded users
- Persist formatting and document metadata using Prisma + SQLite
- Demonstrate a simple owned vs shared document workflow

## Supported file types

- `.txt`
- `.md`

## Run locally

1. `npm install`
2. `npx prisma db push`
3. `node server/prisma/seed.js`
4. `npm run dev`

## Review the app

- Frontend: `http://localhost:5173/`
- Backend API: `http://localhost:3001/api/health`

## Automated validation

- `npm test`
- `npm run build`

## Technical stack

- Frontend: React + Vite
- Backend: Express
- Persistence: Prisma ORM with SQLite
- Design priority: fast document creation, simple collaboration, and a usable rich-text editing workflow

## Architecture decision

This app intentionally favors a lean path rather than trying to reproduce full document-editing parity. SQLite keeps setup simple and fast, the Express API makes shared behavior clear, and the browser-based rich-text editor uses `contentEditable` so the product feels coherent in a short timebox.

## Deployment note

A basic Render manifest is included in [render.yaml](render.yaml) for a simple Node deployment path. Because the current persistence model uses SQLite, this is best suited for a lightweight demo or reviewer environment rather than a multi-user production workload.
