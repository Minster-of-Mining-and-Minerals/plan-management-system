"use strict";

/**
 * seed-all-national-reporting-kpis.js
 *
 * Unified National Reporting Seeder:
 *   - Reads ALL 5 JSON datasets under backend/kpi/ without duplication
 *   - Uses the 29 real Amharic categories from regional_mining_plan_kpis.json
 *   - Time range: Hamle 01, 2018 EC (2026-07-08) to Sene 30, 2019 EC (2027-07-07)
 *   - Calendar system: EC
 *   - Reporting frequency: 'daily' for Gold (ወርቅ / gold) KPIs, 'monthly' for all others
 *   - Target allocation depth: Annual–Monthly (breakdown_mode = 'monthly')
 *   - Preserves Ministry of Mines organogram, users, and short-term plans
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const db = require("../models");
const { convertEthiopianToGregorian } = require("../utils/calendarUtils");
const { generateReportingPeriods } = require("../utils/nationalReportingPeriodUtils");

const {
  sequelize,
  NationalReportingRequirement,
  NationalReportingAssignment,
  NationalReportingCustomCategory,
  NationalReportingCustomUnit,
  NationalReportingPeriodConfig,
  RegionalRequirementMapping,
  NationalPublishedRecord,
  RegionalPlanningConfiguration,
  Region,
  User,
} = db;

// ─── Canonical EC Fiscal Year: Hamle 01, 2018 EC – Sene 30, 2019 EC ──────────
const START_DATE_GC = convertEthiopianToGregorian(2018, 11, 1).dateStr; // 2026-07-08
const END_DATE_GC = convertEthiopianToGregorian(2019, 10, 30).dateStr;  // 2027-07-07

// ─── Official 14 Regions Map (including all JSON spelling variants) ───────────
const REGION_NAME_MAP = {
  "AFAR": "ET-AF",
  "AMHARA": "ET-AM",
  "BENISHANGUL-GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE",
  "BENISHAGUL GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE",
  "BENISHANGUL-GUMUZ": "ET-BE",
  "BENISHAGUL-GUMUZ": "ET-BE", // typo variant in JSON (missing N)
  "GAMBELA": "ET-GA",
  "GAMBELLA": "ET-GA",          // double-L variant in JSON
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
  "SOUT WEST ETHIOPIA PEOPLES": "ET-SW",
  "SOUTH WEST ETHIOPIA": "ET-SW",
  "SOUTH WEST": "ET-SW",
  "ADDIS ABABA (CITY ADMINSTRATION)": "ET-AA",
  "ADDIS ABABA (CITY ADMINISTRATION)": "ET-AA",
  "ADDIS ABABA": "ET-AA",
};

const STANDARD_UNITS_DEF = [
  { unit_code: "kg", label: "kg", category: "mass", base_unit: "kg", multiplier: 1.0, is_base: true },
  { unit_code: "ton", label: "ton", category: "mass", base_unit: "kg", multiplier: 1000.0, is_base: false },
  { unit_code: "m3", label: "m3", category: "volume", base_unit: "m3", multiplier: 1.0, is_base: true },
  { unit_code: "counts", label: "counts", category: "count", base_unit: "count", multiplier: 1.0, is_base: true },
  { unit_code: "licenses", label: "licenses", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "person", label: "person", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "documents", label: "documents", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "reports", label: "reports", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "rounds", label: "rounds", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "units", label: "units", category: "count", base_unit: "count", multiplier: 1.0, is_base: false },
  { unit_code: "birr", label: "birr", category: "currency", base_unit: "etb", multiplier: 1.0, is_base: true },
  { unit_code: "million_birr", label: "million_birr", category: "currency", base_unit: "etb", multiplier: 1000000.0, is_base: false },
  { unit_code: "million_usd", label: "million_usd", category: "currency", base_unit: "usd", multiplier: 1000000.0, is_base: false },
  { unit_code: "hectare", label: "hectare", category: "area", base_unit: "sq_m", multiplier: 10000.0, is_base: false },
  { unit_code: "skm", label: "skm", category: "area", base_unit: "sq_m", multiplier: 1000000.0, is_base: false },
  { unit_code: "%", label: "%", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: true },
  { unit_code: "percent", label: "percent", category: "percentage", base_unit: "percentage", multiplier: 1.0, is_base: false },
];

const JSON_MONTH_KEYS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function norm(s) {
  return String(s || "").trim().replace(/\s+/g, " ");
}

function isGoldKpi(title) {
  const t = norm(title).toLowerCase();
  return t.includes("ወርቅ") || t.includes("gold");
}

function inferUnitCategory(unit, hint) {
  if (hint && ["mass", "volume", "count", "percentage", "area", "currency"].includes(hint.toLowerCase())) {
    return hint.toLowerCase();
  }
  const u = norm(unit).toLowerCase();
  if (["kg", "ton", "tonne", "quintal", "g", "gram"].includes(u)) return "mass";
  if (["m3", "litre", "barrel"].includes(u)) return "volume";
  if (["birr", "usd", "million_birr", "million_usd"].includes(u)) return "currency";
  if (["%", "percent"].includes(u)) return "percentage";
  if (["hectare", "skm", "m2", "km2", "sq_m"].includes(u)) return "area";
  return "count";
}

function resolveRegionCode(rawRegion) {
  const key = norm(rawRegion).toUpperCase();
  return REGION_NAME_MAP[key] || null;
}

/**
 * Fallback Amharic category mapper for the ~15 KPIs that don't have a direct entry
 * in regional_mining_plan_kpis.json, mapping them to one of the 29 real Amharic categories.
 */
