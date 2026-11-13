"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");

const {
  NationalReportingRequirement,
  NationalReportingAssignment,
  NationalReportingCustomCategory,
  NationalReportingCustomUnit,
  RegionalPlanningConfiguration,
  Region,
  User,
  sequelize,
} = db;

// ==============================================================================
// 1. REGION MAPPING (14 OFFICIAL ETHIOPIAN REGIONS)
// ==============================================================================
const REGION_NAME_MAP = {
  "AFAR": "ET-AF",
  "AMHARA": "ET-AM",
  "BENISHANGUL-GUMUZ": "ET-BE",
  "GAMBELA": "ET-GA",
  "OROMIA": "ET-OR",
  "SIDAMA": "ET-SI",
  "TIGRAY": "ET-TI",
  "SOMALI": "ET-SO",
  "CENTRAL ETHIOPIA": "ET-CE",
  "DIRE DAWA (CITY ADMINSTRATION)": "ET-DD",
  "DIRE DAWA (CITY ADMINISTRATION)": "ET-DD",
  "DIRE DAWA": "ET-DD",
  "HARARI": "ET-HA",
  "SOUTH ETHIOPIA": "ET-SE",
  "SOUTH  WEST ETHIOPIA PEOPLES": "ET-SW",
  "SOUTH WEST ETHIOPIA PEOPLES": "ET-SW",
  "SOUTH WEST": "ET-SW",
  "ADDIS ABABA (CITY ADMINSTRATION)": "ET-AA",
  "ADDIS ABABA (CITY ADMINISTRATION)": "ET-AA",
  "ADDIS ABABA": "ET-AA",
};

// ==============================================================================
// 2. PLANNING CYCLE AND 12 CONSECUTIVE TARGET DIVISIONS (Prompt Section 7)
// ==============================================================================
const PLANNING_CYCLE = {
  startDate: "2026-07-08",
  endDate: "2027-07-07",
  durationYears: 1,
  divisionsCount: 12,
  label: "2026/2027 (1919 E.C.) Annual Planning Cycle",
};

const DIVISION_BOUNDARIES = [
  { index: 1, label: "Division 1", monthLabel: "Month 1", jsonKey: "January", startDate: "2026-07-08", endDate: "2026-08-07" },
  { index: 2, label: "Division 2", monthLabel: "Month 2", jsonKey: "February", startDate: "2026-08-08", endDate: "2026-09-07" },
  { index: 3, label: "Division 3", monthLabel: "Month 3", jsonKey: "March", startDate: "2026-09-08", endDate: "2026-10-07" },
  { index: 4, label: "Division 4", monthLabel: "Month 4", jsonKey: "April", startDate: "2026-10-08", endDate: "2026-11-07" },
  { index: 5, label: "Division 5", monthLabel: "Month 5", jsonKey: "May", startDate: "2026-11-08", endDate: "2026-12-07" },
  { index: 6, label: "Division 6", monthLabel: "Month 6", jsonKey: "June", startDate: "2026-12-08", endDate: "2027-01-07" },
  { index: 7, label: "Division 7", monthLabel: "Month 7", jsonKey: "July", startDate: "2027-01-08", endDate: "2027-02-07" },
  { index: 8, label: "Division 8", monthLabel: "Month 8", jsonKey: "August", startDate: "2027-02-08", endDate: "2027-03-07" },
  { index: 9, label: "Division 9", monthLabel: "Month 9", jsonKey: "September", startDate: "2027-03-08", endDate: "2027-04-07" },
  { index: 10, label: "Division 10", monthLabel: "Month 10", jsonKey: "October", startDate: "2027-04-08", endDate: "2027-05-07" },
  { index: 11, label: "Division 11", monthLabel: "Month 11", jsonKey: "November", startDate: "2027-05-08", endDate: "2027-06-07" },
  { index: 12, label: "Division 12", monthLabel: "Month 12", jsonKey: "December", startDate: "2027-06-08", endDate: "2027-07-07" },
];

