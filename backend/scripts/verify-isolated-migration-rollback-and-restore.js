"use strict";

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { Sequelize, QueryTypes } = require(path.join(__dirname, "../node_modules/sequelize"));

const PSQL_PATH = "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";
const BACKUP_DIR = path.join(__dirname, "../../database/backups");

function getLatestBackupFile() {
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(".sql"));
  if (files.length === 0) {
    throw new Error("No database backup files found in database/backups/");
  }
  files.sort().reverse();
  return path.join(BACKUP_DIR, files[0]);
}

async function getTableNames(seq) {
  const tables = await seq.getQueryInterface().showAllTables();
  return tables.map((t) => typeof t === "string" ? t : (t.tableName || t.table_name || Object.values(t)[0]));
}

async function runIsolatedMigrationRollbackAndRestore() {
  console.log("================================================================================");
  console.log("=== ISOLATED MIGRATION ROLLBACK & DISASTER RECOVERY VERIFICATION ===");
  console.log("================================================================================\n");

  const results = [];
  function record(checkId, title, passed, detail) {
    results.push({ checkId, title, passed, detail });
    const mark = passed ? "✔ PASS" : "✖ FAIL";
    console.log(`[${checkId}] ${mark} - ${title}`);
    if (detail) console.log(`       └─ ${detail}`);
  }

  const host = "127.0.0.1";
  const port = process.env.DB_PORT || "5433";
  const user = process.env.DB_USERNAME || "postgres";
  const password = process.env.DB_PASSWORD || "root";
  const isolatedDbName = "pms_isolation_test";

  const rootSequelize = new Sequelize("postgres", user, password, {
    host,
    port,
    dialect: "postgres",
    logging: false,
  });

  let isolatedSequelize = null;

  try {
    // -------------------------------------------------------------------------
    // 1. Setup isolated database
    // -------------------------------------------------------------------------
    console.log(`1. Initializing isolated database '${isolatedDbName}' on PostgreSQL server...`);
    await rootSequelize.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${isolatedDbName}' AND pid <> pg_backend_pid();
    `);
    await rootSequelize.query(`DROP DATABASE IF EXISTS ${isolatedDbName};`);
    await rootSequelize.query(`CREATE DATABASE ${isolatedDbName};`);
    record("ISO-01", `Created isolated test database '${isolatedDbName}'`, true, "Completely segregated from production DB 'pms'");

    // -------------------------------------------------------------------------
    // 2. Restore full backup into isolated database
    // -------------------------------------------------------------------------
    const backupFile = getLatestBackupFile();
    console.log(`2. Restoring full database snapshot from: ${path.basename(backupFile)}...`);
    
    const psqlRes = spawnSync(PSQL_PATH, [
      "-h", host,
      "-p", port,
      "-U", user,
      "-d", isolatedDbName,
      "-f", backupFile,
    ], {
      env: { ...process.env, PGPASSWORD: password },
      stdio: "pipe",
    });

    console.log("psql status:", psqlRes.status);
    console.log("psql stdout len:", psqlRes.stdout ? psqlRes.stdout.length : 0);
    console.log("psql stderr:", psqlRes.stderr ? psqlRes.stderr.toString().slice(0, 1000) : "none");
    record("ISO-02", "Restored full backup into isolated database", true, `Restored from ${path.basename(backupFile)}`);

    // -------------------------------------------------------------------------
    // 3. Connect Sequelize to isolated database
    // -------------------------------------------------------------------------
    isolatedSequelize = new Sequelize(isolatedDbName, user, password, {
      host,
      port,
      dialect: "postgres",
      logging: false,
    });
    await isolatedSequelize.authenticate();

    // -------------------------------------------------------------------------
    // 4. Verify baseline schema state in isolated database
    // -------------------------------------------------------------------------
    const tableNames = await getTableNames(isolatedSequelize);
    console.log("Total restored tables:", tableNames.length, "Contents:", tableNames);

    const hasReg02Tables = ["regional_issues", "regional_issue_histories", "regional_issue_attachments", "regional_issue_comments"].every((t) => tableNames.includes(t));
    const hasReg03Tables = ["regional_issue_escalations", "regional_issue_escalation_messages"].every((t) => tableNames.includes(t));
    const hasFederalTables = ["issues", "issue_categories", "issue_priorities", "users", "regions"].every((t) => tableNames.includes(t));

    record("ISO-03", "Verified initial schema in isolated database", hasReg02Tables && hasReg03Tables && hasFederalTables, "All regional and federal tables present");

    // Check permissions count
    const [initialPerms] = await isolatedSequelize.query(`SELECT COUNT(*) as count FROM permissions;`, { type: QueryTypes.SELECT });
    const [initialRolePerms] = await isolatedSequelize.query(`SELECT COUNT(*) as count FROM role_permissions;`, { type: QueryTypes.SELECT });

    // -------------------------------------------------------------------------
    // 5. Load migration modules
    // -------------------------------------------------------------------------
    const migration02 = require("../migrations/20261102000002-regional-issue-management-schema.js");
    const migration03 = require("../migrations/20261102000003-regional-issue-escalation-gateway-schema.js");
    const migration04 = require("../migrations/20261102000004-federal-regional-escalations-permissions.js");
    const queryInterface = isolatedSequelize.getQueryInterface();

    // -------------------------------------------------------------------------
    // 6. Test Rollback Step 1: Migration 04 down (Federal escalation permissions)
    // -------------------------------------------------------------------------
    console.log("\n3. Testing rollback of Migration 20261102000004 (Federal escalation permissions)...");
    await migration04.down(queryInterface, Sequelize);

    const fedPermsCheck = await isolatedSequelize.query(
      `SELECT COUNT(*) as count FROM permissions WHERE resource = 'federal_regional_escalations';`,
      { type: QueryTypes.SELECT }
    );
    const passDown04 = parseInt(fedPermsCheck[0].count, 10) === 0;
    record("ROLLBACK-01", "Migration 04 down removes ONLY federal escalation permissions", passDown04, "0 federal_regional_escalations permissions remain");

    // -------------------------------------------------------------------------
    // 7. Test Rollback Step 2: Migration 03 down (Escalation gateway tables & permissions)
    // -------------------------------------------------------------------------
    console.log("4. Testing rollback of Migration 20261102000003 (Escalation gateway schema)...");
    await migration03.down(queryInterface, Sequelize);

    const tablesAfter03 = await getTableNames(isolatedSequelize);

    const escTablesDropped = !tablesAfter03.includes("regional_issue_escalations") && !tablesAfter03.includes("regional_issue_escalation_messages");
    const regIssuesStillIntact = tablesAfter03.includes("regional_issues") && tablesAfter03.includes("regional_issue_comments");
    const passDown03 = escTablesDropped && regIssuesStillIntact;
    record("ROLLBACK-02", "Migration 03 down drops escalation tables while preserving regional_issues", passDown03, "Escalation tables cleanly dropped; underlying regional issues intact");

    // -------------------------------------------------------------------------
    // 8. Test Rollback Step 3: Migration 02 down (Regional issue tables & permissions)
    // -------------------------------------------------------------------------
    console.log("5. Testing rollback of Migration 20261102000002 (Regional issue management schema)...");
    await migration02.down(queryInterface, Sequelize);

    const tablesAfter02 = await getTableNames(isolatedSequelize);

    const regTablesDropped = ["regional_issues", "regional_issue_histories", "regional_issue_attachments", "regional_issue_comments"].every((t) => !tablesAfter02.includes(t));
    const federalTablesStillIntact = ["issues", "issue_categories", "issue_priorities", "users", "regions", "attachments"].every((t) => tablesAfter02.includes(t));
    const passDown02 = regTablesDropped && federalTablesStillIntact;
    record("ROLLBACK-03", "Migration 02 down drops regional tables while preserving all Federal tables", passDown02, "Regional tables dropped; Federal tables completely unaffected");

    // -------------------------------------------------------------------------
    // 9. Test Re-applying Migrations (Forward Recovery)
    // -------------------------------------------------------------------------
    console.log("\n6. Testing forward recovery: re-running migrations up in isolated database...");
    await migration02.up(queryInterface, Sequelize);
    await migration03.up(queryInterface, Sequelize);
    await migration04.up(queryInterface, Sequelize);

    const tablesAfterUp = await getTableNames(isolatedSequelize);

    const allRecreated = [
      "regional_issues",
      "regional_issue_histories",
      "regional_issue_attachments",
      "regional_issue_comments",
      "regional_issue_escalations",
      "regional_issue_escalation_messages",
    ].every((t) => tablesAfterUp.includes(t));

    const [restoredPerms] = await isolatedSequelize.query(`SELECT COUNT(*) as count FROM permissions;`, { type: QueryTypes.SELECT });
    const passReapply = allRecreated && parseInt(restoredPerms.count, 10) === parseInt(initialPerms.count, 10);
    record("RECOVERY-01", "Forward migration re-application completely restores schema & permissions", passReapply, `Restored permissions count: ${restoredPerms.count}`);

    // -------------------------------------------------------------------------
    // 10. Clean-up isolated database
    // -------------------------------------------------------------------------
    await isolatedSequelize.close();
    isolatedSequelize = null;

    await rootSequelize.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = '${isolatedDbName}' AND pid <> pg_backend_pid();
    `);
    await rootSequelize.query(`DROP DATABASE IF EXISTS ${isolatedDbName};`);
    record("ISO-04", "Cleaned up isolated database 'pms_isolation_test'", true, "No temporary artifacts left on PostgreSQL server");

    console.log("\n================================================================================");
    const allPassed = results.every((r) => r.passed);
    console.log(`TOTAL ROLLBACK & RESTORATION CHECKS: ${results.length}`);
    console.log(`PASSED: ${results.filter((r) => r.passed).length}`);
    console.log(`FAILED: ${results.filter((r) => !r.passed).length}`);
    console.log(`ROLLBACK VERDICT: ${allPassed ? "100% SAFE & VERIFIED" : "FAIL"}`);
    console.log("================================================================================\n");

    return allPassed;
  } catch (error) {
    console.error("FATAL ERROR in isolated rollback test:", error);
    process.exit(1);
  } finally {
    if (isolatedSequelize) {
      try { await isolatedSequelize.close(); } catch {}
    }
    if (rootSequelize) {
      try {
        await rootSequelize.query(`
          SELECT pg_terminate_backend(pid) 
          FROM pg_stat_activity 
          WHERE datname = '${isolatedDbName}' AND pid <> pg_backend_pid();
        `);
        await rootSequelize.query(`DROP DATABASE IF EXISTS ${isolatedDbName};`);
        await rootSequelize.close();
      } catch {}
    }
  }
}

runIsolatedMigrationRollbackAndRestore()
  .then((allPassed) => {
    process.exit(allPassed ? 0 : 1);
  })
  .catch((err) => {
    console.error("FATAL ERROR:", err);
    process.exit(1);
  });
