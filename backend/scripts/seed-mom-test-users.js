"use strict";

/**
 * Seed Ministry of Mines test users (idempotent).
 *
 * - Sector mapping: "Mining" -> Ministry of Mines, "Geology" -> GIE, "MIDI" -> MIDI
 *   (GIE and MIDI are the sub-sectors under Ministry of Mines).
 * - Departments are created under their sector when missing, otherwise reused.
 * - Every user gets the default global "User" role, password "password",
 *   is_first_logged_in = false and password_changed_at = now (no forced change on login).
 * - Existing users (by email) are left untouched apart from being reported.
 *
 * Usage (from backend/):  node scripts/seed-mom-test-users.js
 */

const path = require("path");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");

const db = require(path.join(__dirname, "..", "models"));
const { USER_ROLE_ID } = require(path.join(__dirname, "..", "constants", "systemRoles"));

const DEFAULT_PASSWORD = "password";
const ROOT_SECTOR_NAME = "Ministry of Mines";
const SECTOR_ALIASES = {
  Mining: null, // root sector itself
  Geology: "GIE",
  MIDI: "MIDI",
};

const USERS = [
  ["Meseret Ararso", "meseret.ararso@mom.et", "Mineral Marketing and Artisanal Operations", "Mining"],
  ["Feleke Ertsasa", "feleke.ertsasa@mom.et", "Mineral Marketing and Artisanal Operations", "Mining"],
  ["Dr. Sofia Abdulkadir", "sofia.abdulkadir@mom.et", "Mining and Processing Licensing and Administration", "Mining"],
  ["Mrs. Eskedar Taye", "eskedar.taye@mom.et", "Mining and Processing Licensing and Administration", "Mining"],
  ["Mr. Kedir Shikur", "kedir.shikur@mom.et", "Mining and Processing Licensing and Administration", "Mining"],
  ["Mr. Addis Hailu", "addis.hailu@mom.et", "Mining and Processing Licensing and Administration", "Mining"],
  ["Hika Wachila", "hika.wachila@mom.et", "Mining Development Mega Projects Follow-up and Support", "Mining"],
  ["Tefera Alemu", "tefera.alemu@mom.et", "Petroleum and Geothermal Mega Projects", "Mining"],
  ["Zenebe Tadesse", "zenebe.tadesse@mom.et", "Petroleum and Geothermal Mega Projects", "Mining"],
  ["Hana Zebena", "hana.zebena@mom.et", "Environment and Community Development", "Mining"],
  ["Fantayehu Ababil", "fantayehu.ababil@mom.et", "Environment and Community Development", "Mining"],
  ["Engidasew Temere", "engidasew.temere@mom.et", "Mining Operations Information and Promotion", "Mining"],
  ["Helen Legesse", "helen.legesse@mom.et", "Strategic Affairs", "Mining"],
  ["Konjit Teshome", "konjit.teshome@mom.et", "Strategic Affairs", "Mining"],
  ["Ewnet Tamiru", "ewnet.tamiru@mom.et", "Strategic Affairs", "Geology"],
  ["Frehiwot Tessema", "frehiwot.tessema@mom.et", "Strategic Affairs", "MIDI"],
  ["Getu Alemayehu", "getu.alemayehu@mom.et", "Strategic Affairs", "MIDI"],
  ["Hana Tadesse", "hana.tadesse@mom.et", "Strategic Affairs", "MIDI"],
];

async function resolveSectors(transaction) {
  const { GovernmentStructure } = db;
  const root = await GovernmentStructure.findOne({
    where: { name: ROOT_SECTOR_NAME, parent_id: null },
    transaction,
  });
  if (!root) throw new Error(`Sector "${ROOT_SECTOR_NAME}" not found`);

  const sectors = {};
  for (const [alias, childName] of Object.entries(SECTOR_ALIASES)) {
    if (!childName) {
      sectors[alias] = root;
      continue;
    }
    const child = await GovernmentStructure.findOne({
      where: { name: childName, parent_id: root.government_structure_id },
      transaction,
    });
    if (!child) throw new Error(`Sub-sector "${childName}" under "${ROOT_SECTOR_NAME}" not found`);
    sectors[alias] = child;
  }
  return sectors;
}

async function findOrCreateDepartment(sector, name, transaction, report) {
  const { InternalStructure } = db;
  const existing = await InternalStructure.findOne({
    where: { government_structure_id: sector.government_structure_id, name },
    transaction,
  });
  if (existing) return existing;

  const created = await InternalStructure.create(
    {
      internal_structure_id: uuidv4(),
      government_structure_id: sector.government_structure_id,
      parent_id: null,
      name,
      level: 1,
      is_active: true,
    },
    { transaction }
  );
  report.departmentsCreated.push(`${sector.name} / ${name}`);
  return created;
}

async function main() {
  const { User, UserRoles, Role, sequelize } = db;
  const report = { departmentsCreated: [], usersCreated: [], usersSkipped: [] };

  const userRole = await Role.findByPk(USER_ROLE_ID);
  if (!userRole) throw new Error(`Default "User" role (${USER_ROLE_ID}) not found`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const t = await sequelize.transaction();
  try {
    const sectors = await resolveSectors(t);
    const now = new Date();

    for (const [fullName, rawEmail, departmentName, sectorAlias] of USERS) {
      const email = rawEmail.trim().toLowerCase();
      const sector = sectors[sectorAlias];
      const department = await findOrCreateDepartment(sector, departmentName, t, report);

      const existing = await User.unscoped().findOne({ where: { email }, transaction: t });
      if (existing) {
        report.usersSkipped.push(email);
        continue;
      }

      const user = await User.create(
        {
          user_id: uuidv4(),
          full_name: fullName,
          email,
          password: passwordHash,
          is_first_logged_in: false,
          password_changed_at: now,
          is_active: true,
          government_structure_id: sector.government_structure_id,
          internal_structure_id: department.internal_structure_id,
        },
        { transaction: t }
      );

      await UserRoles.create(
        {
          user_role_id: uuidv4(),
          user_id: user.user_id,
          role_id: userRole.role_id,
        },
        { transaction: t }
      );

      report.usersCreated.push(`${email} -> ${sector.name} / ${department.name}`);
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  console.log(`SEED departments created (${report.departmentsCreated.length}):`);
  report.departmentsCreated.forEach((d) => console.log(`SEED   + ${d}`));
  console.log(`SEED users created (${report.usersCreated.length}):`);
  report.usersCreated.forEach((u) => console.log(`SEED   + ${u}`));
  console.log(`SEED users already present, skipped (${report.usersSkipped.length}):`);
  report.usersSkipped.forEach((u) => console.log(`SEED   = ${u}`));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("SEED FAILED:", error.message);
    process.exit(1);
  });
