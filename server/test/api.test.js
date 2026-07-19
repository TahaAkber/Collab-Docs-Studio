import test, { after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import { app, prisma } from "../index.js";

after(async () => {
  const testUsers = await prisma.user.findMany({
    where: { email: { endsWith: "@example.com" } },
    select: { id: true },
  });
  const ids = testUsers.map((user) => user.id);
  if (ids.length) {
    await prisma.document.deleteMany({ where: { ownerId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.$disconnect();
});

test("health endpoint responds", async () => {
  const response = await supertest(app).get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("document APIs require a login", async () => {
  const response = await supertest(app).get("/api/documents");
  assert.equal(response.status, 401);
});

test("a signed-up user can create and reopen a document", async () => {
  const agent = supertest.agent(app);
  const email = `writer-${Date.now()}@example.com`;
  const signup = await agent.post("/api/auth/signup").send({ name: "Test Writer", email, password: "strong-pass" });
  assert.equal(signup.status, 201);

  const created = await agent.post("/api/documents").send({ title: "Persistent draft", content: "<p><strong>Hello</strong></p>" });
  assert.equal(created.status, 201);
  assert.equal(created.body.isOwnedByCurrentUser, true);

  const reopened = await agent.get(`/api/documents/${created.body.id}`);
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.content, "<p><strong>Hello</strong></p>");
});

test("a different user cannot share someone else's document", async () => {
  const owner = supertest.agent(app);
  const outsider = supertest.agent(app);
  const stamp = Date.now();
  await owner.post("/api/auth/signup").send({ name: "Owner User", email: `owner-${stamp}@example.com`, password: "strong-pass" });
  const outsiderSignup = await outsider.post("/api/auth/signup").send({ name: "Other User", email: `other-${stamp}@example.com`, password: "strong-pass" });
  const created = await owner.post("/api/documents").send({ title: "Private draft" });
  const response = await outsider.post(`/api/documents/${created.body.id}/share`).send({ userId: outsiderSignup.body.user.id });
  assert.equal(response.status, 403);
});
