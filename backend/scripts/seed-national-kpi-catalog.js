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

// ==============================================================================
// 1. STANDARD MEASUREMENT CATEGORIES (Prompt Section 3)
// ==============================================================================
const MEASUREMENT_CATEGORIES = [
  {
    code: "mass",
    label: "Mass & Weight",
    icon: "⚖️",
    description: "Mass and weight measurements (kg, ton, quintal, gram)",
    typical_units: ["kg", "ton"],
  },
  {
    code: "volume",
    label: "Volume",
    icon: "🧪",
    description: "Volume measurements (m3, litre, barrel)",
    typical_units: ["m3"],
  },
  {
    code: "count",
    label: "Count & Quantities",
    icon: "🔢",
    description: "Quantities, counts, and occurrences (licenses, counts, person, documents, reports, rounds, units)",
    typical_units: ["licenses", "counts", "person", "documents", "reports", "rounds", "units"],
  },
  {
    code: "percentage",
    label: "Percentage & Rates",
    icon: "📈",
    description: "Percentages and rates (%, percent)",
    typical_units: ["%", "percent"],
  },
  {
    code: "area",
    label: "Land & Surface Area",
    icon: "📐",
    description: "Land and surface area (hectare, skm, sq_m)",
    typical_units: ["hectare", "skm"],
  },
  {
    code: "currency",
    label: "Monetary & Financial Values",
    icon: "💰",
    description: "Monetary values (birr, million_birr, million_usd)",
    typical_units: ["birr", "million_birr", "million_usd"],
  },
];

