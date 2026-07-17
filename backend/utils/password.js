const crypto = require("crypto");

function generateRandomPassword(length = 12) {
  const size = Math.max(8, Number(length) || 12);
  return crypto.randomBytes(size).toString("base64url").slice(0, size);
}

module.exports = { generateRandomPassword };
