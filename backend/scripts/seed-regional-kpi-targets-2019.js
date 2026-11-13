"use strict";

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const fs = require("fs");
const db = require("../models");
const {
  NationalReportingRequirement,
  NationalReportingAssignment,
  Region,
  User,
  sequelize,
} = db;

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

const MONTH_KEYS_ORDER = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

async function seedRegionalKpiTargets() {
  const jsonPath = path.join(__dirname, "../kpi/regional_kpi_targets_2019.json");
  if (!fs.existsSync(jsonPath)) {
    console.error(`File not found: ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const dataset = JSON.parse(rawData);

  console.log(`Loaded dataset with ${dataset.length} KPI entries from regional_kpi_targets_2019.json.`);

  const t = await sequelize.transaction();

  try {
    // 1. Fetch system admin user for assigned_by
    const adminUser = await User.findOne({
      where: { email: "plansystemadmin@gmail.com" },
      transaction: t,
    });
    const adminUserId = adminUser ? adminUser.user_id : null;

    // 2. Fetch all active regions
    const regions = await Region.findAll({ transaction: t });
    const regionMap = new Map();
    regions.forEach((r) => {
      regionMap.set(r.code.toUpperCase(), r);
      regionMap.set(r.name.toUpperCase().replace(/\s+/g, " "), r);
    });

    let kpisProcessed = 0;
    let assignmentsCreatedOrUpdated = 0;
    let totalTargetSum = 0;

    for (const item of dataset) {
      const kpiName = item.kpi ? item.kpi.trim() : "";
      const unit = item.unit ? item.unit.trim() : "count";
      const category = item.measurement_category ? item.measurement_category.trim().toLowerCase() : "count";

      if (!kpiName) continue;

      // Find or create requirement
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
        const codeNum = String(kpisProcessed + 1).padStart(4, "0");
        const reqCode = `KPI-2019-${codeNum}`;
        requirement = await NationalReportingRequirement.create(
          {
            code: reqCode,
            title: kpiName,
            category: category,
            expected_unit: unit,
            unit_category: category,
            frequency: "monthly",
            mandate_level: "mandatory_default",
            is_active: true,
            effective_start_date: "2026-07-01",
            effective_end_date: "2027-06-30",
            submission_deadline_days: 15,
            created_by: adminUserId,
          },
          { transaction: t }
        );
      } else {
        // Ensure unit and category match
        if (requirement.expected_unit !== unit || requirement.category !== category) {
          requirement.expected_unit = unit;
          requirement.category = category;
          requirement.frequency = "monthly";
          await requirement.save({ transaction: t });
        }
      }

      kpisProcessed++;

      // Process assigned regions
      const assignedRegions = item.assigned_regions || [];
      for (const regAssignment of assignedRegions) {
        const rawRegName = regAssignment.region ? regAssignment.region.trim().toUpperCase() : "";
        const regCode = REGION_NAME_MAP[rawRegName];

        let targetRegion = null;
        if (regCode && regionMap.has(regCode)) {
          targetRegion = regionMap.get(regCode);
        } else if (regionMap.has(rawRegName)) {
          targetRegion = regionMap.get(rawRegName);
        } else {
          // Fuzzy match on regions
          for (const [key, r] of regionMap.entries()) {
            if (rawRegName.includes(key) || key.includes(rawRegName)) {
              targetRegion = r;
              break;
            }
          }
        }

        if (!targetRegion) {
          console.warn(`[WARNING] Could not match region '${rawRegName}' for KPI '${kpiName}'`);
          continue;
        }

        const annualTarget = Number(regAssignment.annual_target) || 0;
        const monthlyTargetsRaw = regAssignment.monthly_targets || {};

        // Build dual-key period_targets object (maps both "January" and "Month 1")
        const periodTargets = {};
        let monthlySum = 0;

        MONTH_KEYS_ORDER.forEach((mName, idx) => {
          const monthIndexKey = `Month ${idx + 1}`;
          let val = 0;
          if (monthlyTargetsRaw[mName] !== undefined && monthlyTargetsRaw[mName] !== null) {
            val = Number(monthlyTargetsRaw[mName]);
          } else if (monthlyTargetsRaw[monthIndexKey] !== undefined) {
            val = Number(monthlyTargetsRaw[monthIndexKey]);
          } else if (monthlyTargetsRaw[String(idx + 1)] !== undefined) {
            val = Number(monthlyTargetsRaw[String(idx + 1)]);
          }

          val = Math.round(val * 100) / 100;
          periodTargets[mName] = val;
          periodTargets[monthIndexKey] = val;
          monthlySum += val;
        });

        monthlySum = Math.round(monthlySum * 100) / 100;

        // Auto-balance float difference on last month if negligible (< 0.5)
        const diff = Math.round((annualTarget - monthlySum) * 100) / 100;
        if (diff !== 0 && Math.abs(diff) < 1.0) {
          const lastMonth = MONTH_KEYS_ORDER[11];
          const lastIndexKey = "Month 12";
          periodTargets[lastMonth] = Math.round((periodTargets[lastMonth] + diff) * 100) / 100;
          periodTargets[lastIndexKey] = periodTargets[lastMonth];
        }

        // Upsert assignment
        let assignment = await NationalReportingAssignment.findOne({
          where: {
            requirement_id: requirement.requirement_id,
            region_id: targetRegion.region_id,
          },
          transaction: t,
        });

        if (assignment) {
          assignment.annual_target = annualTarget;
          assignment.period_targets = periodTargets;
          assignment.frequency_override = "monthly";
          assignment.status = "active";
          assignment.assigned_by = adminUserId;
          assignment.assigned_at = new Date();
          await assignment.save({ transaction: t });
        } else {
          assignment = await NationalReportingAssignment.create(
            {
              requirement_id: requirement.requirement_id,
              region_id: targetRegion.region_id,
              is_mandatory: true,
              annual_target: annualTarget,
              period_targets: periodTargets,
              frequency_override: "monthly",
              effective_start_date: "2026-07-01",
              effective_end_date: "2027-06-30",
              status: "active",
              assigned_by: adminUserId,
              assigned_at: new Date(),
            },
            { transaction: t }
          );
        }

        assignmentsCreatedOrUpdated++;
        totalTargetSum += annualTarget;
      }
    }

    await t.commit();

    console.log("\n=======================================================");
    console.log("REGIONAL KPI TARGETS SEEDING COMPLETED SUCCESSFULLY");
    console.log("=======================================================");
    console.log(`Total KPIs Processed: ${kpisProcessed}`);
    console.log(`Regional Assignments Created/Updated: ${assignmentsCreatedOrUpdated}`);
    console.log(`Total Annual Target Sum: ${totalTargetSum.toLocaleString()}`);
    console.log("=======================================================\n");

    process.exit(0);
  } catch (error) {
    await t.rollback();
    console.error("Error seeding regional KPI targets:", error);
    process.exit(1);
  }
}

seedRegionalKpiTargets();