// Standard measurement categories definition
const STANDARD_CATEGORIES = [
  { code: "mass", label: "Mass and Weight", icon: "⚖️", description: "Mass and weight measurements" },
  { code: "volume", label: "Volume", icon: "🧪", description: "Volume measurements" },
  { code: "count", label: "Quantities and Counts", icon: "🔢", description: "Quantities, counts, and occurrences" },
  { code: "percentage", label: "Percentages and Rates", icon: "📈", description: "Percentages and rates" },
  { code: "area", label: "Land and Surface Area", icon: "📐", description: "Land and surface area" },
  { code: "currency", label: "Monetary Values", icon: "💰", description: "Monetary values" },
];

// Helper: infer category if omitted
function inferCategoryFromUnit(unit, currentCategory) {
  if (currentCategory && ["mass", "volume", "count", "percentage", "area", "currency"].includes(currentCategory.toLowerCase())) {
    return currentCategory.toLowerCase();
  }
  const u = String(unit || "").toLowerCase();
  if (["kg", "ton", "tonne", "quintal", "g", "gram"].includes(u)) return "mass";
  if (["m3", "litre", "barrel"].includes(u)) return "volume";
  if (["birr", "usd", "million_birr", "million_usd"].includes(u)) return "currency";
  if (["%", "percent"].includes(u)) return "percentage";
  if (["hectare", "skm", "m2", "km2", "sq_m"].includes(u)) return "area";
  return "count";
}

// Decimal-safe round helper (to 4 decimal places)
function roundDecimal(num, decimals = 4) {
  const factor = Math.pow(10, decimals);
  return Math.round(Number(num) * factor) / factor;
}

