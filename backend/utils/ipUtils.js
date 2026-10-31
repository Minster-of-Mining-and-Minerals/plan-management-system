"use strict";

/**
 * Convert IPv4 string to 32-bit integer
 */
function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Check if clientIp falls within the given CIDR range (e.g. "192.168.1.0/24")
 */
function ipInCidr(clientIp, cidr) {
  if (!cidr || !clientIp) return false;
  const [rangeIp, prefixLengthStr] = cidr.split("/");
  if (!prefixLengthStr) {
    return clientIp === rangeIp;
  }

  const prefixLength = parseInt(prefixLengthStr, 10);
  if (isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return false;
  }

  const clientInt = ipToInt(clientIp);
  const rangeInt = ipToInt(rangeIp);
  if (clientInt === null || rangeInt === null) return false;

  const mask = prefixLength === 0 ? 0 : (~0 << (32 - prefixLength)) >>> 0;
  return (clientInt & mask) === (rangeInt & mask);
}

/**
 * Check if a client IP matches an IP restriction record
 */
function matchesIpRestriction(clientIp, restriction) {
  if (!clientIp || !restriction || !restriction.is_active) return false;

  const target = restriction.ip_address.trim();
  if (restriction.is_cidr || target.includes("/")) {
    return ipInCidr(clientIp, target);
  }
  return clientIp === target;
}

module.exports = {
  ipToInt,
  ipInCidr,
  matchesIpRestriction,
};

