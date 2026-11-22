"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const { Company, User, Role, UserRoles, Permission, RolePermission, sequelize } = db;

const TARGET_PASSWORD = "#Test@2026";
const COMPANY_ADMIN_ROLE_ID = "30000000-0000-4000-8000-000000000001";
const COMPANY_OFFICER_ROLE_ID = "30000000-0000-4000-8000-000000000002";

// Permissions that Company Administrator & Company Officer must possess
const REQUIRED_COMPANY_PERMISSIONS = [
  // Targets
  { resource: "company_production_targets", action: "create" },
  { resource: "company_production_targets", action: "read" },
  { resource: "company_production_targets", action: "update" },
  { resource: "company_production_targets", action: "manage" },
  // Responsibilities
  { resource: "company_production_responsibilities", action: "create" },
  { resource: "company_production_responsibilities", action: "read" },
  { resource: "company_production_responsibilities", action: "update" },
  { resource: "company_production_responsibilities", action: "manage" },
  { resource: "company_production_responsibilities", action: "delete" },
  // Production Assignments
  { resource: "company_production", action: "read" },
  { resource: "company_production", action: "manage" },
  // Production Reports
  { resource: "company_production_reports", action: "create" },
  { resource: "company_production_reports", action: "read" },
  { resource: "company_production_reports", action: "update" },
  { resource: "company_production_reports", action: "export" },
  // Dashboard & Structures
  { resource: "company_dashboard", action: "view" },
  { resource: "company_structures", action: "read" },
  { resource: "company_structures", action: "manage" },
  { resource: "company_licenses", action: "read" },
  { resource: "company_users", action: "read" },
  { resource: "company_users", action: "manage" },
];

function sanitizeForEmail(name, code) {
  let clean = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  
  // RFC 5321 restricts email local-part (before @) to max 64 characters.
  // Truncate clean name to 40 characters so clean + "_test_user" is <= 50 characters.
  if (clean.length > 40) {
    clean = clean.slice(0, 40).replace(/_+$/, "");
  }

  if (!clean || clean.length < 2) {
    clean = (code || "company")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    if (clean.length > 40) {
      clean = clean.slice(0, 40).replace(/_+$/, "");
    }
  }
  return clean;
}

