"use strict";

/**
 * clean-and-seed-entity-users.js
 *
 * 1. Cleans ALL non-super-admin users (removing old demo/test/stale users cleanly).
 * 2. Seeds ONLY 1 test user per entity (#Test@2026, is_first_logged_in=false):
 *    - 3 Sector users (1 per government_structure: MoM, GIE, MIDI)
 *    - 14 Regional users (1 per official Ethiopian region)
 *    - 187 Company users (1 per company)
 *    - 12 Purchasing Center users (1 per purchasing center)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { OFFICIAL_REGIONS } = require("./seed-regional-test-users");

const {
  sequelize,
  User,
  Role,
  UserRoles,
  GovernmentStructure,
  Region,
  Company,
  PurchasingCenter,
} = db;

const TARGET_PASSWORD = "#Test@2026";
const HARD_ADMIN_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const SECTOR_ROLE_ID = "7f8c952d-405c-48f2-96e9-11bc0f1322e2"; // Plan Management Role
const FALLBACK_USER_ROLE_ID = "10000000-0000-4000-8000-000000000010";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const PC_ADMIN_ROLE_ID = "40000000-0000-4000-8000-000000000001";

function sanitizeSlug(name, fallback = "entity") {
  let clean = String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (clean.length > 38) clean = clean.slice(0, 38).replace(/_+$/, "");
  if (clean.length < 2) {
    clean = String(fallback || "entity")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }
  return clean || "entity";
}

async function safeExec(sql, replacements = {}, transaction = null) {
  try {
    await sequelize.query(sql, { replacements, transaction });
  } catch (err) {
    if (err.message && err.message.includes("does not exist")) return;
    throw err;
  }
}

async function cleanAllNonSuperAdminUsers(transaction) {
  const [adminRows] = await sequelize.query(
    `SELECT DISTINCT u.user_id, u.email
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.user_id
     WHERE u.user_id = :hardAdminId
        OR LOWER(u.email) = 'plansystemadmin@gmail.com'
        OR ur.role_id = :superAdminRoleId`,
    {
      replacements: { hardAdminId: HARD_ADMIN_ID, superAdminRoleId: SUPER_ADMIN_ROLE_ID },
      transaction,
    }
  );

  const adminIds = adminRows.map((r) => r.user_id);
  if (!adminIds.includes(HARD_ADMIN_ID)) adminIds.push(HARD_ADMIN_ID);
  const firstAdminId = adminIds[0];

  console.log(`Preserving ${adminIds.length} Super Admin account(s): ${adminRows.map((r) => r.email).join(", ")}`);

  // Clean sessions, security logs, notifications, and non-admin references
  await safeExec(`DELETE FROM user_sessions WHERE user_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE user_sessions SET terminated_by = NULL WHERE terminated_by NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM session_security_logs WHERE user_id NOT IN (:adminIds) OR actor_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM user_device_restrictions WHERE user_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE user_device_restrictions SET restricted_by = :firstAdminId WHERE restricted_by NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE user_device_restrictions SET unrestricted_by = NULL WHERE unrestricted_by NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM user_permission_groups WHERE user_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM user_roles WHERE user_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM notifications WHERE recipient_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM system_audit_logs WHERE changed_by NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`DELETE FROM branding_audit_logs WHERE changed_by NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE national_reporting_requirements SET created_by = :firstAdminId WHERE created_by IS NOT NULL AND created_by NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE national_reporting_requirements SET updated_by = :firstAdminId WHERE updated_by IS NOT NULL AND updated_by NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE national_reporting_assignments SET assigned_by = :firstAdminId WHERE assigned_by IS NOT NULL AND assigned_by NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE national_reporting_period_configs SET updated_by = :firstAdminId WHERE updated_by IS NOT NULL AND updated_by NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE gold_purchases SET created_by_id = :firstAdminId WHERE created_by_id NOT IN (:adminIds)`, { adminIds, firstAdminId }, transaction);
  await safeExec(`UPDATE gold_purchases SET updated_by_id = NULL WHERE updated_by_id IS NOT NULL AND updated_by_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE gold_purchases SET cancelled_by_id = NULL WHERE cancelled_by_id IS NOT NULL AND cancelled_by_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE asm_miners SET registered_by_id = NULL WHERE registered_by_id IS NOT NULL AND registered_by_id NOT IN (:adminIds)`, { adminIds }, transaction);
  await safeExec(`UPDATE short_term_kpi_assignments SET assigned_user_id = NULL WHERE assigned_user_id IS NOT NULL AND assigned_user_id NOT IN (:adminIds)`, { adminIds }, transaction);

  const [, meta] = await sequelize.query(
    `DELETE FROM users WHERE user_id NOT IN (:adminIds)`,
    { replacements: { adminIds }, transaction }
  );
  console.log(`Cleaned ${meta?.rowCount ?? "all"} non-admin users.`);
}

async function createScopedUser({ fullName, email, passwordHash, roleId, scopeField, scopeId, usedEmails, transaction }) {
  let finalEmail = email.toLowerCase();
  let counter = 1;
  while (usedEmails.has(finalEmail)) {
    const [local, domain] = email.toLowerCase().split("@");
    finalEmail = `${local}_${counter}@${domain}`;
    counter++;
  }
  usedEmails.add(finalEmail);

  const user = await User.create(
    {
      user_id: uuidv4(),
      full_name: fullName,
      email: finalEmail,
      password: passwordHash,
      is_active: true,
      is_first_logged_in: false,
      password_changed_at: new Date(),
      [scopeField]: scopeId,
    },
    { transaction }
  );

  await UserRoles.create(
    {
      user_role_id: uuidv4(),
      user_id: user.user_id,
      role_id: roleId,
      is_active: true,
      assigned_at: new Date(),
    },
    { transaction }
  );

  return user;
}

async function run() {
  console.log("==============================================================================");
  console.log("CLEAN & SEED 1 USER PER ENTITY (SECTORS, REGIONS, COMPANIES, PURCHASING CENTERS)");
  console.log(`Password: ${TARGET_PASSWORD} | is_first_logged_in: false`);
  console.log("==============================================================================");

  const t = await sequelize.transaction();
  try {
    await cleanAllNonSuperAdminUsers(t);

    const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);
    const usedEmails = new Set(["plansystemadmin@gmail.com"]);

    // Verify role IDs exist
    const roles = await Role.findAll({ transaction: t });
    const roleIds = new Set(roles.map((r) => r.role_id));
    const effectiveSectorRole = roleIds.has(SECTOR_ROLE_ID) ? SECTOR_ROLE_ID : FALLBACK_USER_ROLE_ID;

    // ── 1. Sectors (3 government_structures: MoM, GIE, MIDI) ─────────────────
    const sectors = await GovernmentStructure.findAll({
      where: { is_active: true },
      order: [["level", "ASC"], ["name", "ASC"]],
      transaction: t,
    });
    const sectorUsers = [];
    for (const s of sectors) {
      let shortKey = sanitizeSlug(s.name, "sector");
      if (s.name.toLowerCase().includes("ministry of mines")) shortKey = "mom";
      else if (s.name.toLowerCase().includes("gie") || s.name.toLowerCase().includes("geological")) shortKey = "gie";
      else if (s.name.toLowerCase().includes("midi") || s.name.toLowerCase().includes("mining industry")) shortKey = "midi";

      const u = await createScopedUser({
        fullName: `${s.name} Sector User`,
        email: `${shortKey}_sector_user@gmail.com`,
        passwordHash,
        roleId: effectiveSectorRole,
        scopeField: "government_structure_id",
        scopeId: s.government_structure_id,
        usedEmails,
        transaction: t,
      });
      sectorUsers.push({ sector: s.name, email: u.email });
    }

    // ── 2. Regions (14 official Ethiopian regions, 1 user each) ──────────────
    const allDbRegions = await Region.findAll({ transaction: t });
    const regionUsers = [];
    for (const rDef of OFFICIAL_REGIONS) {
      const matched = allDbRegions.find(
        (r) =>
          r.code === rDef.code ||
          rDef.altCodes.includes(r.code) ||
          r.name.toUpperCase().trim() === rDef.name.toUpperCase().trim() ||
          rDef.altNames.includes(r.name.toUpperCase().trim())
      );
      if (!matched) continue;

      const u = await createScopedUser({
        fullName: `${rDef.name} Regional Administrator`,
        email: `${rDef.prefix}_user@gmail.com`,
        passwordHash,
        roleId: REGIONAL_ADMIN_ROLE_ID,
        scopeField: "region_id",
        scopeId: matched.region_id,
        usedEmails,
        transaction: t,
      });
      regionUsers.push({ region: `${matched.code} (${matched.name})`, email: u.email });
    }

    // ── 3. Companies (1 user per company) ────────────────────────────────────
    const companies = await Company.findAll({
      order: [["name", "ASC"]],
      transaction: t,
    });
    const companyUsers = [];
    for (const c of companies) {
      const clean = sanitizeSlug(c.name, c.code);
      const u = await createScopedUser({
        fullName: `${c.name} Admin`,
        email: `${clean}_test_user@gmail.com`,
        passwordHash,
        roleId: COMPANY_ADMIN_ROLE_ID,
        scopeField: "company_id",
        scopeId: c.company_id,
        usedEmails,
        transaction: t,
      });
      companyUsers.push({ company: c.name, email: u.email });
    }

    // ── 4. Purchasing Centers (1 user per purchasing center) ─────────────────
    const centers = await PurchasingCenter.findAll({
      order: [["name", "ASC"]],
      transaction: t,
    });
    const centerUsers = [];
    for (const pc of centers) {
      const clean = sanitizeSlug(pc.code || pc.name, "center");
      const u = await createScopedUser({
        fullName: `${pc.name} Center Admin`,
        email: `${clean}_center_user@gmail.com`,
        passwordHash,
        roleId: PC_ADMIN_ROLE_ID,
        scopeField: "purchasing_center_id",
        scopeId: pc.purchasing_center_id,
        usedEmails,
        transaction: t,
      });
      centerUsers.push({ center: `${pc.code} (${pc.name})`, email: u.email });
    }

    await t.commit();

    console.log("\n=== SEEDED SECTOR USERS (" + sectorUsers.length + ") ===");
    console.table(sectorUsers);
    console.log("\n=== SEEDED REGIONAL USERS (" + regionUsers.length + ") ===");
    console.table(regionUsers);
    console.log("\n=== SEEDED PURCHASING CENTER USERS (" + centerUsers.length + ") ===");
    console.table(centerUsers);
    console.log(`\n=== SEEDED COMPANY USERS: ${companyUsers.length} (e.g. ${companyUsers.slice(0, 3).map((x) => x.email).join(", ")} ...) ===`);
    console.log(`\nTOTAL NEW SCOPED USERS: ${sectorUsers.length + regionUsers.length + companyUsers.length + centerUsers.length}`);
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error("[FATAL] clean-and-seed-entity-users failed:", err);
    process.exit(1);
  }
}

run();
