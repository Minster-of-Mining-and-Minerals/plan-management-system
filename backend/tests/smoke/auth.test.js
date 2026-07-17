"use strict";

const request = require("supertest");

const hasDb =
  process.env.SMOKE_WITH_DB === "true" ||
  Boolean(process.env.DB_HOST && process.env.DB_NAME);

describe("smoke: auth login", () => {
  let app;

  beforeAll(() => {
    ({ app } = require("../../app"));
  });

  it("POST /api/auth/login with empty body returns 400", async () => {
    const res = await request(app).post("/api/auth/login").send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/auth/login with bad credentials returns 401", async () => {
    if (!hasDb) {
      // Validation passes; controller hits DB — without DB expect 401 or 500
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "nobody@example.com", password: "wrong-password" });
      expect([401, 500]).toContain(res.status);
      return;
    }

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: "wrong-password" });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  const email = process.env.SMOKE_LOGIN_EMAIL;
  const password = process.env.SMOKE_LOGIN_PASSWORD;

  (email && password ? it : it.skip)(
    "POST /api/auth/login succeeds with SMOKE_LOGIN_* credentials",
    async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email, password });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeTruthy();
    }
  );
});
