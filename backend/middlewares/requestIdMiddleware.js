"use strict";

const { randomUUID } = require("crypto");

/**
 * Attach req.id / X-Request-Id for correlation across logs and responses.
 */
function requestIdMiddleware(req, res, next) {
  const incoming = req.headers["x-request-id"];
  const requestId =
    typeof incoming === "string" && incoming.trim()
      ? incoming.trim().slice(0, 128)
      : randomUUID();
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
}

module.exports = { requestIdMiddleware };
