import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { promisify } from "util";
import { fileURLToPath, pathToFileURL } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");
const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = "collab_session";
const SESSION_DAYS = 7;

export const prisma = new PrismaClient();
export const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 1024 * 1024 },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(express.static(clientDistPath));

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [salt, expectedHex] = (stored || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header.split(";").filter(Boolean).map((part) => {
      const index = part.indexOf("=");
      return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1))];
    }),
  );
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function createSession(userId, res) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await prisma.session.create({ data: { tokenHash: tokenHash(token), expiresAt, userId } });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 86400000,
  });
}

async function requireAuth(req, res, next) {
  try {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return res.status(401).json({ error: "Please log in." });
    const session = await prisma.session.findUnique({
      where: { tokenHash: tokenHash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie(SESSION_COOKIE);
      return res.status(401).json({ error: "Your session has expired. Please log in again." });
    }
    req.user = session.user;
    req.session = session;
    next();
  } catch (error) {
    next(error);
  }
}

async function accessibleDocument(id, userId, include = {}) {
  return prisma.document.findFirst({
    where: { id, OR: [{ ownerId: userId }, { sharedWith: { some: { id: userId } } }] },
    include,
  });
}

const documentIncludes = { owner: true, sharedWith: true, attachments: true };
const mapDocument = (doc, userId) => ({
  ...doc,
  isOwnedByCurrentUser: doc.ownerId === userId,
  isShared: doc.ownerId !== userId,
});

function escapedTextHtml(text) {
  const escaped = text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return escaped.split(/\r?\n/).map((line) => `<p>${line || "<br>"}</p>`).join("");
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ error: "Name must be at least 2 characters." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Enter a valid email address." });
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters." });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with that email already exists." });
    const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password) } });
    await createSession(user.id, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    await createSession(user.id, res);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

app.post("/api/auth/logout", requireAuth, async (req, res, next) => {
  try {
    await prisma.session.delete({ where: { id: req.session.id } });
    res.clearCookie(SESSION_COOKIE);
    res.status(204).end();
  } catch (error) { next(error); }
});

app.get("/api/users", requireAuth, async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { id: { not: req.user.id } },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true },
    });
    res.json(users);
  } catch (error) { next(error); }
});

app.get("/api/documents", requireAuth, async (req, res, next) => {
  try {
    const documents = await prisma.document.findMany({
      where: { OR: [{ ownerId: req.user.id }, { sharedWith: { some: { id: req.user.id } } }] },
      orderBy: { updatedAt: "desc" },
      include: documentIncludes,
    });
    res.json(documents.map((doc) => mapDocument(doc, req.user.id)));
  } catch (error) { next(error); }
});

app.post("/api/documents", requireAuth, async (req, res, next) => {
  try {
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Title is required." });
    if (title.length > 120) return res.status(400).json({ error: "Title must be 120 characters or fewer." });
    const document = await prisma.document.create({
      data: { title, content: String(req.body.content || "<p>New draft</p>"), ownerId: req.user.id },
      include: documentIncludes,
    });
    res.status(201).json(mapDocument(document, req.user.id));
  } catch (error) { next(error); }
});

app.get("/api/documents/:id", requireAuth, async (req, res, next) => {
  try {
    const document = await accessibleDocument(req.params.id, req.user.id, documentIncludes);
    if (!document) return res.status(404).json({ error: "Document not found or unavailable." });
    res.json(mapDocument(document, req.user.id));
  } catch (error) { next(error); }
});

app.put("/api/documents/:id", requireAuth, async (req, res, next) => {
  try {
    const existing = await accessibleDocument(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: "Document not found or unavailable." });
    const title = String(req.body.title || "").trim();
    if (!title) return res.status(400).json({ error: "Title is required." });
    if (title.length > 120) return res.status(400).json({ error: "Title must be 120 characters or fewer." });
    const document = await prisma.document.update({
      where: { id: req.params.id },
      data: { title, content: String(req.body.content ?? existing.content) },
      include: documentIncludes,
    });
    res.json(mapDocument(document, req.user.id));
  } catch (error) { next(error); }
});

app.post("/api/documents/:id/share", requireAuth, async (req, res, next) => {
  try {
    const document = await prisma.document.findUnique({ where: { id: req.params.id }, include: { sharedWith: true } });
    if (!document || document.ownerId !== req.user.id) return res.status(403).json({ error: "Only the document owner can share it." });
    const userId = String(req.body.userId || "");
    if (userId === req.user.id) return res.status(400).json({ error: "You already own this document." });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: "User not found." });
    if (document.sharedWith.some((person) => person.id === userId)) return res.status(409).json({ error: "Document is already shared with that user." });
    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: { sharedWith: { connect: { id: userId } } },
      include: documentIncludes,
    });
    res.json(mapDocument(updated, req.user.id));
  } catch (error) { next(error); }
});

app.post("/api/documents/:id/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Choose a file to upload." });
    if (!/\.(txt|md)$/i.test(req.file.originalname)) return res.status(400).json({ error: "Supported file types are .txt and .md only." });
    const document = await accessibleDocument(req.params.id, req.user.id);
    if (!document) return res.status(404).json({ error: "Document not found or unavailable." });
    const rawContent = req.file.buffer.toString("utf8");
    await prisma.$transaction([
      prisma.attachment.create({ data: { filename: req.file.originalname, mimeType: req.file.mimetype || "text/plain", size: req.file.size, content: rawContent, documentId: req.params.id } }),
      prisma.document.update({ where: { id: req.params.id }, data: { content: escapedTextHtml(rawContent) } }),
    ]);
    res.json({ success: true, message: "File imported into the document." });
  } catch (error) { next(error); }
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return res.status(404).json({ error: "API route not found." });
  res.sendFile(path.join(clientDistPath, "index.html"), (error) => error && next(error));
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(400).json({ error: "File must be 1 MB or smaller." });
  console.error(error);
  res.status(500).json({ error: "Something went wrong. Please try again." });
});

export async function startServer(port = process.env.PORT || 3001) {
  return app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) startServer();
