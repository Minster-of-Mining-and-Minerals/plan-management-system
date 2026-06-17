"use strict";

/**
 * Validates baseline migrations on a throwaway database:
 * migrate → undo all → migrate (idempotency + rollback safety).
 *
 * Usage: node scripts/validate-migrations.js
 * Requires: PostgreSQL credentials in backend/.env
 */

const path = require("path");
const { execSync } = require("child_process");
const { Client } = require("pg");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const TEST_DB = `${process.env.DB_NAME || "pms"}_migration_validate`;
const backendDir = path.join(__dirname, "..");

function run(cmd, env = {}) {
    console.log(`\n> ${cmd}`);
    execSync(cmd, {
        cwd: backendDir,
        stdio: "inherit",
        env: { ...process.env, ...env },
    });
}

async function main() {
    const admin = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: "postgres",
    });

    await admin.connect();

    const exists = await admin.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [TEST_DB]);
    if (exists.rows.length > 0) {
        await admin.query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [TEST_DB]
        );
        await admin.query(`DROP DATABASE "${TEST_DB}"`);
    }

    await admin.query(`CREATE DATABASE "${TEST_DB}"`);
    await admin.end();

    const env = { DB_NAME: TEST_DB };

    try {
        run("npx sequelize-cli db:migrate", env);
        run("npx sequelize-cli db:migrate:undo:all", env);
        run("npx sequelize-cli db:migrate", env);
        console.log("\n✓ Migration validation passed (up → undo all → up).");
    } finally {
        const cleanup = new Client({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: "postgres",
        });
        await cleanup.connect();
        await cleanup.query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [TEST_DB]
        );
        await cleanup.query(`DROP DATABASE IF EXISTS "${TEST_DB}"`);
        await cleanup.end();
    }
}

main().catch((err) => {
    console.error("\n✗ Migration validation failed:", err.message);
    process.exit(1);
});
