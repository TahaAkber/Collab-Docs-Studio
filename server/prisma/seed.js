import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { id: "user-1", email: "maya@acme.dev", name: "Maya" },
    { id: "user-2", email: "alex@acme.dev", name: "Alex" },
    { id: "user-3", email: "noor@acme.dev", name: "Noor" },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
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
