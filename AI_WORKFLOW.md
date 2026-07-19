# AI Workflow Note

## Tools used

OpenAI Codex was used as an implementation and review partner across the React client, Express API, Prisma schema, automated tests, deployment configuration, and documentation.

## Where AI materially accelerated the work

AI quickly audited the initial implementation against the assignment, identified that the user dropdown was simulated authentication rather than real login, and coordinated changes across the database, server, client, tests, and deployment configuration. It also shortened the feedback loop while diagnosing stale local processes and Railway build behavior.

## Output changed or rejected

AI output was reviewed rather than accepted automatically. Important corrections included:

- Removing browser-supplied user and owner IDs in favor of session-derived identity.
- Preventing document ownership from being reassigned through the general update endpoint.
- Restricting sharing to document owners.
- Escaping imported text before inserting it into stored rich-text HTML.
- Replacing an absolute localhost API URL with a same-origin `/api` path and Vite proxy.
- Removing a duplicate `npm ci` from Railway configuration after its build logs showed Railpack already installs dependencies.
- Adding test cleanup so generated integration-test accounts do not pollute development data.

## Verification

Correctness was checked through Prisma schema validation and synchronization, four automated API tests, a production Vite build, and live smoke tests against Railway. The live checks covered homepage delivery, health, login, authenticated document listing, and the attached persistent volume. UX review covered authentication, empty and loading states, owned/shared distinctions, formatting controls, upload constraints, validation messages, and responsive layout.
