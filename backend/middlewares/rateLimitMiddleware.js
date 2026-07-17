"use strict";

const rateLimit = require("express-rate-limit");

/** Login / token issuance — tune higher if clinic shares one public IP. */
const authLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
});

/** Forgot-password OTP request / verify / reset. */
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password-reset attempts. Please try again later.",
  },
});

module.exports = {
  authLoginLimiter,
  passwordResetLimiter,
};
