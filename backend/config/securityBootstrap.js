"use strict";

/**
 * Align JWT env aliases and fail fast on unsafe production secrets.
 * Call once after dotenv.config().
 */
function bootstrapSecurityEnv() {
  if (!process.env.JWT_EXPIRES_IN && process.env.JWT_EXPIRATION_TIME) {
    process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRATION_TIME;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const jwtSecret = process.env.JWT_SECRET || "";
  const weakSecrets = new Set([
    "",
    "your-jwt-secret-change-in-production",
    "secret",
    "changeme",
    "change-me-in-production",
  ]);

  if (isProduction) {
    if (weakSecrets.has(jwtSecret) || jwtSecret.length < 32) {
      console.error(
        "FATAL: JWT_SECRET must be set to a strong value (≥32 chars) when NODE_ENV=production."
      );
      process.exit(1);
    }
  } else if (weakSecrets.has(jwtSecret) || jwtSecret.length < 16) {
    console.warn(
      "WARNING: JWT_SECRET is missing or weak. Set a strong secret before any shared/staging deploy."
    );
  }
}

module.exports = { bootstrapSecurityEnv };
