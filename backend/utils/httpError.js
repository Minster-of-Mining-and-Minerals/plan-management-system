"use strict";

/**
 * Shared HTTP error responses — hide internal messages in production for 5xx.
 */
function sendError(res, error, req = null) {
  const status = error?.status || error?.statusCode || 500;
  const isProd = process.env.NODE_ENV === "production";
  const expose =
    error?.expose === true || status < 500 || !isProd;

  if (req?.id || status >= 500) {
    try {
      const logger = require("./logger");
      logger.error(
        {
          requestId: req?.id,
          err: error?.message,
          status,
          path: req?.path,
        },
        "controller_error"
      );
    } catch {
      // ignore logger issues
    }
  }

  const body = {
    success: false,
    message: expose
      ? error?.message || "Internal Server Error"
      : "Internal Server Error",
  };
  if (req?.id) body.request_id = req.id;
  if (!isProd && error?.details) body.errors = error.details;
  if (!isProd && status >= 500 && error?.message) {
    body.debug = error.message;
  }

  return res.status(status).json(body);
}

module.exports = { sendError };
