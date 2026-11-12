"use strict";

const bcrypt = require("bcrypt");
const db = require("../models");

const {
  sequelize,
  NationalPublishedRecord,
  RegionalRequirementMapping,
  NationalReportingAssignment,
  NationalReportingRequirement,
  NationalReportingCustomCategory,
  NationalReportingCustomUnit,
  User,
} = db;

async function resetNationalReportingData() {
  console.log("==================================================================");
  console.log("CLEANING ALL NATIONAL REPORTING KPIS, ASSIGNMENTS & REGIONAL REPORTS");
  console.log("==================================================================");

  const transaction = await sequelize.transaction();

  try {
    // 1. Delete all National Published Records (reports submitted by regions)
    const pubCount = await NationalPublishedRecord.destroy({
      where: {},
      force: true,
      transaction,
    });
    console.log(`[1/6] Deleted ${pubCount} records from national_published_records`);

    // 2. Delete all Regional Requirement Mappings (node mappings created by regions)
    const mapCount = await RegionalRequirementMapping.destroy({
      where: {},
      force: true,
      transaction,
    });
    console.log(`[2/6] Deleted ${mapCount} records from regional_requirement_mappings`);

    // 3. Delete all National Reporting Assignments (assigned to regions)
    const assignCount = await NationalReportingAssignment.destroy({
      where: {},
      force: true,
      transaction,
    });
    console.log(`[3/6] Deleted ${assignCount} records from national_reporting_assignments`);

    // 4. Delete all National Reporting Requirements (KPI definitions)
    const reqCount = await NationalReportingRequirement.destroy({
      where: {},
      force: true,
      transaction,
    });
    console.log(`[4/6] Deleted ${reqCount} records from national_reporting_requirements`);

    // 5. Delete all Custom Reporting Categories & Custom Units
    let customCatCount = 0;
    if (NationalReportingCustomCategory) {
      customCatCount = await NationalReportingCustomCategory.destroy({
        where: {},
        force: true,
        transaction,
      });
    }
    console.log(`[5/6] Deleted ${customCatCount} records from national_reporting_custom_categories`);

    let customUnitCount = 0;
    if (NationalReportingCustomUnit) {
      customUnitCount = await NationalReportingCustomUnit.destroy({
        where: {},
        force: true,
        transaction,
      });
    }
    console.log(`[6/6] Deleted ${customUnitCount} records from national_reporting_custom_units`);

    // 7. Update admin@gmail.com password
    const adminEmail = "admin@gmail.com";
    const newPassword = "#Admin@2026MoM";
    const adminUser = await User.scope("withCredentials").findOne({
      where: { email: adminEmail },
      transaction,
    });

    if (adminUser) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await adminUser.update(
        {
          password: hashedPassword,
          password_changed_at: new Date(),
          is_first_logged_in: false,
          is_active: true,
        },
        { transaction }
      );
      console.log(`\n>>> Successfully updated password for ${adminEmail} to: ${newPassword}`);
    } else {
      console.warn(`\n[WARNING] User ${adminEmail} was not found in the database.`);
    }

    await transaction.commit();
    console.log("\n==================================================================");
    console.log("CLEANUP COMPLETED SUCCESSFULLY. CLEAN SLATE READY FOR REAL DATA.");
    console.log("==================================================================");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n[ERROR] Failed to reset national reporting data:", error);
    process.exit(1);
  }
}

resetNationalReportingData();
