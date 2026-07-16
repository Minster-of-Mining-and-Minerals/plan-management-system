"use strict";

/**
 * Migration cutover after snapshot:
 *
 *   node scripts/db-cutover.js --validate-only
 *   node scripts/db-cutover.js --apply
 *
 * validate-only: throwaway DB → migrate clean baseline → restore data → smoke check
 * apply:         rebuild configured DB_NAME from clean baseline + latest data snapshot
 *
 * Requires prior snapshots via: node scripts/db-snapshot.js all
 */

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..", "..");
const BACKEND = path.join(__dirname, "..");
const BACKUP_DIR = path.join(ROOT, "database", "backups");

function stripQuotes(value) {
  return String(value || "").replace(/^"|"$/g, "");
}

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

function latestFile(prefix) {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.startsWith(prefix) && name.endsWith(".sql"))
    .map((name) => ({
      name,
      full: path.join(BACKUP_DIR, name),
      mtime: fs.statSync(path.join(BACKUP_DIR, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!files.length) {
    throw new Error(`No backup matching ${prefix}*.sql in ${BACKUP_DIR}`);
  }
  return files[0].full;
}

function run(cmd, env = {}) {
  console.log(`\n> ${cmd}`);
  const result = spawnSync(cmd, {
    cwd: BACKEND,
    stdio: "inherit",
    shell: true,
    env: { ...process.env, ...env },
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd}`);
  }
}

function runPsqlFile(database, filePath) {
  const host = stripQuotes(process.env.DB_HOST) || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = stripQuotes(process.env.DB_USERNAME) || "postgres";
  const password = stripQuotes(process.env.DB_PASSWORD) || "";
  const psql = resolvePgBinary("psql");

  console.log(`\n> psql -d ${database} -f ${filePath}`);
  const result = spawnSync(
    psql,
    [
      "-h",
      host,
      "-p",
      String(port),
      "-U",
      user,
      "-d",
      database,
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      filePath,
    ],
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: "inherit",
      shell: false,
    }
  );
  if (result.status !== 0) {
    throw new Error(`psql restore failed for ${filePath}`);
  }
}

async function recreateDatabase(database) {
  const admin = new Client({
    host: stripQuotes(process.env.DB_HOST) || "localhost",
    port: process.env.DB_PORT || 5432,
    user: stripQuotes(process.env.DB_USERNAME) || "postgres",
    password: stripQuotes(process.env.DB_PASSWORD) || "",
    database: "postgres",
  });
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [database]
  );
  await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
  await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();
  console.log(`Recreated database ${database}`);
}

async function smokeCheck(database) {
  const client = new Client({
    host: stripQuotes(process.env.DB_HOST) || "localhost",
    port: process.env.DB_PORT || 5432,
    user: stripQuotes(process.env.DB_USERNAME) || "postgres",
    password: stripQuotes(process.env.DB_PASSWORD) || "",
    database,
  });
  await client.connect();

  const meta = await client.query(`SELECT name FROM "SequelizeMeta" ORDER BY name`);
  const tables = await client.query(
    `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  const users = await client.query(`SELECT count(*)::int AS n FROM users`);
  const plans = await client.query(`SELECT count(*)::int AS n FROM plan_versions`);

  console.log("\nSmoke check:");
  console.log(`  SequelizeMeta: ${meta.rows.map((r) => r.name).join(", ") || "(empty)"}`);
  console.log(`  public tables: ${tables.rows[0].n}`);
  console.log(`  users: ${users.rows[0].n}`);
  console.log(`  plan_versions: ${plans.rows[0].n}`);

  await client.end();

  if (!meta.rows.some((r) => String(r.name).includes("baseline-full-schema"))) {
    throw new Error("SequelizeMeta missing baseline-full-schema migration name");
  }
  if (tables.rows[0].n < 20) {
    throw new Error("Too few tables after cutover");
  }
}

async function cutoverDatabase(database, dataFile) {
  await recreateDatabase(database);
  run("npx sequelize-cli db:migrate", { DB_NAME: database });
  // session_replication_role helps circular FKs; dump already has --disable-triggers
  runPsqlFile(database, dataFile);
  await smokeCheck(database);
}

async function main() {
  const args = process.argv.slice(2);
  const validateOnly = args.includes("--validate-only");
  const apply = args.includes("--apply");

  if (!validateOnly && !apply) {
    console.log(`Usage:
  node scripts/db-cutover.js --validate-only
  node scripts/db-cutover.js --apply

Snapshots required under database/backups/ (db-snapshot.js all).
Active migrations should be archived first (archive-migrations-for-squash.js)
so only 20260901000001-baseline-full-schema.js remains.`);
    process.exit(1);
  }

  const dbName = stripQuotes(process.env.DB_NAME) || "pms";
  const dataFile = latestFile(`${dbName}_data_`);
  console.log(`Using data snapshot: ${dataFile}`);

  const rootMigrations = fs
    .readdirSync(path.join(BACKEND, "migrations"))
    .filter((n) => n.endsWith(".js"));

  if (rootMigrations.length !== 1 || !rootMigrations[0].includes("baseline-full-schema")) {
    console.error(
      `\nExpected exactly one root migration (baseline-full-schema). Found:\n${rootMigrations.join("\n")}\n`
    );
    console.error("Run: node scripts/archive-migrations-for-squash.js");
    process.exit(1);
  }

  if (validateOnly) {
    const testDb = `${dbName}_cutover_validate`;
    console.log(`\n=== VALIDATE on ${testDb} ===`);
    await cutoverDatabase(testDb, dataFile);

    const admin = new Client({
      host: stripQuotes(process.env.DB_HOST) || "localhost",
      port: process.env.DB_PORT || 5432,
      user: stripQuotes(process.env.DB_USERNAME) || "postgres",
      password: stripQuotes(process.env.DB_PASSWORD) || "",
      database: "postgres",
    });
    await admin.connect();
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [testDb]
    );
    await admin.query(`DROP DATABASE IF EXISTS "${testDb}"`);
    await admin.end();
    console.log(`\n✓ Cutover validation passed (throwaway ${testDb} dropped).`);
    return;
  }

  console.log(`\n=== APPLY cutover to ${dbName} ===`);
  console.log("This DROPS and recreates the configured database.");
  await cutoverDatabase(dbName, dataFile);
  console.log(`\n✓ Cutover applied to ${dbName}.`);
}

main().catch((err) => {
  console.error("\n✗ Cutover failed:", err.message);
  process.exit(1);
});
