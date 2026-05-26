"use strict";

/**
 * Simple slug generator for codes/names (lowercase, hyphen-separated).
 */
function slugify(value) {
  if (!value || typeof value !== "string") return "";
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

module.exports = { slugify };
