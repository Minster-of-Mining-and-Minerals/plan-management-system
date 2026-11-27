"use strict";

/**
 * cleanup-and-reseed-organogram.js
 *
 * Destructive one-way cleanup + re-seed:
 *   1. Purges all plan, reporting, user (non-super-admin), and structure data.
 *   2. Re-seeds MoM (Alternative Minister of Mines 2016 E.C.) as the single root sector.
 *   3. Re-seeds GIE and MIDI as child sectors with their department trees.
 *   4. Re-seeds the 100-day short-term plans from the Excel files.
 *
 * Run inside the backend container:
 *   node scripts/cleanup-and-reseed-organogram.js
 */

const { sequelize } = require("../models");

// ─── Organogram seeders (already correct data) ───────────────────────────────
const altMomSeeder = require("../seeders/20260616000001-seed-alternative-minister-of-mines-structure");
const altMomInstitutesSeeder = require("../seeders/20260616000002-seed-alternative-mom-institutes-structure");

// ─── Short-term plan seeder ───────────────────────────────────────────────────
const { seed100DayShortTermPlan } = require("./seed-100-day-short-term-plan");

// ─── Admin user guard ─────────────────────────────────────────────────────────
const HARD_ADMIN_ID = "00000000-0000-4000-8000-000000000001";

