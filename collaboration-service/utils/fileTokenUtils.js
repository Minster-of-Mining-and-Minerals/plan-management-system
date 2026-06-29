const jwt = require("jsonwebtoken");

function signFileToken(payload) {
  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
  const expiresIn = Number(process.env.FILE_TOKEN_TTL_SECONDS || 3600);
  return jwt.sign(payload, secret, { expiresIn });
}

function verifyFileToken(token) {
  const secret = process.env.FILE_TOKEN_SECRET || process.env.JWT_SECRET;
  return jwt.verify(token, secret);
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
