#!/usr/bin/env node
"use strict";

/**
 * Moves active domain migrations to archive/pre-squash so only the orchestrator runs.
 * Run BEFORE activating migrations/archive/pending/20260101000000-complete-database-schema.js
 *
 * Usage: node scripts/archive-pre-squash-migrations.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../migrations");
const ARCHIVE = path.join(ROOT, "archive/pre-squash");

const KEEP_IN_ROOT = new Set([
  "_helpers",
  "archive",
]);

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!fs.existsSync(ARCHIVE)) {
    if (!dryRun) fs.mkdirSync(ARCHIVE, { recursive: true });
  }

  const files = fs
    .readdirSync(ROOT)
    .filter((f) => f.endsWith(".js") && !KEEP_IN_ROOT.has(f));

  for (const file of files) {
    const from = path.join(ROOT, file);
    const to = path.join(ARCHIVE, file);
    console.log(dryRun ? `[dry-run] ${file}` : `archive ${file}`);
    if (!dryRun) {
      let content = fs.readFileSync(from, "utf8");
      content = content
        .replace(/require\("\.\/_helpers\//g, 'require("../../_helpers/')
        .replace(/require\('\.\/_helpers\//g, "require('../../_helpers/")
        .replace(/require\("\.\.\/config\//g, 'require("../../../config/')
        .replace(/require\('\.\.\/config\//g, "require('../../../config/");
      fs.writeFileSync(to, content);
      fs.unlinkSync(from);
    }
  }

  const orchestratorSrc = path.join(
    ROOT,
    "archive/pending/20260101000000-complete-database-schema.js"
  );
  const orchestratorDst = path.join(ROOT, "20260101000000-complete-database-schema.js");
  if (fs.existsSync(orchestratorSrc)) {
    console.log(dryRun ? "[dry-run] activate orchestrator" : "activate orchestrator");
    if (!dryRun) fs.copyFileSync(orchestratorSrc, orchestratorDst);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
