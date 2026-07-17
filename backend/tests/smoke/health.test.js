"use strict";

const request = require("supertest");

describe("smoke: health", () => {
  let app;

  beforeAll(() => {
    ({ app } = require("../../app"));
  });

  it("GET /api/health returns ok or degraded with expected shape", async () => {
    const res = await request(app).get("/api/health");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(res.body).toHaveProperty("database");
    expect(res.body).toHaveProperty("timestamp");
  });
});
