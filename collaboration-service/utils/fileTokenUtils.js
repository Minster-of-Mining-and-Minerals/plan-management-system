const jwt = require("jsonwebtoken");

function signFileToken(payload) {
  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET || "collaboration-file-token-secret";
  // Default to 7 days (604800s) so active editing sessions and force-saves don't expire prematurely
  const expiresIn = Number(process.env.FILE_TOKEN_TTL_SECONDS || 604800);
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyFileToken(token, options = {}) {
  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET || "collaboration-file-token-secret";
  return jwt.verify(token, secret, options);
}

function createDocumentFileToken(documentId) {
  return signFileToken({ documentId, scope: "file" });
}

function createDocumentCallbackToken(documentId) {
  return signFileToken({ documentId, scope: "callback" });
}

function createDocumentVersionFileToken(documentId, versionNumber) {
  return signFileToken({ documentId, versionNumber, scope: "version-file" });
}

module.exports = {
  signFileToken,
  verifyFileToken,
  createDocumentFileToken,
  createDocumentCallbackToken,
  createDocumentVersionFileToken,
};