function fallbackAmharicCategory(title, categoriesByLabel) {
  const t = norm(title);
  const pick = (substring) => {
    for (const [label, code] of categoriesByLabel.entries()) {
      if (label.includes(substring)) return code;
    }
    return null;
  };
  if (t.includes("ገቢ") || t.includes("ሮያሊቲ")) return pick("የሚሰበሰብ ገቢ") || pick("የሀገር ውስጥ ገቢ");
  if (t.includes("ስራ ዕድል") || t.includes("ስራ እድል")) {
    if (t.includes("ባህላዊ")) return pick("በባህላዊና ልዩ አነስተኛ");
    return pick("በዘርፉ የተፈጠረ የስራ ዕድል") || pick("በዘርፉ የሚፈጠር የስራ ዕድል");
  }
  if (t.includes("መልሶ ማልማት") || t.includes("አካባቢ")) return pick("መልሶ ማልማት");
  if (t.includes("ፈቃድ") || t.includes("ፍቃድ")) return pick("የሚሰጡ ፈቃዶች");
  if (t.includes("ኤክስፖርት")) return pick("ከኤክስፖርት ማዕድን ምርት");
  if (t.includes("ኢንዱስትሪ")) return pick("የኢንዱስትሪ ማዕድናት");
  if (t.includes("ኮንስትራክሽን")) return pick("የግንባታ ግብአት ማዕድናት");
  // Default to first Amharic category if nothing else matches
  return categoriesByLabel.values().next().value;
}

