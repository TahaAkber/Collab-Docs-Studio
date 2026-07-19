import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { promisify } from "util";

const prisma = new PrismaClient();
const scrypt = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function main() {
  const users = [
    { id: "user-1", email: "maya@acme.dev", name: "Maya", password: "DemoPass123" },
    { id: "user-2", email: "alex@acme.dev", name: "Alex", password: "DemoPass123" },
    { id: "user-3", email: "noor@acme.dev", name: "Noor", password: "DemoPass123" },
  ];

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    await prisma.user.upsert({
      where: { id: user.id },
      update: { email: user.email, name: user.name, passwordHash },
      create: { id: user.id, email: user.email, name: user.name, passwordHash },
    });
  }

  const starterDoc = await prisma.document.upsert({
    where: { id: "doc-starter" },
    update: {},
    create: {
      id: "doc-starter",
      title: "Product launch note",
      content:
        "<h1>Launch checklist</h1><ul><li>Review scope</li><li>Share with team</li></ul>",
      ownerId: "user-1",
    },
  });

  await prisma.document.update({
    where: { id: starterDoc.id },
    data: {
      sharedWith: { connect: [{ id: "user-2" }, { id: "user-3" }] },
    },
  });
}

main().finally(() => prisma.$disconnect());
