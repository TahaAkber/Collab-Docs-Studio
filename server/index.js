import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../dist");

const app = express();
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(clientDistPath));

const seededUsers = [
  { id: "user-1", email: "maya@acme.dev", name: "Maya" },
  { id: "user-2", email: "alex@acme.dev", name: "Alex" },
  { id: "user-3", email: "noor@acme.dev", name: "Noor" },
];

async function ensureSeedData() {
  for (const user of seededUsers) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
}

ensureSeedData().catch((error) => console.error("Seed failure", error));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { email: "asc" } });
  res.json(users);
});

app.get("/api/documents", async (req, res) => {
  const userId = req.query.userId || "user-1";
  const documents = await prisma.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { sharedWith: { some: { id: userId } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: true,
      sharedWith: true,
      attachments: true,
    },
  });

  res.json(
    documents.map((doc) => ({
      ...doc,
      isOwnedByCurrentUser: doc.ownerId === userId,
      isShared: doc.sharedWith.length > 0,
    })),
  );
});

app.post("/api/documents", async (req, res) => {
  const { title, content, ownerId = "user-1" } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Title is required." });
  }

  const document = await prisma.document.create({
    data: {
      title: title.trim(),
      content: content || "<p>New draft</p>",
      ownerId,
    },
    include: {
      owner: true,
      sharedWith: true,
      attachments: true,
    },
  });

  res.status(201).json(document);
});

app.put("/api/documents/:id", async (req, res) => {
  const { id } = req.params;
  const { title, content, ownerId } = req.body;

  const document = await prisma.document.update({
    where: { id },
    data: {
      title: title?.trim() || undefined,
      content: content || undefined,
      ownerId: ownerId || undefined,
    },
    include: {
      owner: true,
      sharedWith: true,
      attachments: true,
    },
  });

  res.json(document);
});

app.post("/api/documents/:id/share", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;

  const document = await prisma.document.findUnique({
    where: { id },
    include: { sharedWith: true },
  });

  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const alreadyShared = document.sharedWith.some(
    (person) => person.id === userId,
  );
  if (alreadyShared) {
    return res
      .status(409)
      .json({ error: "Document is already shared with that user." });
  }

  const updatedDocument = await prisma.document.update({
    where: { id },
    data: {
      sharedWith: {
        connect: { id: userId },
      },
    },
    include: {
      owner: true,
      sharedWith: true,
      attachments: true,
    },
  });

  res.json(updatedDocument);
});

app.post(
  "/api/documents/:id/upload",
  upload.single("file"),
  async (req, res) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const allowedType = ["text/plain", "text/markdown", "application/json"];
    if (
      !allowedType.includes(file.mimetype) &&
      !file.originalname.endsWith(".md") &&
      !file.originalname.endsWith(".txt")
    ) {
      return res
        .status(400)
        .json({ error: "Supported file types are .txt and .md only." });
    }

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      return res.status(404).json({ error: "Document not found." });
    }

    const content = file.buffer.toString("utf8");
    await prisma.attachment.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype || "text/plain",
        size: file.size,
        content,
        documentId: id,
      },
    });

    await prisma.document.update({
      where: { id },
      data: { content },
    });

    res.json({ success: true, message: "File imported into the document." });
  },
);

app.get("/api/documents/:id", async (req, res) => {
  const document = await prisma.document.findUnique({
    where: { id: req.params.id },
    include: {
      owner: true,
      sharedWith: true,
      attachments: true,
    },
  });

  if (!document) {
    return res.status(404).json({ error: "Document not found." });
  }

  res.json(document);
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api")) {
    return next();
  }

  res.sendFile(path.join(clientDistPath, "index.html"));
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

export { app };