async function seedAllNationalReporting() {
  const kpiDir = path.join(__dirname, "../kpi");
  const kpiUnitsOnly = JSON.parse(fs.readFileSync(path.join(kpiDir, "kpi_units_only.json"), "utf8"));
  const kpiUnitsOnlyEng = JSON.parse(fs.readFileSync(path.join(kpiDir, "kpi_units_only_eng.json"), "utf8"));
  const kpiUnitsWithRegions = JSON.parse(fs.readFileSync(path.join(kpiDir, "kpi_units_with_regions.json"), "utf8"));
  const regionalTargets2019 = JSON.parse(fs.readFileSync(path.join(kpiDir, "regional_kpi_targets_2019.json"), "utf8"));
  const regionalMiningPlan = JSON.parse(fs.readFileSync(path.join(kpiDir, "regional_mining_plan_kpis.json"), "utf8"));

  console.log("==============================================================================");
  console.log("UNIFIED NATIONAL REPORTING RE-SEED (29 AMHARIC CATEGORIES, ALL 5 KPI FILES)");
  console.log(`Calendar: EC | Range: Hamle 01, 2018 (${START_DATE_GC}) - Sene 30, 2019 (${END_DATE_GC})`);
  console.log("Frequencies: Gold = daily | All others = monthly | Depth: Annual-Monthly");
  console.log("==============================================================================");

  // ── 1. Collect all 29 Amharic categories & KPI metadata across all 5 files ──
  const amharicCategories = [];
  const categoriesByLabel = new Map(); // label -> code
  const kpiCategoryMap = new Map();    // kpiTitle -> categoryCode
  const kpiUnitMap = new Map();        // kpiTitle -> { unit, unit_category }

  for (const entry of regionalMiningPlan) {
    const catLabel = norm(entry.category);
    if (catLabel && !categoriesByLabel.has(catLabel)) {
      const code = `am_cat_${String(amharicCategories.length + 1).padStart(2, "0")}`;
      categoriesByLabel.set(catLabel, code);
      amharicCategories.push({ code, label: catLabel });
    }
    const catCode = categoriesByLabel.get(catLabel);
    for (const rawKpi of entry["kpi-list"] || []) {
      const title = norm(typeof rawKpi === "string" ? rawKpi : rawKpi.kpi);
      if (title && catCode && !kpiCategoryMap.has(title)) {
        kpiCategoryMap.set(title, catCode);
      }
    }
  }

  // Merge units & unit_category across all unit-bearing datasets
  const registerKpiMeta = (titleRaw, unitRaw, measCatRaw) => {
    const title = norm(titleRaw);
    if (!title) return;
    const unit = norm(unitRaw);
    const unitCat = measCatRaw ? inferUnitCategory(unit, measCatRaw) : null;
    if (!kpiUnitMap.has(title)) {
      kpiUnitMap.set(title, {
        unit: unit || "counts",
        unit_category: unitCat || inferUnitCategory(unit || "counts"),
      });
    } else {
      const cur = kpiUnitMap.get(title);
      if ((!cur.unit || cur.unit === "counts") && unit) {
        cur.unit = unit;
        cur.unit_category = unitCat || inferUnitCategory(unit);
      }
      if (unitCat && !cur.unit_category) cur.unit_category = unitCat;
    }
  };

  kpiUnitsOnlyEng.forEach((x) => registerKpiMeta(x.kpi, x.unit, x.measurement_category));
  regionalTargets2019.forEach((x) => registerKpiMeta(x.kpi, x.unit, x.measurement_category));
  kpiUnitsWithRegions.forEach((x) => registerKpiMeta(x.kpi, x.unit, null));
  kpiUnitsOnly.forEach((x) => registerKpiMeta(x.kpi, x.unit, null));
  for (const title of kpiCategoryMap.keys()) {
    if (!kpiUnitMap.has(title)) {
      kpiUnitMap.set(title, { unit: "counts", unit_category: "count" });
    }
  }

  const allUniqueKpiTitles = Array.from(kpiUnitMap.keys());
  console.log(`Collected ${amharicCategories.length} Amharic categories and ${allUniqueKpiTitles.length} unique KPIs.`);

  // ── 2. Collect deduplicated (regionCode, kpiTitle) assignments ─────────────
  const assignmentMap = new Map(); // `${regionCode}|||${kpiTitle}` -> { regionCode, kpiTitle, annualTarget, monthlyTargets }
  const upsertPair = (rawRegion, rawKpi, targetData = null) => {
    const regionCode = resolveRegionCode(rawRegion);
    const kpiTitle = norm(rawKpi);
    if (!regionCode || !kpiTitle) return;
    const key = `${regionCode}|||${kpiTitle}`;
    if (!assignmentMap.has(key)) {
      assignmentMap.set(key, {
        regionCode,
        kpiTitle,
        annualTarget: null,
        monthlyTargets: null,
      });
    }
    if (targetData) {
      const rec = assignmentMap.get(key);
      if (targetData.annualTarget !== null && targetData.annualTarget !== undefined) {
        rec.annualTarget = targetData.annualTarget;
      }
      if (targetData.monthlyTargets) {
        rec.monthlyTargets = targetData.monthlyTargets;
      }
    }
  };

  for (const entry of regionalMiningPlan) {
    for (const rawKpi of entry["kpi-list"] || []) {
      upsertPair(entry.region, typeof rawKpi === "string" ? rawKpi : rawKpi.kpi);
    }
  }
  for (const item of kpiUnitsWithRegions) {
    for (const r of item.regions || []) {
      upsertPair(r, item.kpi);
    }
  }
  for (const item of regionalTargets2019) {
    for (const ar of item.assigned_regions || []) {
      const ann = ar.annual_target !== undefined && ar.annual_target !== null && !isNaN(Number(ar.annual_target))
        ? Number(ar.annual_target)
        : null;
      upsertPair(ar.region, item.kpi, {
        annualTarget: ann,
        monthlyTargets: ar.monthly_targets || null,
      });
    }
  }

  console.log(`Collected ${assignmentMap.size} unique (region, KPI) assignments across all 5 files.`);

  // ── 3. Generate EC Monthly Periods for Hamle 01, 2018 - Sene 30, 2019 ─────
  const ecMonthlyPeriods = generateReportingPeriods(START_DATE_GC, END_DATE_GC, "monthly", "EC");
  const ecTwelveMainMonths = ecMonthlyPeriods.filter((p) => !p.period_label.startsWith("Pagume"));

  const t = await sequelize.transaction();
  try {
    const adminUser = await User.findOne({
      where: { email: "plansystemadmin@gmail.com" },
      transaction: t,
    });
    const adminUserId = adminUser ? adminUser.user_id : null;

    // ── A. Clean ONLY national reporting tables ─────────────────────────────
    console.log("\n[1/6] Cleaning existing national reporting records...");
    await NationalPublishedRecord.destroy({ where: {}, force: true, transaction: t });
    await RegionalRequirementMapping.destroy({ where: {}, force: true, transaction: t });
    await NationalReportingAssignment.destroy({ where: {}, force: true, transaction: t });
    await NationalReportingRequirement.destroy({ where: {}, force: true, transaction: t });
    await NationalReportingCustomCategory.destroy({ where: {}, force: true, transaction: t });
    await NationalReportingCustomUnit.destroy({ where: {}, force: true, transaction: t });
    await NationalReportingPeriodConfig.destroy({ where: {}, force: true, transaction: t });

    // ── B. Seed 29 Amharic Categories ────────────────────────────────────────
    console.log("[2/6] Seeding 29 Amharic reporting categories...");
    for (const cat of amharicCategories) {
      await NationalReportingCustomCategory.create(
        {
          category_id: uuidv4(),
          code: cat.code,
          label: cat.label,
          icon: "📊",
          description: cat.label,
          mandate_level: "mandatory_default",
          frequency_default: isGoldKpi(cat.label) ? "daily" : "monthly",
          typical_units: [],
          created_by: adminUserId,
        },
        { transaction: t }
      );
    }

    // ── C. Seed Measurement Units ────────────────────────────────────────────
    console.log("[3/6] Seeding measurement units...");
    const createdUnits = new Set();
    for (const u of STANDARD_UNITS_DEF) {
      await NationalReportingCustomUnit.create(
        { unit_id: uuidv4(), ...u, created_by: adminUserId },
        { transaction: t }
      );
      createdUnits.add(u.unit_code.toLowerCase());
    }
    for (const meta of kpiUnitMap.values()) {
      const uLower = meta.unit.toLowerCase();
      if (!createdUnits.has(uLower)) {
        await NationalReportingCustomUnit.create(
          {
            unit_id: uuidv4(),
            unit_code: meta.unit,
            label: meta.unit,
            category: meta.unit_category,
            base_unit: meta.unit,
            multiplier: 1.0,
            is_base: true,
            created_by: adminUserId,
          },
          { transaction: t }
        );
        createdUnits.add(uLower);
      }
    }

    // ── D. Seed EC Period Configs & Regional Annual-Monthly Planning Configs ─
    console.log("[4/6] Configuring EC period schedules & Regional Annual-Monthly depth...");
    await NationalReportingPeriodConfig.create(
      {
        config_id: uuidv4(),
        frequency: "monthly",
        display_title: "Monthly (Ethiopian Calendar 2018/2019 E.C.)",
        division_count: ecMonthlyPeriods.length,
        divisions: ecMonthlyPeriods,
        reporting_phase_open_days_before: 5,
        reporting_phase_close_days_after: 5,
        allow_grace_period: true,
        phase_description: "Monthly Ethiopian Calendar reporting (Hamle 01, 2018 – Sene 30, 2019 EC)",
        calendar_system: "EC",
        updated_by: adminUserId,
      },
      { transaction: t }
    );
    await NationalReportingPeriodConfig.create(
      {
        config_id: uuidv4(),
        frequency: "daily",
        display_title: "Daily (Ethiopian Calendar — Gold Reporting)",
        division_count: 365,
        divisions: [],
        reporting_phase_open_days_before: 0,
        reporting_phase_close_days_after: 1,
        allow_grace_period: true,
        phase_description: "Daily Ethiopian Calendar reporting for Gold KPIs",
        calendar_system: "EC",
        updated_by: adminUserId,
      },
      { transaction: t }
    );

    const regions = await Region.findAll({ transaction: t });
    const regionByCode = new Map(regions.map((r) => [r.code.toUpperCase(), r]));
    const officialRegionCodes = new Set(Object.values(REGION_NAME_MAP));

    let regionalConfigsUpdated = 0;
    for (const region of regions) {
      if (!officialRegionCodes.has(region.code.toUpperCase())) continue;
      let cfg = await RegionalPlanningConfiguration.findOne({
        where: { region_id: region.region_id },
        transaction: t,
      });
      const customPeriods = ecTwelveMainMonths.map((p, idx) => ({
        index: idx + 1,
        label: p.period_label,
        start_date: p.start_date,
        end_date: p.end_date,
      }));
      if (cfg) {
        await cfg.update(
          {
            breakdown_mode: "monthly",
            calendar_system: "EC",
            custom_periods: customPeriods,
          },
          { transaction: t }
        );
      } else {
        await RegionalPlanningConfiguration.create(
          {
            regional_planning_config_id: uuidv4(),
            region_id: region.region_id,
            min_duration_years: 1,
            max_duration_years: 10,
            breakdown_mode: "monthly",
            calendar_system: "EC",
            custom_periods: customPeriods,
          },
          { transaction: t }
        );
      }
      regionalConfigsUpdated++;
    }

    // ── E. Seed All Unique KPI Definitions ───────────────────────────────────
    console.log("[5/6] Seeding all deduplicated KPI definitions...");
    const reqByTitle = new Map();
    let dailyCount = 0;
    let monthlyCount = 0;

    for (let i = 0; i < allUniqueKpiTitles.length; i++) {
      const title = allUniqueKpiTitles[i];
      const meta = kpiUnitMap.get(title);
      const catCode = kpiCategoryMap.get(title) || fallbackAmharicCategory(title, categoriesByLabel);
      const freq = isGoldKpi(title) ? "daily" : "monthly";
      if (freq === "daily") dailyCount++;
      else monthlyCount++;

      const req = await NationalReportingRequirement.create(
        {
          requirement_id: uuidv4(),
          code: `NR-KPI-${String(i + 1).padStart(3, "0")}`,
          title: title.slice(0, 255),
          description: title,
          category: catCode,
          expected_unit: meta.unit,
          unit_category: meta.unit_category,
          frequency: freq,
          requires_numeric: true,
          requires_narrative: false,
          requires_evidence: false,
          effective_start_date: START_DATE_GC,
          effective_end_date: END_DATE_GC,
          calendar_system: "EC",
          is_active: true,
          version_number: 1,
          created_by: adminUserId,
          updated_by: adminUserId,
        },
        { transaction: t }
      );
      reqByTitle.set(title, req);
    }

    // ── F. Seed All Deduplicated Regional Assignments ────────────────────────
    console.log("[6/6] Seeding all regional KPI assignments...");
    let assignmentsCreated = 0;
    let assignmentsWithTargets = 0;
    const perRegionCounts = {};

    for (const pair of assignmentMap.values()) {
      const region = regionByCode.get(pair.regionCode);
      const req = reqByTitle.get(pair.kpiTitle);
      if (!region || !req) continue;

      const periodTargets = {};
      let computedSum = 0;
      let hasMonthly = false;

      if (pair.monthlyTargets) {
        JSON_MONTH_KEYS.forEach((mKey, idx) => {
          const rawVal = pair.monthlyTargets[mKey];
          if (rawVal !== undefined && rawVal !== null && !isNaN(Number(rawVal))) {
            const numVal = Number(rawVal);
            hasMonthly = true;
            computedSum += numVal;
            const ecMonth = ecTwelveMainMonths[idx];
            periodTargets[`Division ${idx + 1}`] = numVal;
            periodTargets[`Month ${idx + 1}`] = numVal;
            periodTargets[String(idx + 1)] = numVal;
            if (ecMonth) {
              periodTargets[ecMonth.period_label] = numVal;
            }
          }
        });
        // Pagume 2018 EC (5 days) initialized to 0 if monthly targets exist
        const pagume = ecMonthlyPeriods.find((p) => p.period_label.startsWith("Pagume"));
        if (pagume && hasMonthly) {
          periodTargets[pagume.period_label] = 0;
        }
      }

      const annualTarget =
        pair.annualTarget !== null && pair.annualTarget !== undefined
          ? pair.annualTarget
          : hasMonthly
          ? Math.round(computedSum * 10000) / 10000
          : null;

      if (annualTarget !== null || hasMonthly) assignmentsWithTargets++;

      await NationalReportingAssignment.create(
        {
          assignment_id: uuidv4(),
          requirement_id: req.requirement_id,
          region_id: region.region_id,
          is_mandatory: true,
          annual_target: annualTarget,
          period_targets: periodTargets,
          effective_start_date: START_DATE_GC,
          effective_end_date: END_DATE_GC,
          frequency_override: req.frequency, // 'daily' for gold, 'monthly' for others
          calendar_system_override: "EC",
          status: "active",
          assigned_by: adminUserId,
          assigned_at: new Date(),
        },
        { transaction: t }
      );

      assignmentsCreated++;
      perRegionCounts[pair.regionCode] = (perRegionCounts[pair.regionCode] || 0) + 1;
    }

    await t.commit();

    console.log("\n==============================================================================");
    console.log("SEEDING COMPLETE");
    console.log("==============================================================================");
    console.log(`Amharic Categories Created : ${amharicCategories.length}`);
    console.log(`Units Created              : ${createdUnits.size}`);
    console.log(`Unique KPIs Created        : ${allUniqueKpiTitles.length} (daily/gold: ${dailyCount}, monthly: ${monthlyCount})`);
    console.log(`Regional Configs Updated   : ${regionalConfigsUpdated} (EC, breakdown_mode = monthly)`);
    console.log(`Regional Assignments Total : ${assignmentsCreated} (with targets: ${assignmentsWithTargets})`);
    console.log("Per-Region Breakdown:");
    Object.keys(perRegionCounts)
      .sort()
      .forEach((rc) => console.log(`  ${rc}: ${perRegionCounts[rc]}`));
    console.log("==============================================================================");
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error("[FATAL] National reporting re-seed failed:", err);
    process.exit(1);
  }
}

seedAllNationalReporting();
