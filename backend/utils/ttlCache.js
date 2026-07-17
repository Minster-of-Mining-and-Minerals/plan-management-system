"use strict";

/**
 * Tiny in-memory TTL cache for hot reads (branding, etc.).
 */
function createTtlCache({ ttlMs = 60_000 } = {}) {
  let entry = null;

  return {
    get() {
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        entry = null;
        return null;
      }
      return entry.value;
    },
    set(value) {
      entry = { value, expiresAt: Date.now() + ttlMs };
      return value;
    },
    clear() {
      entry = null;
    },
  };
}

module.exports = { createTtlCache };