// ==============================================================================
// 2. MEASUREMENT UNITS SPECIFICATIONS (Prompt Section 4)
// ==============================================================================
const MEASUREMENT_UNITS_DEF = [
  // Mass
  { unit_code: "kg", label: "kg", category: "mass", base_unit: "kg", multiplier: 1.0, is_base: true },
  { unit_code: "ton", label: "ton", category: "mass", base_unit: "kg", multiplier: 1000.0, is_base: false },
  // Volume
  { unit_code: "m3", label: "m3", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: true },
  // Count
  { unit_code: "counts", label: "counts", category: "count", base_unit: "count", multiplier: 1.0, is_base: true },
  { unit_code: "licenses", label: "licenses", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "person", label: "person", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "documents", label: "documents", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "reports", label: "reports", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "rounds", label: "rounds", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "units", label: "units", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  // Currency
  { unit_code: "birr", label: "birr", category: "currency", base_unit: "etb", multiplier: 1.0, is_base: true },
  { unit_code: "million_birr", label: "million_birr", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "million_usd", label: "million_usd", category: "currency", base_unit: "usd", multiplier: 1000000.0, is_base: false },
  // Area
  { unit_code: "hectare", label: "hectare", category: "area", base_unit: "sq_m", multiplier: 10000.0, is_base: false },
  { unit_code: "skm", label: "skm", category: "area", base_unit: "sq_m", multiplier: 1000000.0, is_base: false },
  // Percentage
  { unit_code: "%", label: "%", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: true },
  { unit_code: "percent", label: "percent", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: false },
];

function inferReportingCategory(kpiTitle, unit) {
  const k = (kpiTitle || "").toLowerCase();
  const u = (unit || "").toLowerCase();
  if (k.includes("ገቢ") || k.includes("ሮያሊቲ") || u.includes("birr") || u.includes("usd")) {
    return "revenue_royalties";
  }
  if (k.includes("ፈቃድ") || u.includes("license")) {
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

// ==============================================================================
// 3. REMOVE TEST REGIONS AND DEPENDENT DATA
// ==============================================================================
async function removeTestRegionsAndData() {
  console.log("\n--- [Step 1/4] Purging Test Regions and Dependent Data ---");

  const [testRegions] = await sequelize.query(
    `SELECT region_id, name, code FROM regions 
     WHERE name ILIKE '%Reporting Test Region%' 
        OR name ILIKE '%Test Parity Region%' 
        OR name ILIKE '%Test Dual Reporting%'
        OR name ILIKE '%Test Region%'
        OR code ILIKE 'TEST-%'`
  );

  if (!testRegions || testRegions.length === 0) {
    console.log("No test regions found. Skipping purge.");
    return 0;
  }

  console.log(`Found ${testRegions.length} test region(s) to remove:`);
  testRegions.forEach((r) => console.log(` - [${r.code}] ${r.name} (${r.region_id})`));

  const regionIds = testRegions.map((r) => r.region_id);

  // 1. National published records
  await sequelize.query(
    `DELETE FROM national_published_records WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 2. Regional requirement mappings
  await sequelize.query(
    `DELETE FROM regional_requirement_mappings WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 3. National reporting assignments
  await sequelize.query(
    `DELETE FROM national_reporting_assignments WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 4. Regional issues & escalations
  await sequelize.query(
    `DELETE FROM regional_issue_escalation_messages 
     WHERE escalation_id IN (
       SELECT escalation_id FROM regional_issue_escalations 
       WHERE region_id IN (:regionIds) 
          OR issue_id IN (SELECT issue_id FROM regional_issues WHERE region_id IN (:regionIds))
     )`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_issue_escalations 
     WHERE region_id IN (:regionIds) 
        OR issue_id IN (SELECT issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_issue_comments 
     WHERE issue_id IN (SELECT issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_issue_attachments 
     WHERE issue_id IN (SELECT issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_issue_histories 
     WHERE issue_id IN (SELECT issue_id FROM regional_issues WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_issues WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 5. Regional plan nodes & versions (using actual schema column names)
  await sequelize.query(
    `DELETE FROM regional_plan_node_action_logs 
     WHERE regional_plan_node_id IN (
       SELECT regional_plan_node_id FROM regional_plan_nodes 
       WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))
     )`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_internal_assignments 
     WHERE regional_plan_node_id IN (
       SELECT regional_plan_node_id FROM regional_plan_nodes 
       WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))
     )`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_plan_nodes 
     WHERE regional_plan_version_id IN (SELECT regional_plan_version_id FROM regional_plan_versions WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_plan_rule_steps 
     WHERE regional_plan_rule_id IN (SELECT regional_plan_rule_id FROM regional_plan_rules WHERE region_id IN (:regionIds))`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_plan_rules WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_planning_configurations WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_plan_versions WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 6. Thresholds, branding, structures
  await sequelize.query(
    `DELETE FROM regional_performance_color_thresholds WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_branding_settings WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM regional_structures WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 7. User sessions and unlinking users
  await sequelize.query(
    `DELETE FROM user_sessions WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM users WHERE region_id IN (:regionIds) AND (email ILIKE '%test%' OR email ILIKE '%parity%' OR email ILIKE '%fake%')`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `UPDATE users SET region_id = NULL WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 8. Roles and permission groups
  await sequelize.query(
    `DELETE FROM roles WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  await sequelize.query(
    `DELETE FROM permission_groups WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  // 9. Regions
  await sequelize.query(
    `DELETE FROM regions WHERE region_id IN (:regionIds)`,
    { replacements: { regionIds } }
  );

  console.log(`Successfully purged ${testRegions.length} test region(s) and all dependent records.`);
  return testRegions.length;
}

// ==============================================================================
// 4. MEASUREMENT CATEGORIES SEEDING (Prompt Section 3)
// ==============================================================================
async function seedMeasurementCategories() {
  console.log("\n--- [Step 2/4] Seeding / Verifying Measurement Categories ---");

  let createdCount = 0;
  let reusedCount = 0;

  for (const cat of MEASUREMENT_CATEGORIES) {
    const existing = await NationalReportingCustomCategory.findOne({
      where: { code: cat.code },
    });

    if (!existing) {
      await NationalReportingCustomCategory.create({
        category_id: uuidv4(),
        code: cat.code,
        label: cat.label,
        icon: cat.icon,
        description: cat.description,
        mandate_level: "mandatory_default",
        frequency_default: "monthly",
        typical_units: cat.typical_units,
        created_by: null,
      });
      createdCount++;
    } else {
      reusedCount++;
      await existing.update({
        label: cat.label,
        icon: cat.icon,
        description: cat.description,
        typical_units: cat.typical_units,
      });
    }
  }

  console.log(`Measurement Categories processed: ${MEASUREMENT_CATEGORIES.length} (Created: ${createdCount}, Reused: ${reusedCount})`);
  return { createdCount, reusedCount };
}

// ==============================================================================
// 5. MEASUREMENT UNITS SEEDING (Prompt Section 4)
// ==============================================================================
async function seedMeasurementUnits() {
  console.log("\n--- [Step 3/4] Seeding / Verifying Measurement Units ---");

  let createdCount = 0;
  let reusedCount = 0;

  for (const def of MEASUREMENT_UNITS_DEF) {
    const existing = await NationalReportingCustomUnit.findOne({
      where: { unit_code: def.unit_code },
    });

    if (!existing) {
      await NationalReportingCustomUnit.create({
        unit_id: uuidv4(),
        unit_code: def.unit_code,
        label: def.label,
        category: def.category,
        base_unit: def.base_unit,
        multiplier: def.multiplier,
        is_base: def.is_base,
        created_by: null,
      });
      createdCount++;
    } else {
      reusedCount++;
      await existing.update({
        label: def.label,
        category: def.category,
        base_unit: def.base_unit,
        multiplier: def.multiplier,
        is_base: def.is_base,
      });
    }
  }

  console.log(`Measurement Units processed: ${MEASUREMENT_UNITS_DEF.length} (Created: ${createdCount}, Reused: ${reusedCount})`);
  return { createdCount, reusedCount };
}

// ==============================================================================
// 6. KPI SEEDING AND RELATIONSHIPS (Prompt Section 5 & 6)
// ==============================================================================
async function seedKpiDefinitions() {
  console.log("\n--- [Step 4/4] Seeding KPI Definitions with English Category & Unit ---");

  const jsonPath = path.join(__dirname, "../kpi/kpi_units_only_eng.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`KPI dataset not found at: ${jsonPath}`);
  }

  const raw = fs.readFileSync(jsonPath, "utf8");
  const dataset = JSON.parse(raw);

  const supportedCategories = new Set(MEASUREMENT_CATEGORIES.map((c) => c.code));
  const supportedUnitsByCategory = new Map();
  MEASUREMENT_UNITS_DEF.forEach((u) => {
    if (!supportedUnitsByCategory.has(u.category)) {
      supportedUnitsByCategory.set(u.category, new Set());
    }
    supportedUnitsByCategory.get(u.category).add(u.unit_code);
  });

  let createdCount = 0;
  let reusedCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;
  const processedDefinitionKeys = new Set();

  for (let idx = 0; idx < dataset.length; idx++) {
    const record = dataset[idx];
    const name = (record.name || record.kpi || "").trim();
    const category = (record.category || record.measurement_category || "").trim().toLowerCase();
    const unit = (record.unit || "").trim();

    // 1. Validation (Prompt Section 7)
    if (!name) {
      console.warn(`[INVALID RECORD] Index ${idx}: name is missing or empty. Skipping.`);
      invalidCount++;
      continue;
    }

    if (!category || !supportedCategories.has(category)) {
      console.warn(`[INVALID RECORD] Index ${idx} (${name}): Unsupported category '${category}'. Skipping.`);
      invalidCount++;
      continue;
    }

    if (!unit) {
      console.warn(`[INVALID RECORD] Index ${idx} (${name}): unit is missing or empty. Skipping.`);
      invalidCount++;
      continue;
    }

    const validUnits = supportedUnitsByCategory.get(category);
    if (!validUnits || !validUnits.has(unit)) {
      console.warn(`[INCONSISTENT UNIT] Index ${idx} (${name}): Unit '${unit}' does not belong to category '${category}'. Skipping.`);
      invalidCount++;
      continue;
    }

    // 2. Duplicate Detection in Dataset (Prompt Section 5 & 6)
    const definitionKey = `${name}:::${unit}:::${category}`;
    if (processedDefinitionKeys.has(definitionKey)) {
      duplicateCount++;
      continue;
    }
    processedDefinitionKeys.add(definitionKey);

    // 3. Resolve existing KPI in database
    // Handle duplicate names with different units correctly: look up by (title, expected_unit)
    let existingKpi = await NationalReportingRequirement.findOne({
      where: {
        title: name,
        expected_unit: unit,
      },
    });

    const reportingCategory = inferReportingCategory(name, unit);

    if (existingKpi) {
      reusedCount++;
      await existingKpi.update({
        title: name,
        expected_unit: unit,
        unit_category: category,
        category: reportingCategory,
        frequency: "monthly",
        requires_numeric: true,
        requires_narrative: false,
        requires_evidence: false,
        is_active: true,
      });
    } else {
      createdCount++;
      const code = `NAT-KPI-${String(processedDefinitionKeys.size).padStart(3, "0")}`;

      // Check if code collision exists
      let finalCode = code;
      const codeExists = await NationalReportingRequirement.findOne({ where: { code: finalCode } });
      if (codeExists) {
        finalCode = `NAT-KPI-${uuidv4().substring(0, 8).toUpperCase()}`;
      }

      await NationalReportingRequirement.create({
        requirement_id: uuidv4(),
        code: finalCode,
        title: name,
        description: `Standardized Federal KPI: ${name}`,
        category: reportingCategory,
        expected_unit: unit,
        unit_category: category,
        frequency: "monthly",
        requires_numeric: true,
        requires_narrative: false,
        requires_evidence: false,
        validation_rules: {},
        is_active: true,
        version_number: 1,
        created_by: null,
      });
    }
  }

  return {
    totalRecords: dataset.length,
    createdCount,
    reusedCount,
    duplicateCount,
    invalidCount,
    distinctDefinitionsCount: processedDefinitionKeys.size,
  };
}

// ==============================================================================
// 7. MAIN RUNNER & FINAL REPORT
// ==============================================================================
async function main() {
  console.log("==================================================================");
  console.log("ETHIOPIAN MINISTRY OF MINES - STANDARDIZED KPI & UNIT SEEDER");
  console.log("==================================================================");

  try {
    const purgedRegions = await removeTestRegionsAndData();
    const categoriesResult = await seedMeasurementCategories();
    const unitsResult = await seedMeasurementUnits();
    const kpiResult = await seedKpiDefinitions();

    console.log("\n==================================================================");
    console.log("FINAL SEEDING EXECUTION REPORT");
    console.log("==================================================================");
    console.log(` - Total Input Records in Dataset:     ${kpiResult.totalRecords}`);
    console.log(` - Test Regions Purged from Database:  ${purgedRegions}`);
    console.log(` - Measurement Categories Created:     ${categoriesResult.createdCount}`);
    console.log(` - Measurement Categories Reused:      ${categoriesResult.reusedCount}`);
    console.log(` - Measurement Units Created:          ${unitsResult.createdCount}`);
    console.log(` - Measurement Units Reused:           ${unitsResult.reusedCount}`);
    console.log(` - KPI Definitions Newly Created:      ${kpiResult.createdCount}`);
    console.log(` - KPI Definitions Reused:             ${kpiResult.reusedCount}`);
    console.log(` - Duplicate Definitions in Dataset:   ${kpiResult.duplicateCount}`);
    console.log(` - Invalid / Skipped Records:          ${kpiResult.invalidCount}`);
    console.log(` - Total Active KPI Definitions:       ${kpiResult.distinctDefinitionsCount}`);
    console.log("==================================================================");

    process.exit(0);
  } catch (err) {
    console.error("\n[FATAL ERROR] KPI Seeding execution failed:", err);
    process.exit(1);
  }
}

main();
