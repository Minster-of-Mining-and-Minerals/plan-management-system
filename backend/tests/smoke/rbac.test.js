"use strict";

const request = require("supertest");

describe("smoke: authz gates", () => {
  let app;

  beforeAll(() => {
    ({ app } = require("../../app"));
  });

  it("GET /api/roles without token returns 401", async () => {
    const res = await request(app).get("/api/roles");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/finance/cashier/queue without token returns 401", async () => {
    const res = await request(app).get("/api/finance/cashier/queue");
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/permissions without token returns 401", async () => {
    const res = await request(app).get("/api/permissions");
    expect(res.status).toBe(401);
  });

  it("GET /api/dashboard/stats without token returns 401", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBe(401);
  });
});
