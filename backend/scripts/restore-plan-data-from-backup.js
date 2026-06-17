"use strict";

/**
 * Restore plan drafts, nodes, assignments, and planning config from a pg_dump backup
 * without wiping users, roles, or org structure.
 *
 * Usage:
 *   node scripts/restore-plan-data-from-backup.js
 *   node scripts/restore-plan-data-from-backup.js database/backups/pms_backup_2026-06-16_115430.sql
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..", "..");
const BACKUP_DIR = path.join(ROOT, "database", "backups");
const DEFAULT_BACKUP = path.join(BACKUP_DIR, "pms_backup_2026-06-16_115430.sql");

const PLAN_TABLES_IN_RESTORE_ORDER = [
  "planning_configurations",
  "plan_rules",
  "plan_rule_steps",
  "plan_versions",
  "plan_nodes",
  "internal_assignments",
  "external_assignments",
  "plan_node_action_logs",
];

const TRUNCATE_TABLES = [
  "plan_node_action_logs",
  "internal_assignments",
  "external_assignments",
  "plan_nodes",
  "plan_versions",
];

function resolvePgBinary(name) {
  const fromEnv = process.env.PG_BIN_DIR;
  if (fromEnv) {
    const win = path.join(fromEnv, `${name}.exe`);
    if (fs.existsSync(win)) return win;
    const unix = path.join(fromEnv, name);
    if (fs.existsSync(unix)) return unix;
  }

  for (const dir of [
    "C:\\Program Files\\PostgreSQL\\18\\bin",
    "C:\\Program Files\\PostgreSQL\\17\\bin",
    "C:\\Program Files\\PostgreSQL\\16\\bin",
  ]) {
    const candidate = path.join(dir, `${name}.exe`);
    if (fs.existsSync(candidate)) return candidate;
  }

  return name;
}

function resolveBackupFile(inputArg) {
  if (inputArg) {
    return path.isAbsolute(inputArg) ? inputArg : path.join(ROOT, inputArg);
  }

  if (fs.existsSync(DEFAULT_BACKUP)) {
    return DEFAULT_BACKUP;
  }

  if (!fs.existsSync(BACKUP_DIR)) {
    throw new Error(`Backup directory not found: ${BACKUP_DIR}`);
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => path.join(BACKUP_DIR, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (backups.length === 0) {
    throw new Error("No .sql backup files found in database/backups");
  }

  return backups[0];
}

function extractCopyBlock(sql, tableName) {
  const pattern = new RegExp(
    `COPY public\\.${tableName} \\([\\s\\S]*?\\) FROM stdin;\\r?\\n([\\s\\S]*?)\\r?\\n\\\\\\.`,
    "m"
  );
  const match = sql.match(pattern);
  if (!match) {
    return null;
  }

  const headerMatch = sql.match(
    new RegExp(`COPY public\\.${tableName} \\(([^)]+)\\) FROM stdin;`)
  );
  if (!headerMatch) {
    return null;
  }

  return {
    header: `COPY public.${tableName} (${headerMatch[1]}) FROM stdin;`,
    body: match[1],
  };
}

function buildRestoreSql(backupSql) {
  const sections = [];

  for (const table of PLAN_TABLES_IN_RESTORE_ORDER) {
    const block = extractCopyBlock(backupSql, table);
    if (block) {
      sections.push({ table, block });
    }
  }

  if (!sections.some((s) => s.table === "plan_versions")) {
    throw new Error("Backup does not contain plan_versions data.");
  }

  const lines = [
    "BEGIN;",
    "SET session_replication_role = replica;",
    "",
    `-- Clear existing plan execution data (keeps users, roles, org structure)`,
    `TRUNCATE TABLE ${TRUNCATE_TABLES.join(", ")} CASCADE;`,
    "",
    `-- Upsert planning config and plan rules from backup`,
    `DELETE FROM plan_rule_steps;`,
    `DELETE FROM plan_rules;`,
    `DELETE FROM planning_configurations;`,
    "",
  ];

  for (const { table, block } of sections) {
    lines.push(`-- ${table}`);
    lines.push(block.header);
    lines.push(block.body);
    lines.push("\\.");
    lines.push("");
  }

  lines.push("SET session_replication_role = DEFAULT;");
  lines.push("COMMIT;");
  lines.push("");

  return { sql: lines.join("\n"), tables: sections.map((s) => s.table) };
}

function main() {
  const inputArg = process.argv[2];
  const backupFile = resolveBackupFile(inputArg);

  if (!fs.existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }

  console.log(`Reading backup: ${backupFile}`);
  const backupSql = fs.readFileSync(backupFile, "utf8");
  const { sql, tables } = buildRestoreSql(backupSql);

  const outputFile = path.join(BACKUP_DIR, "_plan_data_restore.sql");
  fs.writeFileSync(outputFile, sql, "utf8");
  console.log(`Generated restore script: ${outputFile}`);
  console.log(`Tables to restore: ${tables.join(", ")}`);

  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || "5432";
  const user = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "pms";

  const psql = resolvePgBinary("psql");
  console.log(`Restoring plan data into "${database}"...`);

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
      outputFile,
    ],
    {
      env: { ...process.env, PGPASSWORD: password },
      stdio: "inherit",
      shell: false,
    }
  );

  if (result.status !== 0) {
    console.error("Plan data restore failed.");
    process.exit(result.status || 1);
  }

  console.log("\nPlan drafts restored successfully from backup.");
}

main();
