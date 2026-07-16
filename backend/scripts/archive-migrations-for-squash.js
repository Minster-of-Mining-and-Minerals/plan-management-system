"use strict";

/**
 * Archive all active root migration *.js files into
 * migrations/_legacy/pre_squash_20260716/
 *
 * Keeps helpers/ and _legacy/ in place.
 * Usage: node scripts/archive-migrations-for-squash.js
 */

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");
const ARCHIVE_DIR = path.join(MIGRATIONS_DIR, "_legacy", "pre_squash_20260716");

function main() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => {
      if (!name.endsWith(".js")) return false;
      if (name.includes("baseline-full-schema")) return false;
      return fs.statSync(path.join(MIGRATIONS_DIR, name)).isFile();
    });

  if (!files.length) {
    console.log("No root migration files to archive.");
    return;
  }

  for (const name of files) {
    const from = path.join(MIGRATIONS_DIR, name);
    const to = path.join(ARCHIVE_DIR, name);
    fs.renameSync(from, to);
    console.log(`Archived ${name}`);
  }

  console.log(`\nArchived ${files.length} migration(s) → ${ARCHIVE_DIR}`);
}

main();
