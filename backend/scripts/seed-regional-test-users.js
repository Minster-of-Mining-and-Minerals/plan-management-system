"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const { Region, User, Role, UserRoles, sequelize } = db;

// 14 Official Ethiopian Regions Definition
const OFFICIAL_REGIONS = [
  {
    code: "ET-AM",
    name: "Amhara",
    prefix: "amh",
    description: "Amhara National Regional State",
    altCodes: ["AM", "AMH"],
    altNames: ["AMARA", "AMHARA"],
  },
  {
    code: "ET-OR",
    name: "Oromia",
    prefix: "oro",
    description: "Oromia Regional State",
    altCodes: ["OR"],
    altNames: ["OROMIA", "OROMIYA"],
  },
  {
    code: "ET-TI",
    name: "Tigray",
    prefix: "tig",
    description: "Tigray Regional State",
    altCodes: ["TG", "TIG"],
    altNames: ["TIGRAY"],
  },
  {
    code: "ET-AF",
    name: "Afar",
    prefix: "afa",
    description: "Afar Regional State",
    altCodes: ["AF"],
    altNames: ["AFAR"],
  },
  {
    code: "ET-SO",
    name: "Somali",
    prefix: "som",
    description: "Somali Regional State",
    altCodes: ["SO", "SOM"],
    altNames: ["SOMALI"],
  },
  {
    code: "ET-BE",
    name: "Benishangul-Gumuz",
    prefix: "ben",
    description: "Benishangul-Gumuz Regional State",
    altCodes: ["BE", "BG"],
    altNames: ["BENISHANGUL-GUMUZ", "BENISHANGUL GUMUZ", "BENSHANGUL-GUMUZ"],
  },
  {
    code: "ET-CE",
    name: "Central Ethiopia",
    prefix: "cen",
    description: "Central Ethiopia Regional State",
    altCodes: ["CE"],
    altNames: ["CENTRAL ETHIOPIA"],
  },
  {
    code: "ET-SE",
    name: "South Ethiopia",
    prefix: "sou",
    description: "South Ethiopia Regional State",
    altCodes: ["SE"],
    altNames: ["SOUTH ETHIOPIA"],
  },
  {
    code: "ET-SW",
    name: "South West Ethiopia Peoples",
    prefix: "swe",
    description: "South West Ethiopia Peoples Regional State",
    altCodes: ["SW", "SWR"],
    altNames: ["SOUTH WEST ETHIOPIA PEOPLES", "SOUTH WEST", "SOUTH  WEST ETHIOPIA PEOPLES"],
  },
  {
    code: "ET-GA",
    name: "Gambela",
    prefix: "gam",
    description: "Gambela Regional State",
    altCodes: ["GA", "GAM"],
    altNames: ["GAMBELA", "GAMBELLA"],
  },
  {
    code: "ET-HA",
    name: "Harari",
    prefix: "har",
    description: "Harari People Regional State",
    altCodes: ["HA", "HAR"],
    altNames: ["HARARI"],
  },
  {
    code: "ET-SI",
    name: "Sidama",
    prefix: "sid",
    description: "Sidama Regional State",
    altCodes: ["SI", "SID"],
    altNames: ["SIDAMA"],
  },
  {
    code: "ET-AA",
    name: "Addis Ababa",
    prefix: "add",
    description: "Addis Ababa City Administration",
    altCodes: ["AA"],
    altNames: [
      "ADDIS ABABA",
      "ADDIS ABABA (CITY ADMINISTRATION)",
      "ADDIS ABABA (CITY ADMINSTRATION)",
    ],
  },
  {
    code: "ET-DD",
    name: "Dire Dawa",
    prefix: "dir",
    description: "Dire Dawa City Administration",
    altCodes: ["DD"],
    altNames: [
      "DIRE DAWA",
      "DIRE DAWA (CITY ADMINISTRATION)",
      "DIRE DAWA (CITY ADMINSTRATION)",
    ],
  },
];

const TARGET_PASSWORD = "#Test@2026";
const REGIONAL_ADMIN_ROLE_ID = "20000000-0000-4000-8000-000000000001";