// ==============================================================================
// MAIN SEEDING ROUTINE
// ==============================================================================
async function seedRegionalKpiTargetsAndConfigurations() {
  const jsonPath = path.join(__dirname, "../kpi/regional_kpi_targets_2019.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`[ERROR] JSON dataset not found at: ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const dataset = JSON.parse(rawData);

  console.log("==============================================================================");
  console.log("STARTING REGIONAL KPI SEEDING, ASSIGNMENT & 12-PERIOD TARGET CONFIGURATION");
  console.log("==============================================================================");
  console.log(`Loaded dataset with ${dataset.length} KPI items from ${path.basename(jsonPath)}.`);
  console.log(`Planning cycle: ${PLANNING_CYCLE.startDate} to ${PLANNING_CYCLE.endDate} (12 consecutive divisions).`);

  const t = await sequelize.transaction();

  try {
    // --------------------------------------------------------------------------
    // 0. ADMIN USER & REGIONAL SCOPE INITIALIZATION
    // --------------------------------------------------------------------------
    const adminUser = await User.findOne({
      where: { email: "plansystemadmin@gmail.com" },
      transaction: t,
    });
    const adminUserId = adminUser ? adminUser.user_id : null;

    const regions = await Region.findAll({ transaction: t });
    const regionMap = new Map();
    regions.forEach((r) => {
      regionMap.set(r.code.toUpperCase(), r);
      regionMap.set(r.name.toUpperCase().replace(/\s+/g, " "), r);
    });

    const activeOfficialRegions = regions.filter((r) =>
      r.is_active && Object.values(REGION_NAME_MAP).includes(r.code)
    );
    console.log(`Active official regions detected: ${activeOfficialRegions.length} of 14.`);

    // --------------------------------------------------------------------------
    // 1. PHASE ONE: ENSURE MEASUREMENT CATEGORIES & UNITS EXIST
    // --------------------------------------------------------------------------
    let categoriesCreated = 0;
    let categoriesReused = 0;
    for (const catDef of STANDARD_CATEGORIES) {
      const [category, created] = await NationalReportingCustomCategory.findOrCreate({
        where: { code: catDef.code },
        defaults: {
          category_id: uuidv4(),
          code: catDef.code,
          label: catDef.label,
          icon: catDef.icon,
          description: catDef.description,
          mandate_level: "mandatory_default",
          frequency_default: "monthly",
          typical_units: [],
          created_by: adminUserId,
        },
        transaction: t,
      });
      if (created) categoriesCreated++;
      else categoriesReused++;
    }

    let unitsCreated = 0;
    let unitsReused = 0;
    const knownUnits = new Set();

    // Collect all units from dataset
    dataset.forEach((item) => {
      if (item.unit) {
        const u = item.unit.trim();
        const c = inferCategoryFromUnit(u, item.measurement_category);
        knownUnits.add(JSON.stringify({ unit: u, category: c }));
      }
    });

    for (const rawUnitItem of knownUnits) {
      const { unit: uCode, category: catCode } = JSON.parse(rawUnitItem);
      let existingUnit = await NationalReportingCustomUnit.findOne({
        where: { unit_code: uCode },
        transaction: t,
      });

      if (!existingUnit) {
        await NationalReportingCustomUnit.create(
          {
            unit_id: uuidv4(),
            unit_code: uCode,
            label: uCode,
            category: catCode,
            base_unit: uCode,
            multiplier: 1.0,
            is_base: true,
            created_by: adminUserId,
          },
          { transaction: t }
        );
        unitsCreated++;
      } else {
        unitsReused++;
      }
    }

    // --------------------------------------------------------------------------
    // 2. PHASE THREE (A): CONFIGURE REGIONAL PLANNING CONFIGURATIONS FOR 12 DIVISIONS
    // --------------------------------------------------------------------------
    const customPeriodsConfiguration = DIVISION_BOUNDARIES.map((div) => ({
      period_index: div.index,
      label: div.label,
      start_date: div.startDate,
      end_date: div.endDate,
      name: `${div.label} (${div.startDate} ~ ${div.endDate})`,
    }));

    let regionalConfigsUpdated = 0;
    for (const region of activeOfficialRegions) {
      let regionalConfig = await RegionalPlanningConfiguration.findOne({
        where: { region_id: region.region_id, owned_by_plan_version_id: null },
        transaction: t,
      });

      if (!regionalConfig) {
        await RegionalPlanningConfiguration.create(
          {
            regional_planning_config_id: uuidv4(),
            region_id: region.region_id,
            min_duration_years: 1,
            max_duration_years: 10,
            draft_entity_label_singular: "Plan Draft",
            draft_entity_label_plural: "Plan Drafts",
            create_action_label: "Create Plan Draft",
            planning_period_label: PLANNING_CYCLE.label,
            duration_label: "Duration",
            start_year_label: PLANNING_CYCLE.startDate,
            end_year_label: PLANNING_CYCLE.endDate,
            breakdown_mode: "custom",
            custom_periods: customPeriodsConfiguration,
            target_units: Array.from(knownUnits).map((k) => ({
              id: JSON.parse(k).unit,
              label: JSON.parse(k).unit,
              symbol: JSON.parse(k).unit,
            })),
            owned_by_plan_version_id: null,
          },
          { transaction: t }
        );
      } else {
        regionalConfig.breakdown_mode = "custom";
        regionalConfig.custom_periods = customPeriodsConfiguration;
        regionalConfig.start_year_label = PLANNING_CYCLE.startDate;
        regionalConfig.end_year_label = PLANNING_CYCLE.endDate;
        regionalConfig.planning_period_label = PLANNING_CYCLE.label;
        await regionalConfig.save({ transaction: t });
      }
      regionalConfigsUpdated++;
    }

    // --------------------------------------------------------------------------
    // 3. PHASE ONE & TWO: KPI CREATION, REGIONAL ASSIGNMENT & TARGET VALIDATION
    // --------------------------------------------------------------------------
    let kpisCreated = 0;
    let kpisReused = 0;
    let totalAssignmentsAttempted = 0;
    let assignmentsSuccessful = 0;
    let assignmentsRejected = 0;
    let totalAnnualTargetAllocated = 0;

    const successfulReportRecords = [];
    const failureReportRecords = [];

    let kpiCounter = 0;
    for (const item of dataset) {
      kpiCounter++;
      const kpiName = item.kpi ? item.kpi.trim() : "";
      const unit = item.unit ? item.unit.trim() : "count";
      const category = inferCategoryFromUnit(unit, item.measurement_category);

      if (!kpiName) continue;

      // Find or create KPI Requirement
      let requirement = await NationalReportingRequirement.findOne({
        where: {
          title: kpiName,
          expected_unit: unit,
        },
        transaction: t,
      });

      if (!requirement) {
        requirement = await NationalReportingRequirement.findOne({
          where: { title: kpiName },
          transaction: t,
        });
      }

      if (!requirement) {
        const codeNum = String(kpiCounter).padStart(4, "0");
        requirement = await NationalReportingRequirement.create(
          {
            requirement_id: uuidv4(),
            code: `KPI-2019-${codeNum}`,
            title: kpiName,
            category: category,
            expected_unit: unit,
            unit_category: category,
            frequency: "monthly",
            mandate_level: "mandatory_default",
            is_active: true,
            effective_start_date: PLANNING_CYCLE.startDate,
            effective_end_date: PLANNING_CYCLE.endDate,
            submission_deadline_days: 15,
            created_by: adminUserId,
          },
          { transaction: t }
        );
        kpisCreated++;
      } else {
        kpisReused++;
        // Update mandate dates & unit specifications
        let reqModified = false;
        if (requirement.expected_unit !== unit) {
          requirement.expected_unit = unit;
          reqModified = true;
        }
        if (requirement.unit_category !== category) {
          requirement.unit_category = category;
          reqModified = true;
        }
        if (requirement.effective_start_date !== PLANNING_CYCLE.startDate) {
          requirement.effective_start_date = PLANNING_CYCLE.startDate;
          reqModified = true;
        }
        if (requirement.effective_end_date !== PLANNING_CYCLE.endDate) {
          requirement.effective_end_date = PLANNING_CYCLE.endDate;
          reqModified = true;
        }
        if (requirement.frequency !== "monthly") {
          requirement.frequency = "monthly";
          reqModified = true;
        }
        if (reqModified) {
          await requirement.save({ transaction: t });
        }
      }

      // Process Assigned Regions
      const assignedRegions = item.assigned_regions || [];
      for (const regEntry of assignedRegions) {
        totalAssignmentsAttempted++;
        const rawRegName = regEntry.region ? regEntry.region.trim().toUpperCase() : "";
        const regCode = REGION_NAME_MAP[rawRegName];

        let targetRegion = null;
        if (regCode && regionMap.has(regCode)) {
          targetRegion = regionMap.get(regCode);
        } else if (regionMap.has(rawRegName)) {
          targetRegion = regionMap.get(rawRegName);
        } else {
          for (const [key, r] of regionMap.entries()) {
            if (rawRegName.includes(key) || key.includes(rawRegName)) {
              targetRegion = r;
              break;
            }
          }
        }

        if (!targetRegion) {
          failureReportRecords.push({
            kpi: kpiName,
            region: rawRegName,
            operation: "regional_resolution",
            reason: `Region '${rawRegName}' could not be resolved to any official regional entity.`,
            expected_annual_target: regEntry.annual_target,
            actual_monthly_sum: null,
            discrepancy: null,
          });
          assignmentsRejected++;
          continue;
        }

        // ----------------------------------------------------------------------
        // PHASE THREE & FOUR: STRICT 12-PERIOD TARGET VALIDATION
        // ----------------------------------------------------------------------
        const rawAnnualTarget = regEntry.annual_target;
        const annualTargetNum = Number(rawAnnualTarget);

        if (rawAnnualTarget === undefined || rawAnnualTarget === null || isNaN(annualTargetNum)) {
          failureReportRecords.push({
            kpi: kpiName,
            region: targetRegion.name,
            operation: "target_validation",
            reason: `Annual target is missing or not a valid number: ${rawAnnualTarget}`,
            expected_annual_target: rawAnnualTarget,
            actual_monthly_sum: null,
            discrepancy: null,
          });
          assignmentsRejected++;
          continue;
        }

        if (annualTargetNum < 0) {
          failureReportRecords.push({
            kpi: kpiName,
            region: targetRegion.name,
            operation: "target_validation",
            reason: `Annual target is negative: ${annualTargetNum}`,
            expected_annual_target: annualTargetNum,
            actual_monthly_sum: null,
            discrepancy: null,
          });
          assignmentsRejected++;
          continue;
        }

        const monthlyTargetsRaw = regEntry.monthly_targets || {};
        const periodValues = [];
        let hasInvalidMonthlyValue = false;
        let monthlySum = 0;

        for (const div of DIVISION_BOUNDARIES) {
          // Look up using original JSON key order
          const val = monthlyTargetsRaw[div.jsonKey];
          if (val === undefined || val === null || isNaN(Number(val))) {
            hasInvalidMonthlyValue = true;
            break;
          }
          const numVal = Number(val);
          if (numVal < 0) {
            hasInvalidMonthlyValue = true;
            break;
          }
          periodValues.push({
            divisionIndex: div.index,
            divisionLabel: div.label,
            monthLabel: div.monthLabel,
            value: numVal,
          });
          monthlySum += numVal;
        }

        if (hasInvalidMonthlyValue || periodValues.length !== 12) {
          failureReportRecords.push({
            kpi: kpiName,
            region: targetRegion.name,
            operation: "period_target_structure",
            reason: `Monthly target distribution does not contain exactly 12 valid non-negative numeric entries.`,
            expected_annual_target: annualTargetNum,
            actual_monthly_sum: monthlySum,
            discrepancy: null,
          });
          assignmentsRejected++;
          continue;
        }

        // Decimal-safe sum comparison
        const roundedAnnual = roundDecimal(annualTargetNum, 4);
        const roundedMonthlySum = roundDecimal(monthlySum, 4);
        const discrepancy = roundDecimal(roundedAnnual - roundedMonthlySum, 4);

        if (Math.abs(discrepancy) > 0.0001) {
          // STRICT VALIDATION RULE: Reject configuration, do not silently adjust!
          failureReportRecords.push({
            kpi: kpiName,
            region: targetRegion.name,
            operation: "sum_reconciliation_validation",
            reason: `Sum of 12 monthly divisions (${roundedMonthlySum}) does not equal assigned annual target (${roundedAnnual}). Discrepancy: ${discrepancy > 0 ? `+${discrepancy}` : discrepancy}`,
            expected_annual_target: roundedAnnual,
            actual_monthly_sum: roundedMonthlySum,
            discrepancy: discrepancy,
          });
          assignmentsRejected++;
          continue;
        }

        // ----------------------------------------------------------------------
        // VALID RECORD: PERSIST REGIONAL ASSIGNMENT & 12 CONFIGURED TARGETS
        // ----------------------------------------------------------------------
        const periodTargetsPayload = {};
        periodValues.forEach((p) => {
          periodTargetsPayload[p.divisionLabel] = p.value;
          periodTargetsPayload[p.monthLabel] = p.value;
          periodTargetsPayload[String(p.divisionIndex)] = p.value;
        });

        let assignment = await NationalReportingAssignment.findOne({
          where: {
            requirement_id: requirement.requirement_id,
            region_id: targetRegion.region_id,
          },
          transaction: t,
        });

        if (assignment) {
          assignment.annual_target = roundedAnnual;
          assignment.period_targets = periodTargetsPayload;
          assignment.effective_start_date = PLANNING_CYCLE.startDate;
          assignment.effective_end_date = PLANNING_CYCLE.endDate;
          assignment.frequency_override = "monthly";
          assignment.status = "active";
          assignment.assigned_by = adminUserId;
          assignment.assigned_at = new Date();
          await assignment.save({ transaction: t });
        } else {
          assignment = await NationalReportingAssignment.create(
            {
              assignment_id: uuidv4(),
              requirement_id: requirement.requirement_id,
              region_id: targetRegion.region_id,
              is_mandatory: true,
              annual_target: roundedAnnual,
              period_targets: periodTargetsPayload,
              effective_start_date: PLANNING_CYCLE.startDate,
              effective_end_date: PLANNING_CYCLE.endDate,
              frequency_override: "monthly",
              status: "active",
              assigned_by: adminUserId,
              assigned_at: new Date(),
            },
            { transaction: t }
          );
        }

        assignmentsSuccessful++;
        totalAnnualTargetAllocated += roundedAnnual;
        successfulReportRecords.push({
          kpi: kpiName,
          category: category,
          unit: unit,
          region: targetRegion.name,
          regionCode: targetRegion.code,
          annual_target: roundedAnnual,
          configured_divisions: 12,
          sum_of_divisions: roundedMonthlySum,
          status: "valid_persisted",
        });
      }
    }

    await t.commit();

    // ==============================================================================
    // 4. DETAILED EXECUTION REPORT (Prompt Section 10)
    // ==============================================================================
    console.log("\n==============================================================================");
    console.log("REGIONAL KPI SEEDING EXECUTION REPORT");
    console.log("==============================================================================");
    console.log(`Measurement Categories Created : ${categoriesCreated}`);
    console.log(`Measurement Categories Reused  : ${categoriesReused}`);
    console.log(`Measurement Units Created      : ${unitsCreated}`);
    console.log(`Measurement Units Reused       : ${unitsReused}`);
    console.log(`Regional Configurations Updated: ${regionalConfigsUpdated} (configured for 12 divisions)`);
    console.log(`KPI Definitions Created        : ${kpisCreated}`);
    console.log(`KPI Definitions Reused         : ${kpisReused}`);
    console.log(`Total Regional Assignments Seen: ${totalAssignmentsAttempted}`);
    console.log(`Assignments Valid & Persisted  : ${assignmentsSuccessful}`);
    console.log(`Assignments Rejected (Failed)  : ${assignmentsRejected}`);
    console.log(`Total Annual Target Sum (Valid): ${totalAnnualTargetAllocated.toLocaleString()} (across valid regional assignments)`);
    console.log("==============================================================================\n");

    if (failureReportRecords.length > 0) {
      console.log("------------------------------------------------------------------------------");
      console.log(`REJECTED ASSIGNMENTS BREAKDOWN (${failureReportRecords.length} records):`);
      console.log("------------------------------------------------------------------------------");
      failureReportRecords.forEach((fail, idx) => {
        console.log(
          `[${String(idx + 1).padStart(3, " ")}] KPI: "${fail.kpi}" | Region: ${fail.region}\n` +
          `      Reason: ${fail.reason}\n` +
          `      Expected Annual Target: ${fail.expected_annual_target} | Actual Monthly Sum: ${fail.actual_monthly_sum} | Discrepancy: ${fail.discrepancy}`
        );
      });
      console.log("------------------------------------------------------------------------------\n");
    }

    console.log("SAMPLE SUCCESSFUL ASSIGNMENTS WITH 12 DIVISIONS (First 5):");
    successfulReportRecords.slice(0, 5).forEach((rec, idx) => {
      console.log(
        `[${idx + 1}] Region: ${rec.regionCode} (${rec.region}) | KPI: "${rec.kpi}"\n` +
        `    Category: ${rec.category} | Unit: ${rec.unit} | Annual Target: ${rec.annual_target}\n` +
        `    Configured Divisions: ${rec.configured_divisions} | Division Sum: ${rec.sum_of_divisions} | Status: ${rec.status}`
      );
    });

    console.log("\n>>> SEEDING AND TARGET CONFIGURATION FINISHED SUCCESSFULLY.");
  } catch (error) {
    await t.rollback();
    console.error("[CRITICAL FAILURE] Seeding transaction rolled back due to error:", error);
    process.exit(1);
  }
}

seedRegionalKpiTargetsAndConfigurations();
