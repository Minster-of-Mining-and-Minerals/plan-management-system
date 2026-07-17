"use strict";

const MIN_PASSWORD_LENGTH = 12;

/**
 * Validate a new password (change/reset/create). Login keeps its own shorter check.
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
function validateNewPassword(password) {
  if (typeof password !== "string" || !password) {
    return { ok: false, message: "Password is required" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }
  return { ok: true };
}

module.exports = {
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
};
