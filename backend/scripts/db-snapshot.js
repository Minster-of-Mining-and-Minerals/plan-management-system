"use strict";

/**
 * Snapshot helpers for migration cutover:
 *   node scripts/db-snapshot.js full|schema|data|all
 *
 * Writes under database/backups/ with a shared timestamp prefix.
 * Data dump excludes "SequelizeMeta" so restore does not revive old migration history.
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..", "..");
const BACKUP_DIR = path.join(ROOT, "database", "backups");
const SCHEMA_DIR = path.join(ROOT, "database", "schema");

function resolvePgBinary(name) {
  const fromEnv = process.env.PG_BIN_DIR;
  if (fromEnv) {
    const candidate = path.join(fromEnv, `${name}.exe`);
    if (fs.existsSync(candidate)) return candidate;
    const unixCandidate = path.join(fromEnv, name);
    if (fs.existsSync(unixCandidate)) return unixCandidate;
  }

  const windowsCandidates = [
    "C:\\Program Files\\PostgreSQL\\18\\bin",
    "C:\\Program Files\\PostgreSQL\\17\\bin",
    "C:\\Program Files\\PostgreSQL\\16\\bin",
  ].map((dir) => path.join(dir, `${name}.exe`));

  for (const candidate of windowsCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return name;
}

function stamp() {
  return new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);
}

function runPgDump(args, outputFile) {
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = (process.env.DB_USERNAME || "postgres").replace(/^"|"$/g, "");
  const password = (process.env.DB_PASSWORD || "").replace(/^"|"$/g, "");
  const database = (process.env.DB_NAME || "pms").replace(/^"|"$/g, "");
  const pgDump = resolvePgBinary("pg_dump");

  const result = spawnSync(
    pgDump,
    [
      "-h",
      host,
      "-p",
      String(port),
      "-U",
      user,
      "-d",
      database,
      "--no-owner",
      "--no-acl",
      ...args,
      "-f",
      outputFile,
    ],
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: "inherit",
      shell: false,
    }
  );

  if (result.status !== 0) {
    throw new Error(`pg_dump failed for ${outputFile}`);
  }

  const stats = fs.statSync(outputFile);
  console.log(`Wrote ${outputFile} (${(stats.size / 1024).toFixed(1)} KB)`);
  return outputFile;
}

function dumpFull(ts) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const database = (process.env.DB_NAME || "pms").replace(/^"|"$/g, "");
  return runPgDump(
    ["--clean", "--if-exists"],
    path.join(BACKUP_DIR, `${database}_backup_${ts}.sql`)
  );
}

function dumpSchema(ts) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(SCHEMA_DIR, { recursive: true });
  const database = (process.env.DB_NAME || "pms").replace(/^"|"$/g, "");

  const dated = path.join(BACKUP_DIR, `${database}_schema_${ts}.sql`);
  runPgDump(["--schema-only"], dated);

  // Canonical schema used by the clean baseline migration (no DROP statements).
  const canonical = path.join(SCHEMA_DIR, "baseline_schema.sql");
  fs.copyFileSync(dated, canonical);
  console.log(`Canonical schema: ${canonical}`);
  return { dated, canonical };
}

function dumpData(ts) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const database = (process.env.DB_NAME || "pms").replace(/^"|"$/g, "");
  return runPgDump(
    [
      "--data-only",
      "--disable-triggers",
      "--exclude-table-data=SequelizeMeta",
      "--exclude-table-data=\"SequelizeMeta\"",
    ],
    path.join(BACKUP_DIR, `${database}_data_${ts}.sql`)
  );
}

function main() {
  const mode = (process.argv[2] || "all").toLowerCase();
  const ts = stamp();
  console.log(`Snapshot mode=${mode} timestamp=${ts}`);

  if (mode === "full" || mode === "all") dumpFull(ts);
  if (mode === "schema" || mode === "all") dumpSchema(ts);
  if (mode === "data" || mode === "all") dumpData(ts);

  console.log("\nSnapshot complete.");
  console.log("Next: archive old migrations, add baseline migration, then restore data.");
}

main();
