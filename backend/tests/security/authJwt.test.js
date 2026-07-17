"use strict";

const request = require("supertest");
const {
  getApp,
  signToken,
  authHeader,
  expectStatus,
} = require("../helpers/securityHelpers");

describe("security regression: auth & JWT", () => {
  let app;

  beforeAll(() => {
    app = getApp();
  });

  it("rejects protected routes without token (401)", async () => {
    await expectStatus(app, "get", "/api/roles", 401);
    await expectStatus(app, "get", "/api/attachments", 401);
    await expectStatus(app, "get", "/api/audit-logs", 401);
    await expectStatus(app, "get", "/api/dashboard/stats", 401);
    await expectStatus(app, "get", "/api/patients", 401);
  });

  it("rejects malformed Bearer token (401/403)", async () => {
    const res = await request(app)
      .get("/api/roles")
      .set({ Authorization: "Bearer not-a-jwt" });
    expect([401, 403]).toContain(res.status);
  });

  it("rejects expired JWT (401/403)", async () => {
    const token = signToken(
      { user_id: "00000000-0000-4000-8000-000000000099" },
      { expiresIn: "-1s" }
    );
    const res = await request(app)
      .get("/api/roles")
      .set(authHeader(token));
    expect([401, 403]).toContain(res.status);
  });

  it("rejects JWT missing user_id claim (401/403)", async () => {
    const jwt = require("jsonwebtoken");
    const secret = process.env.JWT_SECRET || "ci-test-jwt-secret-at-least-32-chars!!";
    const token = jwt.sign({ email: "x@y.com" }, secret, { expiresIn: "1h" });
    const res = await request(app).get("/api/roles").set(authHeader(token));
    expect([401, 403]).toContain(res.status);
  });

  it("login empty body returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("login invalid credentials returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password-xx" });
    expect([400, 401]).toContain(res.status);
  });
});
