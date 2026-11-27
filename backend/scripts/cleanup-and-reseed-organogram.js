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

  // ── 3. Plan & execution data ───────────────────────────────────────────────
  console.log("  Deleting plan attachments & logs ...");
  await safeQuery(queryInterface, `DELETE FROM plan_period_achievement_attachments`);
  await safeQuery(queryInterface, `DELETE FROM plan_period_achievements`);
  await safeQuery(queryInterface, `DELETE FROM plan_node_action_logs`);
  await safeQuery(queryInterface, `DELETE FROM regional_plan_node_action_logs`);
  await safeQuery(queryInterface, `DELETE FROM company_plan_node_action_logs`);
  await safeQuery(queryInterface, `DELETE FROM plan_sector_aggregation_publishes`);
  await safeQuery(queryInterface, `DELETE FROM plan_amendments`);
  await safeQuery(queryInterface, `DELETE FROM plan_amendment_requests`);
  await safeQuery(queryInterface, `DELETE FROM target_reallocation_requests`);
  await safeQuery(queryInterface, `DELETE FROM target_allocation_histories`);
  await safeQuery(queryInterface, `DELETE FROM plan_execution_window_overrides`);
  await safeQuery(queryInterface, `DELETE FROM plan_assignments`);
  await safeQuery(queryInterface, `DELETE FROM regional_plan_assignments`);
  await safeQuery(queryInterface, `DELETE FROM regional_plan_period_achievements`);
  await safeQuery(queryInterface, `DELETE FROM plan_nodes`);
  await safeQuery(queryInterface, `DELETE FROM regional_plan_nodes`);
  await safeQuery(queryInterface, `DELETE FROM company_plan_nodes`);
  await safeQuery(queryInterface, `DELETE FROM company_production_reports`);
  await safeQuery(queryInterface, `DELETE FROM company_production_reporting_assignments`);
  await safeQuery(queryInterface, `DELETE FROM company_production_target_amendments`);
  await safeQuery(queryInterface, `DELETE FROM company_production_target_approval_histories`);
  await safeQuery(queryInterface, `DELETE FROM company_production_targets`);
  await safeQuery(queryInterface, `DELETE FROM company_production_assignments`);
  await safeQuery(queryInterface, `DELETE FROM regional_issue_escalation_messages`);
  await safeQuery(queryInterface, `DELETE FROM regional_issue_escalations`);
  await safeQuery(queryInterface, `DELETE FROM regional_issue_histories`);
  await safeQuery(queryInterface, `DELETE FROM regional_issue_comments`);
  await safeQuery(queryInterface, `DELETE FROM regional_issues`);
  await safeQuery(queryInterface, `DELETE FROM regional_requirement_mappings`);
  await safeQuery(queryInterface, `DELETE FROM regional_plan_versions`);
  await safeQuery(queryInterface, `DELETE FROM regional_planning_configurations`);
  await safeQuery(queryInterface, `DELETE FROM plan_versions`);
  await safeQuery(queryInterface, `DELETE FROM planning_configurations`);
  await safeQuery(queryInterface, `DELETE FROM plan_rules`);

  // ── 4. User sessions & security logs ───────────────────────────────────────
  console.log("  Deleting sessions and security logs ...");
  await safeQuery(queryInterface, `DELETE FROM user_sessions`);
  await safeQuery(queryInterface, `DELETE FROM session_security_logs`);
  await safeQuery(queryInterface, `DELETE FROM user_device_restrictions`);
  await safeQuery(queryInterface, `DELETE FROM user_permission_groups`);
  await safeQuery(queryInterface, `DELETE FROM system_audit_logs`);
  await safeQuery(queryInterface, `DELETE FROM branding_audit_logs`);

  // ── 5. Users (preserve admins) ────────────────────────────────────────────
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

  // Any other company/external/regional assignment references to users
  await safeQuery(queryInterface, `DELETE FROM company_internal_assignments`);
  await safeQuery(queryInterface, `DELETE FROM regional_internal_assignments`);
  await safeQuery(queryInterface, `DELETE FROM internal_assignments`);
  await safeQuery(queryInterface, `DELETE FROM external_assignments`);
  await safeQuery(queryInterface, `DELETE FROM asm_miners`);

  // Delete non-admin users
  console.log("  Deleting non-admin users ...");
  await safeQuery(
    queryInterface,
    `DELETE FROM users WHERE user_id NOT IN (:adminIds)`,
    { adminIds }
  );

  // ── 6. Internal structures ────────────────────────────────────────────────
  console.log("  Deleting internal_structure_permission_groups ...");
  await safeQuery(queryInterface, `DELETE FROM internal_structure_permission_groups`);

  console.log("  Deleting internal_assignments ...");
  await safeQuery(queryInterface, `DELETE FROM internal_assignments`);

  console.log("  Nulling internal_structures parent_id and deleting ...");
  await safeQuery(queryInterface, `UPDATE internal_structures SET parent_id = NULL`);
  await safeQuery(queryInterface, `DELETE FROM internal_structures`);

  // ── 7. Government structures ──────────────────────────────────────────────
  // Null out references in users (admins) before deleting sectors
  if (adminIds.length > 0) {
    await safeQuery(
      queryInterface,
      `UPDATE users SET government_structure_id = NULL, internal_structure_id = NULL WHERE user_id IN (:adminIds)`,
      { adminIds }
    );
  }

  console.log("  Deleting permission_group_government_structures ...");
  await safeQuery(queryInterface, `DELETE FROM permission_group_government_structures`);
  await safeQuery(queryInterface, `DELETE FROM government_structure_permission_groups`);

  console.log("  Deleting branding_settings ...");
  await safeQuery(queryInterface, `DELETE FROM branding_settings`);
  await safeQuery(queryInterface, `DELETE FROM government_structure_branding`);

  console.log("  Updating roles to remove government_structure_id FK ...");
  await safeQuery(queryInterface, `UPDATE roles SET government_structure_id = NULL`);

  console.log("  Nulling government_structures parent_id and deleting ...");
  await safeQuery(queryInterface, `UPDATE government_structures SET parent_id = NULL`);
  await safeQuery(queryInterface, `DELETE FROM government_structures`);

  console.log("  ✓ Purge complete.\n");
}

async function run() {
  console.log("=================================================================");
  console.log("  Ministry of Mines — Cleanup & Re-seed (Organogram 2016 E.C.)");
  console.log("=================================================================");

  const queryInterface = sequelize.getQueryInterface();

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
