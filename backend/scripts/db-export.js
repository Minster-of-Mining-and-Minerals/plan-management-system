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
    const host = process.env.DB_HOST || "localhost";
    const port = process.env.DB_PORT || "5432";
    const user = process.env.DB_USERNAME || "postgres";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "pms";

    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .replace("T", "_")
        .slice(0, 19);
    const outputFile = path.join(BACKUP_DIR, `${database}_backup_${timestamp}.sql`);

    const pgDump = resolvePgBinary("pg_dump");
    const args = [
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
        "--clean",
        "--if-exists",
        "-f",
        outputFile,
    ];

    const result = spawnSync(pgDump, args, {
        env: { ...process.env, PGPASSWORD: password },
        stdio: "inherit",
        shell: false,
    });

    if (result.status !== 0) {
        console.error("Database export failed.");
        process.exit(result.status || 1);
    }

    const stats = fs.statSync(outputFile);
    console.log(`\nExport complete: ${outputFile}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(1)} KB`);
}

main();
