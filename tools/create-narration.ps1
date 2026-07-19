$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Speech

$outputDirectory = Join-Path $PSScriptRoot "..\walkthrough-assets"
$voice = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voice.Rate = -1
$voice.Volume = 100

$scenes = @(
  @{
    File = "01-login.wav"
    Text = "Welcome to Collab Docs Studio, a small full-stack collaborative document editor. The application is live on Railway with a persistent SQLite volume. In this walkthrough I will demonstrate the main user flow end to end: authentication, rich-text document creation, saving, importing a file, sharing with another registered user, and reopening the shared document from that user's account. I will then cover the main architecture decisions, intentionally deprioritized features, and how artificial intelligence supported and accelerated the workflow."
  },
  @{
    File = "02-dashboard.wav"
    Text = "Users can sign up with a name, email, and password, or log in to an existing account. Passwords are salted and hashed with scrypt, and the browser receives only an HTTP-only, same-site session cookie. After login, the workspace shows the current user's identity and their available documents. Every document card clearly says whether it is owned by the current user or shared by somebody else. The empty state also guides a new user directly toward creating their first draft."
  },
  @{
    File = "03-editing.wav"
    Text = "Here I create and rename a document called Walkthrough product brief. The editing surface supports bold, italic, underline, heading and body styles, plus bulleted and numbered lists. In this example the content is formatted and then saved through the authenticated API. The title and rich-text HTML are persisted together, so reopening or refreshing preserves both the text and its structure. The interface provides visible working and saved states, while the server validates required titles and limits them to one hundred and twenty characters."
  },
  @{
    File = "04-sharing.wav"
    Text = "The document owner can grant access to another registered user. The list excludes users who already have access, and granted users appear as visible chips below the sharing control. This permission is enforced by the Express API, not only hidden in the interface. The API derives the owner from the authenticated session, rejects attempts by shared users to reshare a document, and prevents a client from changing ownership through the ordinary document update endpoint."
  },
  @{
    File = "05-import.wav"
    Text = "File import supports plain text and Markdown files up to one megabyte. The interface states that importing replaces the current document body, so the behavior is explicit. On the server, the extension and size are validated, the raw upload is recorded as attachment metadata, and its text is escaped before conversion to editor paragraphs. That makes the imported content editable without treating arbitrary uploaded markup as executable HTML. After import, the content and import count remain available after refresh."
  },
  @{
    File = "06-shared-user.wav"
    Text = "Now I log out as Maya and sign in as Alex. The same document appears immediately with the label Shared by Maya, demonstrating the complete sharing and persistence flow. Alex can open, edit, and save the draft, but the owner-only sharing controls are replaced by a clear explanation of Alex's access. Every document read and update query checks that the current user is either its owner or one of its explicitly shared users."
  },
  @{
    File = "07-architecture.wav"
    Text = "The architecture deliberately stays compact. React and Vite provide the authentication, workspace, editor, upload, and sharing experience. Express handles JSON endpoints, validation, sessions, authorization, and production static files. Prisma maps users, sessions, documents, attachments, ownership, and the many-to-many sharing relationship to SQLite. Railway builds and runs one Node service and mounts a persistent five hundred megabyte volume at slash data. Startup synchronizes the database schema and then seeds reviewer accounts. I prioritized a complete, understandable workflow, secure identity handling, easy local setup, and a reliable live demo. I intentionally deprioritized real-time cursors, simultaneous conflict resolution, comments, revision history, email invitations, password recovery, granular viewer and editor roles, and D O C X parsing."
  },
  @{
    File = "08-ai-workflow.wav"
    Text = "OpenAI Codex was used as an implementation and review partner. It materially accelerated the requirement audit and coordinated changes across the Prisma schema, Express routes, React user interface, automated tests, and Railway deployment. Generated output was reviewed rather than accepted blindly. Browser-provided identity was rejected in favor of session-derived identity. Ownership reassignment was blocked, imported text was escaped, and a duplicate Railway dependency installation was removed after inspecting real build logs. Correctness was verified with Prisma schema validation, four automated API tests, a production Vite build, and live Railway checks covering the homepage, health endpoint, login, authenticated document access, and persistent volume. The result is a tested end-to-end product with its decisions and limitations documented clearly."
  }
)

foreach ($scene in $scenes) {
  $targetPath = Join-Path $outputDirectory $scene.File
  $voice.SetOutputToWaveFile($targetPath)
  $voice.Speak($scene.Text)
  $voice.SetOutputToNull()
}

$voice.Dispose()