async function seedRegionalTestUsers() {
  console.log("==============================================================================");
  console.log("STARTING SEEDING OF 14 REGIONAL TEST USERS (#Test@2026)");
  console.log("==============================================================================");

  const t = await sequelize.transaction();

  try {
    const passwordHash = await bcrypt.hash(TARGET_PASSWORD, 10);

    // Verify Regional Administrator Role exists
    let regionalRole = await Role.findByPk(REGIONAL_ADMIN_ROLE_ID, { transaction: t });
    if (!regionalRole) {
      regionalRole = await Role.findOne({
        where: { name: "Regional Administrator" },
        transaction: t,
      });
    }
    const roleId = regionalRole ? regionalRole.role_id : REGIONAL_ADMIN_ROLE_ID;

    // Fetch existing regions
    const allDbRegions = await Region.findAll({ transaction: t });

    const createdUsers = [];

    for (const rDef of OFFICIAL_REGIONS) {
      // Find matching region
      let matchedRegion = allDbRegions.find(
        (r) =>
          r.code === rDef.code ||
          rDef.altCodes.includes(r.code) ||
          r.name.toUpperCase().trim() === rDef.name.toUpperCase().trim() ||
          rDef.altNames.includes(r.name.toUpperCase().trim())
      );

      if (!matchedRegion) {
        matchedRegion = await Region.create(
          {
            region_id: uuidv4(),
            code: rDef.code,
            name: rDef.name,
            description: rDef.description,
            is_active: true,
            national_reporting_method: "form_based",
            form_reporting_active: true,
          },
          { transaction: t }
        );
        console.log(`[REGION] Created official region: ${matchedRegion.name} (${matchedRegion.code})`);
      } else {
        // Ensure active and proper code if needed
        if (!matchedRegion.is_active || matchedRegion.code !== rDef.code) {
          await matchedRegion.update(
            { is_active: true, code: rDef.code },
            { transaction: t }
          );
        }
      }

      // Generate the two email formats requested:
      // 1. <prefix>_user@gmail.com (e.g. amh_user@gmail.com)
      // 2. <prefix>_test_user@gmail.com (e.g. amh_test_user@gmail.com)
      const userEmails = [
        `${rDef.prefix}_user@gmail.com`,
        `${rDef.prefix}_test_user@gmail.com`,
      ];

      for (const email of userEmails) {
        const fullName = `${rDef.name} Regional Administrator`;

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
              region_id: matchedRegion.region_id,
            },
            { transaction: t }
          );
          console.log(`[USER] Created test user: ${email} -> ${matchedRegion.name}`);
        } else {
          await user.update(
            {
              password: passwordHash,
              is_active: true,
              is_first_logged_in: false, // Mark password as already updated: do NOT prompt for change
              password_changed_at: new Date(),
              region_id: matchedRegion.region_id,
            },
            { transaction: t }
          );
          console.log(`[USER] Updated test user: ${email} -> ${matchedRegion.name}`);
        }

        // Ensure user has Regional Administrator role
        const [userRole, urCreated] = await UserRoles.findOrCreate({
          where: {
            user_id: user.user_id,
            role_id: roleId,
          },
          defaults: {
            user_role_id: uuidv4(),
            user_id: user.user_id,
            role_id: roleId,
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
          region: matchedRegion.name,
          code: matchedRegion.code,
          role: "Regional Administrator",
          password: TARGET_PASSWORD,
          passwordUpdatedMarked: "YES (is_first_logged_in=false)",
        });
      }
    }

    // Also create overarching generic reg_test_user@gmail.com
    const genericEmail = "reg_test_user@gmail.com";
    const defaultRegion = allDbRegions[0] || (await Region.findOne({ transaction: t }));
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
          full_name: "Generic Regional Test User",
          email: genericEmail.toLowerCase(),
          password: passwordHash,
          is_active: true,
          is_first_logged_in: false,
          password_changed_at: new Date(),
          region_id: defaultRegion ? defaultRegion.region_id : null,
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
          region_id: defaultRegion ? defaultRegion.region_id : genericUser.region_id,
        },
        { transaction: t }
      );
    }

    await UserRoles.findOrCreate({
      where: {
        user_id: genericUser.user_id,
        role_id: roleId,
      },
      defaults: {
        user_role_id: uuidv4(),
        user_id: genericUser.user_id,
        role_id: roleId,
        is_active: true,
        assigned_at: new Date(),
      },
      transaction: t,
    });

    createdUsers.push({
      email: genericUser.email,
      region: defaultRegion ? defaultRegion.name : "Default",
      code: defaultRegion ? defaultRegion.code : "ET",
      role: "Regional Administrator",
      password: TARGET_PASSWORD,
      passwordUpdatedMarked: "YES (is_first_logged_in=false)",
    });

    await t.commit();

    console.log("\n==============================================================================");
    console.log("REGIONAL TEST USERS SEEDING COMPLETE");
    console.log("==============================================================================");
    console.table(createdUsers);
    console.log(`Successfully configured ${createdUsers.length} regional test accounts with password '${TARGET_PASSWORD}'.`);
    console.log("No password update will be requested upon login.");
    return createdUsers;
  } catch (error) {
    await t.rollback();
    console.error("[FATAL ERROR] Regional test user seeding failed:", error);
    throw error;
  }
}

if (require.main === module) {
  seedRegionalTestUsers()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { seedRegionalTestUsers, OFFICIAL_REGIONS, TARGET_PASSWORD };
