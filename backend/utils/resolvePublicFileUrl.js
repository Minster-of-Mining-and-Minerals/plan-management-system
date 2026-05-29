"use strict";

const { PLATFORM_LOGO_URL } = require("../config/platformBranding");

const FILE_BASE =
  process.env.FILE_BASE_URL ||
  process.env.BASE_URL ||
  process.env.API_BASE_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:4000";

const FRONTEND_BASE =
  process.env.FRONTEND_URL ||
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  "http://localhost:3000";

function isUploadPath(normalized) {
  return (
    normalized.startsWith("uploads/") ||
    normalized.includes("/uploads/") ||
    normalized.startsWith("public/uploads/")
  );
}

function normalizePath(filePath) {
  return String(filePath || "").replace(/\\/g, "/").trim();
}

function isLogoPath(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return false;
  return (
    normalized === PLATFORM_LOGO_URL ||
    normalized.endsWith(PLATFORM_LOGO_URL) ||
    normalized.includes("nova-cure-logo")
  );
}

/** True when path is a real signature asset (not hospital logo). */
function isValidSignaturePath(filePath) {
  return Boolean(normalizePath(filePath)) && !isLogoPath(filePath);
}

function resolvePublicFileUrl(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  const base = FILE_BASE.replace(/\/$/, "");
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${base}${path}`;
}

/** Logos & static branding assets live on the web app; uploads live on the API host. */
function resolveBrandingAssetUrl(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (isUploadPath(normalized)) {
    return resolvePublicFileUrl(normalized);
  }
  const base = FRONTEND_BASE.replace(/\/$/, "");
  const path = normalized.startsWith("/") ? normalized : `/${normalized}`;
  return `${base}${path}`;
}

module.exports = {
  FILE_BASE,
  FRONTEND_BASE,
  isLogoPath,
  isValidSignaturePath,
  isUploadPath,
  resolvePublicFileUrl,
  resolveBrandingAssetUrl,
};
