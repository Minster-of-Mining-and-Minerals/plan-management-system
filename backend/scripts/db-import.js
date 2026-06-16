"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const ROOT = path.join(__dirname, "..", "..");
const BACKUP_DIR = path.join(ROOT, "database", "backups");

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

function main() {
    const inputArg = process.argv[2];
    if (!inputArg) {
        console.error("Usage: node scripts/db-import.js <backup-file.sql>");
        console.error(`Example: node scripts/db-import.js database/backups/pms_backup_2026-06-16_115430.sql`);
        process.exit(1);
    }

    const inputFile = path.isAbsolute(inputArg)
        ? inputArg
        : path.join(ROOT, inputArg);

    if (!fs.existsSync(inputFile)) {
        console.error(`Backup file not found: ${inputFile}`);
        process.exit(1);
    }

    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const user = process.env.DB_USERNAME || "postgres";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "pms";

    const psql = resolvePgBinary("psql");
    const args = [
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
        inputFile,
    ];

    console.log(`Importing ${inputFile} into database "${database}"...`);

    const result = spawnSync(psql, args, {
        env: { ...process.env, PGPASSWORD: password },
        stdio: "inherit",
        shell: false,
    });

    if (result.status !== 0) {
        console.error("Database import failed.");
        process.exit(result.status || 1);
    }

    console.log("\nImport complete.");
}

main();
