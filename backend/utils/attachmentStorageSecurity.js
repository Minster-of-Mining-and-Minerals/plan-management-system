"use strict";

const path = require("path");
const fs = require("fs");

/**
 * Resolves the canonical root uploads directory.
 * Ensures the uploads directory exists on disk so realpath can resolve reliably.
 */
function getCanonicalUploadsDir() {
  const uploadsDir = path.resolve(__dirname, "../uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return fs.realpathSync(uploadsDir);
}

/**
 * Recursively decodes URL encoding to prevent double-encoding evasion
 */
function decodeFully(str) {
  let prev = str;
  let decoded = str;
  try {
    for (let i = 0; i < 5; i++) {
      decoded = decodeURIComponent(prev);
      if (decoded === prev) break;
      prev = decoded;
    }
  } catch {
    // If malformed URI sequence, keep current value
  }
  return decoded;
}

/**
 * Validates and safely resolves an attachment file path within the uploads directory.
 * 
 * Guards against:
 *  - Null-byte injection
 *  - URL & double-URL encoded directory traversal
 *  - Windows (\) and POSIX (/) path traversal (..)
 *  - Prefix-confusion directory escapes (e.g. uploads_evil/)
 *  - Absolute path injection (e.g. C:\Windows or /etc)
 *  - Symlink escape attempts (checks fs.realpathSync of both target and base)
 *  - Missing files on disk (returns 404)
 *  - Directory access (ensure real path is a regular file)
 * 
 * @param {string} rawFilePath - Path stored in Attachment record
 * @returns {string} Fully validated, canonical filesystem path to regular file
 */
function resolveAndVerifyUploadPath(rawFilePath) {
  if (!rawFilePath || typeof rawFilePath !== "string") {
    const error = new Error("Invalid attachment storage path.");
    error.status = 400;
    throw error;
  }

  // 1. Null-byte injection check
  if (rawFilePath.includes("\0") || rawFilePath.includes("%00")) {
    const error = new Error("Access forbidden: Null-byte injection detected.");
    error.status = 403;
    throw error;
  }

  // 2. Decode traversal sequences
  const fullyDecoded = decodeFully(rawFilePath);
  if (fullyDecoded.includes("\0")) {
    const error = new Error("Access forbidden: Null-byte injection detected.");
    error.status = 403;
    throw error;
  }

  // 3. Resolve canonical base directory
  const canonicalUploadsDir = getCanonicalUploadsDir();

  // 4. Resolve candidate path
  // If stored path is relative, resolve from backend root where 'uploads' lives
  const backendRoot = path.resolve(__dirname, "..");
  const candidateResolved = path.isAbsolute(rawFilePath)
    ? path.resolve(rawFilePath)
    : path.resolve(backendRoot, rawFilePath);

  // 5. Logical Prefix-Confusion Protection
  // Ensure candidate is strictly within uploadsDir by checking relative path
  const relativeFromBase = path.relative(canonicalUploadsDir, candidateResolved);
  if (
    relativeFromBase.startsWith("..") ||
    path.isAbsolute(relativeFromBase) ||
    candidateResolved === canonicalUploadsDir
  ) {
    const error = new Error("Access forbidden: Path traversal out of upload boundary.");
    error.status = 403;
    throw error;
  }

  // 6. Explicit Prefix-Match with path separator (prevents uploads_evil/)
  const baseWithSep = canonicalUploadsDir.endsWith(path.sep)
    ? canonicalUploadsDir
    : canonicalUploadsDir + path.sep;

  if (!candidateResolved.startsWith(baseWithSep)) {
    const error = new Error("Access forbidden: Path traversal prefix violation.");
    error.status = 403;
    throw error;
  }

  // 7. Check file existence
  if (!fs.existsSync(candidateResolved)) {
    const error = new Error("File not found on storage.");
    error.status = 404;
    throw error;
  }

  // 8. Canonical realpath & Symlink Escape Protection
  let realTarget;
  try {
    realTarget = fs.realpathSync(candidateResolved);
  } catch (err) {
    const error = new Error("Failed to resolve canonical file path.");
    error.status = 404;
    throw error;
  }

  // Verify realpath also resides strictly inside canonicalUploadsDir
  const realRelative = path.relative(canonicalUploadsDir, realTarget);
  if (
    realRelative.startsWith("..") ||
    path.isAbsolute(realRelative) ||
    !realTarget.startsWith(baseWithSep)
  ) {
    const error = new Error("Access forbidden: Symlink escape detected.");
    error.status = 403;
    throw error;
  }

  // 9. Verify it is a regular file, not a directory or device
  const stat = fs.statSync(realTarget);
  if (!stat.isFile()) {
    const error = new Error("Access forbidden: Target is not a regular file.");
    error.status = 403;
    throw error;
  }

  return realTarget;
}

/**
 * Sanitizes downloaded filename for HTTP headers (Content-Disposition)
 */
function sanitizeDownloadFilename(filename) {
  if (!filename || typeof filename !== "string") {
    return "attachment.bin";
  }
  // Strip path traversal, newlines, CR, quotes
  return path.basename(filename).replace(/[\r\n\t"']/g, "_").trim() || "attachment.bin";
}

module.exports = {
  getCanonicalUploadsDir,
  resolveAndVerifyUploadPath,
  sanitizeDownloadFilename,
};
