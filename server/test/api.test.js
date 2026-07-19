import test from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import { app } from "../index.js";

const request = supertest(app);

test("health endpoint responds", async () => {
  const response = await request.get("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});

test("documents endpoint returns seeded docs", async () => {
  const response = await request.get("/api/documents?userId=user-1");
  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
});
