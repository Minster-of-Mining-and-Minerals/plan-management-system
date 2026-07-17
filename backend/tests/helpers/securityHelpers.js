"use strict";

const request = require("supertest");
const jwt = require("jsonwebtoken");

/**
 * Shared helpers for security regression tests.
 */
function getApp() {
  const { app } = require("../../app");
  return app;
}

function signToken(payload, overrides = {}) {
  const secret = process.env.JWT_SECRET || "ci-test-jwt-secret-at-least-32-chars!!";
  return jwt.sign(
    {
      user_id: payload.user_id,
      email: payload.email || "test@example.com",
      account_type: payload.account_type || "INTERNAL",
      token_version: payload.token_version ?? 0,
      ...overrides,
    },
    secret,
    { expiresIn: overrides.expiresIn || "1h" }
  );
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

async function expectStatus(app, method, path, status, opts = {}) {
  let req = request(app)[method](path);
  if (opts.token) req = req.set(authHeader(opts.token));
  if (opts.body) req = req.send(opts.body);
  if (opts.query) req = req.query(opts.query);
  const res = await req;
  expect(res.status).toBe(status);
  return res;
}

module.exports = {
  getApp,
  signToken,
  authHeader,
  expectStatus,
};
