"use strict";

const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const {
  sequelize,
  NationalReportingRequirement,
  NationalReportingCustomUnit,
  NationalReportingCustomCategory,
} = db;

// 1. Definition of all units present in Ethiopian National Reporting KPI Catalog
const UNIT_DEFINITIONS = [
  { unit_code: "unit_am_kg", label: "በኪ.ግራም", category: "mass", base_unit: "kg", multiplier: 1.0, is_base: true },
  { unit_code: "unit_am_kg_alt", label: "በኪ/ግ", category: "mass", base_unit: "kg", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_ton", label: "በቶን", category: "mass", base_unit: "kg", multiplier: 1000.0, is_base: false },
  { unit_code: "unit_am_m3_short", label: "በሜ.ኩ", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_m3_full", label: "በሜ.ኪዩብ", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: true },
  { unit_code: "unit_am_m3_slash", label: "ሜ/ኪዩብ", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_m3_sp", label: "በሜ/ ኪዩብ", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_license_count", label: "በፈቃድ ቁጥር", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_count_prefix", label: "በቁጥር", category: "count", base_unit: "count", multiplier: 1.0, is_base: true },
  { unit_code: "unit_am_count_plain", label: "ቁጥር", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_count_alt", label: "በቀጥር", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_document", label: "በሰነድ", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_report_doc", label: "የሪፖርት ሰነድ", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_round", label: "በዙር", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_male", label: "ወንድ", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_dash", label: "-", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_etb_plain", label: "ብር", category: "currency", base_unit: "etb", multiplier: 1.0, is_base: true },
  { unit_code: "unit_am_etb_prefix", label: "በብር", category: "currency", base_unit: "etb", multiplier: 1.0, is_base: false },
  { unit_code: "unit_am_etb_million_dot", label: "በሚ.ብር", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_etb_million_slash", label: "በሚ/ብር", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_etb_million_nosp", label: "በሚብር", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_etb_million_word", label: "በሚሊዮን ብር", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_etb_thousand_slash", label: "በሚ/ሺ ብር", category: "currency", base_unit: "etb", multiplier: 1000.0, is_base: false },
  { unit_code: "unit_am_usd_million", label: "ሚ/ዶላር", category: "currency", base_unit: "usd", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_hectare", label: "ሄክታር", category: "area", base_unit: "sq_m", multiplier: 10000.0, is_base: false },
  { unit_code: "unit_am_sqkm_slash", label: "ካ/ኪ/ሜ", category: "area", base_unit: "sq_m", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_sqkm_dot", label: "ካ.ኪ.ሜ", category: "area", base_unit: "sq_m", multiplier: 1000000.0, is_base: false },
  { unit_code: "unit_am_percentage_word", label: "በመቶኛ", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: true },
  { unit_code: "unit_am_percentage_sym", label: "በ%", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: false },
];

function inferCategory(kpi, unit) {
  const k = (kpi || "").toLowerCase();
  const u = (unit || "").toLowerCase();
  if (k.includes("ገቢ") || k.includes("ሮያሊቲ") || u.includes("ብር") || u.includes("ዶላር")) {
    return "revenue_royalties";
  }
  if (k.includes("ፈቃድ") || u.includes("ፈቃድ")) {
    return "cadastre_licensing";
  }
  if (k.includes("ኢንስፔክሽን") || k.includes("ክትትል") || k.includes("አካባቢ") || k.includes("ደህንነት")) {
    return "inspections_compliance";
  }
  if (k.includes("ማህበር") || k.includes("ህብረት") || k.includes("ባህላዊ")) {
    return "artisanal_cooperatives";
  }
  if (k.includes("ጂኦሎጂ") || k.includes("ጥናት") || k.includes("ካርታ") || k.includes("ናሙና")) {
    return "geological_exploration";
  }
  return "mining_production";
}

function inferUnitCategory(unit) {
  const u = (unit || "").trim();
  const match = UNIT_DEFINITIONS.find((d) => d.label === u);
  if (match) return match.category;
  if (u.includes("ግራም") || u.includes("ቶን")) return "mass";
  if (u.includes("ኪዩብ") || u.includes("ሜ.ኩ")) return "volume";
  if (u.includes("ብር") || u.includes("ዶላር")) return "currency";
  if (u.includes("ሄክታር") || u.includes("ካ/ኪ/ሜ") || u.includes("ካ.ኪ.ሜ")) return "area";
  if (u.includes("መቶኛ") || u.includes("%")) return "percentage";
  return "count";
}

async function removeTestRegionsAndData(transaction) {
  console.log("\n--- [Step 1/3] Removing Test Regions and Associated Data ---");

  // Query regions matching test naming patterns
  const [testRegions] = await sequelize.query(
    `SELECT region_id, name, code FROM regions 
     WHERE name ILIKE '%Reporting Test Region%' 
        OR name ILIKE '%Test Parity Region%' 
        OR name ILIKE '%Test Dual Reporting%'
        OR name ILIKE '%Test Region%'
        OR code ILIKE 'TEST-%'`,
    { transaction }
  );

  if (!testRegions || testRegions.length === 0) {
    console.log("No test regions found in the database. Skipping test region deletion.");
    return 0;
  }

  console.log(`Found ${testRegions.length} test region(s) to remove:`);
  testRegions.forEach((r) => console.log(` - [${r.code}] ${r.name} (${r.region_id})`));

  const regionIds = testRegions.map((r) => r.region_id);

  // 1. Delete dependent national published records
  await sequelize.query(
    `DELETE FROM national_published_records WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds }, transaction }
  );

  // 2. Delete regional requirement mappings
  await sequelize.query(
    `DELETE FROM regional_requirement_mappings WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds }, transaction }
  );

  // 3. Delete national reporting assignments
  await sequelize.query(
    `DELETE FROM national_reporting_assignments WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds }, transaction }
  );

  // 4. Delete regional plan nodes, versions, rules, configurations
  try {
    await sequelize.query(
      `DELETE FROM regional_plan_nodes WHERE version_id IN (
        SELECT version_id FROM regional_plan_versions WHERE region_id IN (:regionIds)
      )`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_plan_rules WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_planning_configurations WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_plan_versions WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  // 5. Delete regional issues and color thresholds
  try {
    await sequelize.query(
      `DELETE FROM regional_issues WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_performance_color_thresholds WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_reporting_configs WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  // 6. Delete branding settings, structures
  try {
    await sequelize.query(
      `DELETE FROM regional_branding_settings WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM regional_structures WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  // 7. Delete users assigned specifically to these test regions
  await sequelize.query(
    `DELETE FROM users WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds }, transaction }
  );

  // 8. Delete test region roles and permission groups
  try {
    await sequelize.query(
      `DELETE FROM roles WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  try {
    await sequelize.query(
      `DELETE FROM permission_groups WHERE region_id IN (:regionIds)`,
      { replacements: { regionIds }, transaction }
    );
  } catch (_) {}

  // 9. Finally, delete the test regions themselves
  await sequelize.query(
    `DELETE FROM regions WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds }, transaction }
  );

  console.log(`Successfully purged ${testRegions.length} test regions and all associated data.`);
  return testRegions.length;
}

async function seedCustomUnits(transaction) {
  console.log("\n--- [Step 2/3] Seeding / Registering Custom Units ---");

  let seededCount = 0;
  for (const def of UNIT_DEFINITIONS) {
    const existing = await NationalReportingCustomUnit.findOne({
      where: { unit_code: def.unit_code },
      transaction,
    });

    if (!existing) {
      await NationalReportingCustomUnit.create(
        {
          unit_id: uuidv4(),
          unit_code: def.unit_code,
          label: def.label,
          category: def.category,
          base_unit: def.base_unit,
          multiplier: def.multiplier,
          is_base: def.is_base,
          created_by: null,
        },
        { transaction }
      );
      seededCount++;
    } else {
      await existing.update(
        {
          label: def.label,
          category: def.category,
          base_unit: def.base_unit,
          multiplier: def.multiplier,
          is_base: def.is_base,
        },
        { transaction }
      );
    }
  }

  console.log(`Verified ${UNIT_DEFINITIONS.length} custom units in national_reporting_custom_units (newly created: ${seededCount}).`);
  return UNIT_DEFINITIONS.length;
}

async function seedNationalKpis(transaction) {
  console.log("\n--- [Step 3/3] Seeding National KPI Catalog Requirements ---");

  const jsonPath = path.join(__dirname, "../kpi/kpi_units_only.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`KPI definition file not found at: ${jsonPath}`);
  }

  const rawData = fs.readFileSync(jsonPath, "utf8");
  const kpiItems = JSON.parse(rawData);

  console.log(`Loaded ${kpiItems.length} KPI entries from kpi_units_only.json.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (let idx = 0; idx < kpiItems.length; idx++) {
    const item = kpiItems[idx];
    const kpiTitle = (item.kpi || "").trim();
    const unit = (item.unit || "").trim();
    const code = `NAT-KPI-${String(idx + 1).padStart(3, "0")}`;
    const category = inferCategory(kpiTitle, unit);
    const unitCategory = inferUnitCategory(unit);

    const existing = await NationalReportingRequirement.findOne({
      where: { code },
      transaction,
    });

    if (!existing) {
      await NationalReportingRequirement.create(
        {
          requirement_id: uuidv4(),
          code,
          title: kpiTitle,
          description: `Standardized Federal KPI: ${kpiTitle}`,
          category,
          expected_unit: unit,
          unit_category: unitCategory,
          frequency: "monthly",
          requires_numeric: true,
          requires_narrative: false,
          requires_evidence: false,
          validation_rules: {},
          is_active: true,
          version_number: 1,
          created_by: null,
        },
        { transaction }
      );
      createdCount++;
    } else {
      await existing.update(
        {
          title: kpiTitle,
          description: `Standardized Federal KPI: ${kpiTitle}`,
          category,
          expected_unit: unit,
          unit_category: unitCategory,
          frequency: "monthly",
          requires_numeric: true,
          requires_narrative: false,
          requires_evidence: false,
          is_active: true,
        },
        { transaction }
      );
      updatedCount++;
    }
  }

  console.log(`Seeded ${kpiItems.length} national requirements (Created: ${createdCount}, Updated: ${updatedCount}).`);
  return kpiItems.length;
}

async function main() {
  console.log("==================================================================");
  console.log("ETHIOPIAN MINISTRY OF MINES - NATIONAL REPORTING KPI SEEDER");
  console.log("==================================================================");

  const transaction = await sequelize.transaction();

  try {
    const removedRegions = await removeTestRegionsAndData(transaction);
    const unitsCount = await seedCustomUnits(transaction);
    const kpiCount = await seedNationalKpis(transaction);

    await transaction.commit();

    console.log("\n==================================================================");
    console.log("NATIONAL KPI CATALOG SEEDING COMPLETED SUCCESSFULLY!");
    console.log(` - Test Regions Purged: ${removedRegions}`);
    console.log(` - Units Verified/Configured: ${unitsCount}`);
    console.log(` - National KPIs Seeded: ${kpiCount}`);
    console.log("==================================================================");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error("\n[ERROR] Seeding national KPI catalog failed:", error);
    process.exit(1);
  }
}

main();