async function getAdminUserIds(queryInterface) {
  const rows = await queryInterface.sequelize.query(
    `SELECT user_id FROM users
     WHERE user_id = :adminId
        OR email ILIKE '%admin%'
        OR user_id IN (
            SELECT user_id FROM user_roles ur
            JOIN roles r ON r.role_id = ur.role_id
            WHERE LOWER(r.name) IN ('super_admin', 'superadmin', 'admin', 'administrator')
        )`,
    {
      replacements: { adminId: HARD_ADMIN_ID },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  const ids = rows.map((r) => r.user_id);
  // Always include the hard-coded admin ID even if not in DB
  if (!ids.includes(HARD_ADMIN_ID)) ids.push(HARD_ADMIN_ID);
  return ids;
}

async function safeQuery(queryInterface, sql, replacements = {}) {
  try {
    await queryInterface.sequelize.query(sql, { replacements });
  } catch (err) {
    // Ignore "table does not exist" errors (migration not yet applied)
    if (err.message && err.message.includes("does not exist")) {
      console.warn(`  [SKIP] Table missing, skipping: ${err.message.slice(0, 80)}`);
    } else {
      throw err;
    }
  }
}

async function purgeAllData(queryInterface, adminIds) {
  console.log("\n── PURGE PHASE ──────────────────────────────────────────────");

  // ── 1. Short-term plan data ────────────────────────────────────────────────
  console.log("  Deleting short_term_period_reports ...");
  await safeQuery(queryInterface, `DELETE FROM short_term_period_reports`);

  console.log("  Deleting short_term_kpi_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM short_term_kpi_assignments`);

  console.log("  Deleting short_term_kpis ...");
  await safeQuery(queryInterface, `DELETE FROM short_term_kpis`);

  console.log("  Deleting short_term_plans ...");
  await safeQuery(queryInterface, `DELETE FROM short_term_plans`);

  // ── 2. National reporting data ────────────────────────────────────────────
  console.log("  Deleting national_reporting_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM national_reporting_assignments`);

  console.log("  Deleting national_published_records ...");
  await safeQuery(queryInterface, `DELETE FROM national_published_records`);

  console.log("  Deleting national_reporting_requirements ...");
  await safeQuery(queryInterface, `DELETE FROM national_reporting_requirements`);

  console.log("  Deleting national_reporting_period_configs ...");
  await safeQuery(queryInterface, `DELETE FROM national_reporting_period_configs`);

  // ── 3. Plan data ───────────────────────────────────────────────────────────
  console.log("  Deleting plan_period_achievement_attachments ...");
  await safeQuery(queryInterface, `DELETE FROM plan_period_achievement_attachments`);

  console.log("  Deleting plan_period_achievements ...");
  await safeQuery(queryInterface, `DELETE FROM plan_period_achievements`);

  console.log("  Deleting plan_node_action_logs ...");
  await safeQuery(queryInterface, `DELETE FROM plan_node_action_logs`);

  console.log("  Deleting plan_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM plan_assignments`);

  console.log("  Deleting regional_plan_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM regional_plan_assignments`);

  console.log("  Deleting regional_plan_period_achievements ...");
  await safeQuery(queryInterface, `DELETE FROM regional_plan_period_achievements`);

  console.log("  Deleting regional_plan_versions ...");
  await safeQuery(queryInterface, `DELETE FROM regional_plan_versions`);

  console.log("  Deleting regional_planning_configurations ...");
  await safeQuery(queryInterface, `DELETE FROM regional_planning_configurations`);

  console.log("  Deleting plan_amendment_requests ...");
  await safeQuery(queryInterface, `DELETE FROM plan_amendment_requests`);

  console.log("  Deleting plan_versions ...");
  await safeQuery(queryInterface, `DELETE FROM plan_versions`);

  console.log("  Deleting planning_configurations ...");
  await safeQuery(queryInterface, `DELETE FROM planning_configurations`);

  // ── 4. Users (preserve admins) ────────────────────────────────────────────
  console.log(`  Preserving admin users: ${adminIds.join(", ")}`);

  // Null out structure references on non-admins first (FK safety)
  await safeQuery(
    queryInterface,
    `UPDATE users SET internal_structure_id = NULL, government_structure_id = NULL
     WHERE user_id NOT IN (:adminIds)`,
    { adminIds }
  );

  // Remove user_roles for non-admins
  console.log("  Deleting user_roles for non-admin users ...");
  await safeQuery(
    queryInterface,
    `DELETE FROM user_roles WHERE user_id NOT IN (:adminIds)`,
    { adminIds }
  );

  // Delete non-admin users
  console.log("  Deleting non-admin users ...");
  await safeQuery(
    queryInterface,
    `DELETE FROM users WHERE user_id NOT IN (:adminIds)`,
    { adminIds }
  );

  // ── 5. Internal structures ────────────────────────────────────────────────
  console.log("  Deleting internal_structure_permission_groups ...");
  await safeQuery(queryInterface, `DELETE FROM internal_structure_permission_groups`);

  console.log("  Deleting internal_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM internal_assignments`);

  console.log("  Deleting internal_structures ...");
  await safeQuery(queryInterface, `DELETE FROM internal_structures`);

  // ── 6. Government structures ──────────────────────────────────────────────
  // Null out references in users (admins) before deleting sectors
  if (adminIds.length > 0) {
    await safeQuery(
      queryInterface,
      `UPDATE users SET government_structure_id = NULL WHERE user_id IN (:adminIds)`,
      { adminIds }
    );
  }

  console.log("  Deleting permission_group_government_structures ...");
  await safeQuery(queryInterface, `DELETE FROM permission_group_government_structures`);

  console.log("  Deleting government_structure_branding ...");
  await safeQuery(queryInterface, `DELETE FROM government_structure_branding`);

  console.log("  Deleting government_structures ...");
  await safeQuery(queryInterface, `DELETE FROM government_structures`);

  console.log("  ✓ Purge complete.\n");
}

// ─── Queryinterface adapter ───────────────────────────────────────────────────
// The organogram seeders expect a queryInterface (Sequelize migration interface).
// We build a compatible shim from the sequelize instance.
function makeQueryInterface(seq) {
  return {
    sequelize: seq,
    async bulkInsert(tableName, rows) {
      if (!rows.length) return;
      const cols = Object.keys(rows[0]);
      const placeholders = rows
        .map(
          (_, ri) =>
            `(${cols.map((_, ci) => `$${ri * cols.length + ci + 1}`).join(", ")})`
        )
        .join(", ");
      const values = rows.flatMap((row) => cols.map((c) => row[c] ?? null));
      await seq.query(
        `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES ${placeholders}`,
        { bind: values }
      );
    },
    async bulkDelete(tableName, where) {
      const cols = Object.keys(where);
      const conditions = cols.map((c, i) => `"${c}" = $${i + 1}`).join(" AND ");
      await seq.query(`DELETE FROM "${tableName}" WHERE ${conditions}`, {
        bind: cols.map((c) => where[c]),
      });
    },
  };
}

async function run() {
  console.log("=================================================================");
  console.log("  Ministry of Mines — Cleanup & Re-seed (Organogram 2016 E.C.)");
  console.log("=================================================================");

  const queryInterface = makeQueryInterface(sequelize);

  // ── Identify admin users to preserve ──────────────────────────────────────
  const adminIds = await getAdminUserIds(queryInterface);
  console.log(`\nAdmin users to preserve (${adminIds.length}): ${adminIds.join(", ")}`);

  // ── Purge all data ────────────────────────────────────────────────────────
  await purgeAllData(queryInterface, adminIds);

  // ── Re-seed organogram ────────────────────────────────────────────────────
  console.log("── SEED PHASE ───────────────────────────────────────────────────");
  console.log("\n[1/3] Seeding Alternative Minister of Mines (MoM root sector)...");
  await altMomSeeder.up(queryInterface);

  console.log("\n[2/3] Seeding GIE + MIDI (child institute sectors)...");
  await altMomInstitutesSeeder.up(queryInterface);

  // ── Re-seed short-term plans ──────────────────────────────────────────────
  console.log("\n[3/3] Seeding 100-Day Short-Term Plans...");
  await seed100DayShortTermPlan();

  // ── Final counts ──────────────────────────────────────────────────────────
  console.log("\n── VERIFICATION ─────────────────────────────────────────────────");
  const [govRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM government_structures`
  );
  const [internalRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM internal_structures`
  );
  const [userRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM users`
  );
  const [planRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM short_term_plans`
  );
  const [kpiRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM short_term_kpis`
  );
  const [assignRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM short_term_kpi_assignments`
  );
  const [reportRows] = await sequelize.query(
    `SELECT COUNT(*)::int AS cnt FROM short_term_period_reports`
  );

  console.log(`  government_structures    : ${govRows[0].cnt}`);
  console.log(`  internal_structures      : ${internalRows[0].cnt}`);
  console.log(`  users                    : ${userRows[0].cnt}`);
  console.log(`  short_term_plans         : ${planRows[0].cnt}`);
  console.log(`  short_term_kpis          : ${kpiRows[0].cnt}`);
  console.log(`  short_term_kpi_assignments: ${assignRows[0].cnt}`);
  console.log(`  short_term_period_reports: ${reportRows[0].cnt}`);

  // List sectors
  const [sectors] = await sequelize.query(
    `SELECT name, level, parent_id FROM government_structures ORDER BY level, name`
  );
  console.log("\n  Government structure tree:");
  for (const s of sectors) {
    const indent = "  ".repeat(s.level);
    console.log(`  ${indent}[L${s.level}] ${s.name}${s.parent_id ? "" : " (root)"}`);
  }

  console.log("\n✅ Cleanup & re-seed complete.\n");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n❌ Error:", err.message || err);
    console.error(err.stack);
    process.exit(1);
  });
