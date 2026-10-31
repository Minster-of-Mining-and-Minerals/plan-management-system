"use strict";

const crypto = require("crypto");

/**
 * Clean IPv6-mapped IPv4 addresses (e.g., ::ffff:192.168.1.1 -> 192.168.1.1)
 */
function normalizeIp(ip) {
  if (!ip) return "127.0.0.1";
  let clean = ip.trim();
  if (clean.startsWith("::ffff:")) {
    clean = clean.replace("::ffff:", "");
  }
  if (clean === "::1") {
    clean = "127.0.0.1";
  }
  return clean;
}

/**
 * Extract client IP from headers (X-Forwarded-For) or connection
 */
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    const first = forwarded.split(",")[0].trim();
    return normalizeIp(first);
  }
  return normalizeIp(req.ip || req.connection?.remoteAddress || "127.0.0.1");
}

/**
 * Parse User-Agent string to detect OS, Browser, Device Type, and Device Name
 */
function parseUserAgent(uaString = "") {
  const ua = uaString || "";

  // 1. Operating System
  let os = "Unknown OS";
  if (/windows phone/i.test(ua)) os = "Windows Phone";
  else if (/win64|wow64/i.test(ua)) os = "Windows 64-bit";
  else if (/windows nt 10\.0/i.test(ua)) os = "Windows 10/11";
  else if (/windows nt 6\.3/i.test(ua)) os = "Windows 8.1";
  else if (/windows nt 6\.2/i.test(ua)) os = "Windows 8";
  else if (/windows nt 6\.1/i.test(ua)) os = "Windows 7";
  else if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone/i.test(ua)) os = "iOS (iPhone)";
  else if (/ipad/i.test(ua)) os = "iPadOS";
  else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
  else if (/cros/i.test(ua)) os = "Chrome OS";
  else if (/linux/i.test(ua)) os = "Linux";

  // 2. Browser & Version
  let browser = "Unknown Browser";
  let browserVersion = "";

  const edgeMatch = ua.match(/edg(?:e|a|ios)?\/(\d+(\.\d+)?)/i);
  const chromeMatch = ua.match(/chrome\/(\d+(\.\d+)?)/i);
  const firefoxMatch = ua.match(/firefox\/(\d+(\.\d+)?)/i);
  const safariMatch = ua.match(/version\/(\d+(\.\d+)?).*safari/i);
  const operaMatch = ua.match(/(?:opera|opr)\/(\d+(\.\d+)?)/i);

  if (edgeMatch) {
    browser = "Microsoft Edge";
    browserVersion = edgeMatch[1];
  } else if (operaMatch) {
    browser = "Opera";
    browserVersion = operaMatch[1];
  } else if (chromeMatch) {
    browser = "Google Chrome";
    browserVersion = chromeMatch[1];
  } else if (firefoxMatch) {
    browser = "Mozilla Firefox";
    browserVersion = firefoxMatch[1];
  } else if (safariMatch) {
    browser = "Apple Safari";
    browserVersion = safariMatch[1];
  }

  // 3. Device Type
  let deviceType = "desktop";
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) {
    deviceType = "tablet";
  } else if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/i.test(ua)) {
    deviceType = "mobile";
  } else if (/macintosh/i.test(ua)) {
    deviceType = "laptop";
  }

  // 4. Friendly Device Name
  let deviceName = `${os} (${browser})`;
  if (deviceType === "mobile") {
    deviceName = /iphone/i.test(ua) ? "Apple iPhone" : "Mobile Device";
  } else if (deviceType === "tablet") {
    deviceName = /ipad/i.test(ua) ? "Apple iPad" : "Tablet";
  }

  return {
    os,
    browser,
    browserVersion,
    deviceType,
    deviceName,
  };
}

/**
 * Generate a deterministic device fingerprint hash
 * Combines explicit client-supplied hardware ID with browser fingerprint entropy
 */
function generateDeviceFingerprint(req, clientDeviceId = null) {
  const ua = req.headers["user-agent"] || "";
  const acceptLang = req.headers["accept-language"] || "";
  const ip = getClientIp(req);

  // Use the /24 subnet for IPv4 so minor DHCP reassignments on the same LAN don't flap the fingerprint
  const ipParts = ip.split(".");
  const subnet = ipParts.length === 4 ? `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0` : ip;

  const rawEntropy = [
    clientDeviceId || "",
    ua,
    acceptLang,
    subnet,
  ].join("|");

  return crypto.createHash("sha256").update(rawEntropy).digest("hex");
}

/**
 * Generate a safe, non-secret token hash
 */
function hashToken(token) {
  if (!token) return null;
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Safe public session identifier (first 16 chars of hash with prefix)
 */
function getSafeSessionIdentifier(sessionId) {
  if (!sessionId) return "";
  const clean = sessionId.replace(/-/g, "").toLowerCase();
  return `sess_${clean.slice(0, 12)}`;
}

module.exports = {
  getClientIp,
  parseUserAgent,
  generateDeviceFingerprint,
  hashToken,
  getSafeSessionIdentifier,
};