async function seedCompanyTestUsers() {
  console.log("==============================================================================");
  console.log("STARTING SEEDING OF COMPANY TEST USERS & PERMISSION FIXES (#Test@2026)");
  console.log("==============================================================================");

  const t = await sequelize.transaction();

  try {
    const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);

    // 1. Ensure all required permissions exist and are linked to Company Administrator & Officer
    console.log("[PERMISSIONS] Ensuring company production & target permissions are configured...");
    const roleIdsToUpdate = [COMPANY_ADMIN_ROLE_ID, COMPANY_OFFICER_ROLE_ID];

    // Find actual role records
    const targetRoles = await Role.findAll({
      where: {
        role_id: roleIdsToUpdate,
      },
      transaction: t,
    });

    for (const reqPerm of REQUIRED_COMPANY_PERMISSIONS) {
      let [permRecord] = await Permission.findOrCreate({
        where: {
          resource: reqPerm.resource,
          action: reqPerm.action,
        },
        defaults: {
          permission_id: uuidv4(),
          resource: reqPerm.resource,
          action: reqPerm.action,
          permission_tier: "company",
          is_active: true,
        },
        transaction: t,
      });

      for (const r of targetRoles) {
        await RolePermission.findOrCreate({
          where: {
            role_id: r.role_id,
            permission_id: permRecord.permission_id,
          },
          defaults: {
            role_permission_id: uuidv4(),
            role_id: r.role_id,
            permission_id: permRecord.permission_id,
            is_active: true,
          },
          transaction: t,
        });
      }
    }
    console.log("[PERMISSIONS] Company roles successfully updated with full target & reporting permissions.");

    // 2. Fetch all companies
    const companies = await Company.findAll({
      order: [["name", "ASC"]],
      transaction: t,
    });

    console.log(`[COMPANIES] Found ${companies.length} companies to configure test users for.`);

    const createdUsers = [];
    const usedEmails = new Set();

    for (const company of companies) {
      let clean = sanitizeForEmail(company.name, company.code);
      let email = `${clean}_test_user@gmail.com`;

      // Handle rare email collision
      let counter = 1;
      while (usedEmails.has(email)) {
        email = `${clean}_${counter}_test_user@gmail.com`;
        counter++;
      }
      usedEmails.add(email);

      const fullName = `${company.name} Test Admin`;

      let user = await User.findOne({
        where: sequelize.where(
          sequelize.fn("LOWER", sequelize.col("email")),
          email.toLowerCase()
        ),
        transaction: t,
      });

      if (!user) {
        user = await User.create(
          {
            user_id: uuidv4(),
            full_name: fullName,
            email: email.toLowerCase(),
            password: passwordHash,
            is_active: true,
            is_first_logged_in: false, // Mark password as already updated: do NOT prompt for change
            password_changed_at: new Date(),
            company_id: company.company_id,
          },
          { transaction: t }
        );
        console.log(`[USER] Created test user: ${email} -> ${company.name}`);
      } else {
        await user.update(
          {
            password: passwordHash,
            is_active: true,
            is_first_logged_in: false,
            password_changed_at: new Date(),
            company_id: company.company_id,
          },
          { transaction: t }
        );
        console.log(`[USER] Updated test user: ${email} -> ${company.name}`);
      }

      // Assign Company Administrator role
      const [userRole, urCreated] = await UserRoles.findOrCreate({
        where: {
          user_id: user.user_id,
          role_id: COMPANY_ADMIN_ROLE_ID,
        },
        defaults: {
          user_role_id: uuidv4(),
          user_id: user.user_id,
          role_id: COMPANY_ADMIN_ROLE_ID,
          is_active: true,
          assigned_at: new Date(),
        },
        transaction: t,
      });

      if (!urCreated && !userRole.is_active) {
        await userRole.update({ is_active: true }, { transaction: t });
      }

      createdUsers.push({
        email: user.email,
        company: company.name,
        code: company.code,
        role: "Company Administrator",
        password: TARGET_PASSWORD,
      });
    }

    // 3. Also create generic company_test_user@gmail.com
    const genericEmail = "company_test_user@gmail.com";
    const defaultCompany =
      companies.find((c) => (c.name || "").toLowerCase().includes("dmg") || (c.code || "").toLowerCase().includes("dmg")) ||
      companies[0];

    let genericUser = await User.findOne({
      where: sequelize.where(
        sequelize.fn("LOWER", sequelize.col("email")),
        genericEmail.toLowerCase()
      ),
      transaction: t,
    });

    if (!genericUser) {
      genericUser = await User.create(
        {
          user_id: uuidv4(),
          full_name: "Generic Company Test User",
          email: genericEmail.toLowerCase(),
          password: passwordHash,
          is_active: true,
          is_first_logged_in: false,
          password_changed_at: new Date(),
          company_id: defaultCompany ? defaultCompany.company_id : null,
        },
        { transaction: t }
      );
    } else {
      await genericUser.update(
        {
          password: passwordHash,
          is_active: true,
          is_first_logged_in: false,
          password_changed_at: new Date(),
          company_id: defaultCompany ? defaultCompany.company_id : genericUser.company_id,
        },
        { transaction: t }
      );
    }

    await UserRoles.findOrCreate({
      where: {
        user_id: genericUser.user_id,
        role_id: COMPANY_ADMIN_ROLE_ID,
      },
      defaults: {
        user_role_id: uuidv4(),
        user_id: genericUser.user_id,
        role_id: COMPANY_ADMIN_ROLE_ID,
        is_active: true,
        assigned_at: new Date(),
      },
      transaction: t,
    });

    createdUsers.unshift({
      email: genericUser.email,
      company: defaultCompany ? defaultCompany.name : "Default Company",
      code: defaultCompany ? defaultCompany.code : "COMP",
      role: "Company Administrator",
      password: TARGET_PASSWORD,
    });

    await t.commit();

    console.log("\n==============================================================================");
    console.log("COMPANY TEST USERS SEEDING COMPLETE");
    console.log("==============================================================================");
    console.log(`Successfully configured ${createdUsers.length} company test accounts with password '${TARGET_PASSWORD}'.`);
    return createdUsers;
  } catch (error) {
    await t.rollback();
    console.error("[FATAL ERROR] Company test user seeding failed:", error);
    throw error;
  }
}

if (require.main === module) {
  seedCompanyTestUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedCompanyTestUsers, TARGET_PASSWORD, sanitizeForEmail };
