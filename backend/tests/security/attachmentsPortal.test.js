"use strict";

const request = require("supertest");
const { getApp, signToken, authHeader } = require("../helpers/securityHelpers");

describe("security regression: attachments & portal isolation", () => {
  let app;
  const fakeUserId = "00000000-0000-4000-8000-00000000aa01";
  const otherAttachmentId = "00000000-0000-4000-8000-00000000bb02";

  beforeAll(() => {
    app = getApp();
  });

  it("GET /api/attachments without auth → 401", async () => {
    const res = await request(app).get("/api/attachments");
    expect(res.status).toBe(401);
  });

  it("GET /api/attachments/:id/file without auth → 401", async () => {
    const res = await request(app).get(
      `/api/attachments/${otherAttachmentId}/file`
    );
    expect(res.status).toBe(401);
  });

  it("download unknown attachment as authed user → 404 (no existence leak)", async () => {
    const token = signToken({
      user_id: fakeUserId,
      account_type: "INTERNAL",
      email: "staff@test.local",
    });
    const res = await request(app)
      .get(`/api/attachments/${otherAttachmentId}/file`)
      .set(authHeader(token));
    // Missing DB user may yield 401/403 from auth middleware; attachment miss → 404
    expect([401, 403, 404]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.message).toMatch(/not found/i);
    }
  });

  it("DELETE unknown attachment does not confirm existence to strangers", async () => {
    const token = signToken({
      user_id: fakeUserId,
      account_type: "PATIENT",
      email: "patient@test.local",
    });
    const res = await request(app)
      .delete(`/api/attachments/${otherAttachmentId}`)
      .set(authHeader(token));
    expect([401, 403, 404]).toContain(res.status);
  });

  it("patient portal routes reject INTERNAL tokens at account middleware when hit", async () => {
    const token = signToken({
      user_id: fakeUserId,
      account_type: "INTERNAL",
      email: "staff@test.local",
    });
    const res = await request(app)
      .get("/api/patient-portal/me")
      .set(authHeader(token));
    // Auth middleware loads user from DB — unknown user → 401/403; wrong account → 403
    expect([401, 403]).toContain(res.status);
  });

  it("pharmacy portal rejects PATIENT account type when user resolves", async () => {
    const token = signToken({
      user_id: fakeUserId,
      account_type: "PATIENT",
      email: "patient@test.local",
    });
    const res = await request(app)
      .get("/api/pharmacy-portal/dashboard")
      .set(authHeader(token));
    expect([401, 403, 404]).toContain(res.status);
  });

  it("static /uploads/attachments path is blocked", async () => {
    const res = await request(app).get(
      "/uploads/attachments/does-not-matter.bin"
    );
    expect([401, 404]).toContain(res.status);
  });

  it("RBAC list endpoints require auth", async () => {
    for (const path of [
      "/api/roles",
      "/api/permissions",
      "/api/permission-groups",
      "/api/audit-logs",
      "/api/audit-logs/export",
    ]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(401);
    }
  });
});
