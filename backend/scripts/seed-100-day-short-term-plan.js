"use strict";

/**
 * Seeds the 3-Month (100-Day) Short-Term Plan scenario for MOM, EGSI, and MIDI
 * directly from:
 *  - backend/short-term-plan/Final 100 day action plan.xls
 *  - backend/short-term-plan/Hidar 2nd week 100 day all sector report.xls
 */
const path = require("path");
const XLSX = require("xlsx");
const {
  ShortTermPlan,
  ShortTermKpi,
  ShortTermKpiAssignment,
  ShortTermPeriodReport,
  GovernmentStructure,
  InternalStructure,
  sequelize,
} = require("../models");
const { convertEthiopianToGregorian } = require("../utils/calendarUtils");

function parseNum(val) {
  if (val === null || val === undefined || String(val).trim() === "") return null;
  const n = Number(String(val).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

async function seed100DayShortTermPlan() {
  const planPath = path.join(__dirname, "../short-term-plan/Final 100 day action plan.xls");
  const reportPath = path.join(__dirname, "../short-term-plan/Hidar 2nd week 100 day all sector report.xls");

  const planWb = XLSX.readFile(planPath);
  const reportWb = XLSX.readFile(reportPath);

  const sectors = await GovernmentStructure.findAll();
  const internalDepts = await InternalStructure.findAll();

  // Hidar 1, 2019 EC to Tir 30, 2019 EC (3 Ethiopian months)
  const startGc = convertEthiopianToGregorian(2019, 3, 1).dateStr;
  const endGc = convertEthiopianToGregorian(2019, 5, 30).dateStr;

  const t = await sequelize.transaction();
  try {
    for (const sheetName of planWb.SheetNames) {
      const cleanSheet = sheetName.trim();
      const matchedSector =
        sectors.find((s) => s.name.toLowerCase().includes(cleanSheet.toLowerCase())) ||
        sectors[0];
      if (!matchedSector) continue;

      const planTitle = `${cleanSheet} — 100-Day Action Plan (Hidar – Tir 2019 EC)`;
      let plan = await ShortTermPlan.findOne({ where: { title: planTitle }, transaction: t });
      if (!plan) {
        plan = await ShortTermPlan.create(
          {
            title: planTitle,
            description: `3-month short-term operational plan seeded from Final 100 day action plan.xls (${cleanSheet})`,
            government_structure_id: matchedSector.government_structure_id,
            calendar_system: "EC",
            start_date: startGc,
            end_date: endGc,
            duration_months: 3,
            default_frequency: "weekly",
            status: "active",
          },
          { transaction: t }
        );
      }

      const planRows = XLSX.utils.sheet_to_json(planWb.Sheets[sheetName], { header: 1, defval: "" });
      const reportRows = reportWb.Sheets[sheetName]
        ? XLSX.utils.sheet_to_json(reportWb.Sheets[sheetName], { header: 1, defval: "" })
        : [];

      let kpiSeq = 1;
      for (let r = 3; r < planRows.length; r += 1) {
        const row = planRows[r];
        const title = String(row[1] || "").trim();
        const totalTarget = parseNum(row[3]);
        if (!title || totalTarget === null) continue;

        const code = `${cleanSheet.toUpperCase()}-100D-${String(kpiSeq).padStart(2, "0")}`;
        kpiSeq += 1;

        const existingKpi = await ShortTermKpi.findOne({
          where: { short_term_plan_id: plan.short_term_plan_id, code },
          transaction: t,
        });
        if (existingKpi) continue;

        const unit = String(row[2] || "Number").trim();
        const kpi = await ShortTermKpi.create(
          {
            short_term_plan_id: plan.short_term_plan_id,
            code,
            title,
            unit,
            total_target: totalTarget,
            target_mode: unit.includes("መቶኛ") ? "continuous" : "cumulative",
            reporting_frequency: "weekly",
            requires_numeric: true,
            requires_narrative: true,
            allow_narrative_only_updates: true,
            order_index: kpiSeq,
          },
          { transaction: t }
        );

        // Map monthly & weekly target distribution from Excel columns:
        // Col 5..8: Hidar W1..W4; Col 10..13: Tahsas W1..W4; Col 15..18: Tir W1..W4
        const periodTargets = {};
        const weekCols = [
          ["Hidar - Week 1", 5],
          ["Hidar - Week 2", 6],
          ["Hidar - Week 3", 7],
          ["Hidar - Week 4", 8],
          ["Tahsas - Week 1", 10],
          ["Tahsas - Week 2", 11],
          ["Tahsas - Week 3", 12],
          ["Tahsas - Week 4", 13],
          ["Tir - Week 1", 15],
          ["Tir - Week 2", 16],
          ["Tir - Week 3", 17],
          ["Tir - Week 4", 18],
        ];
        for (const [label, colIdx] of weekCols) {
          const val = parseNum(row[colIdx]);
          if (val !== null) periodTargets[label] = val;
        }

        const ownerLabel = String(row[19] || cleanSheet).trim();
        const matchedDept = internalDepts.find(
          (d) =>
            d.government_structure_id === matchedSector.government_structure_id &&
            ownerLabel.toLowerCase().includes(d.name.toLowerCase().slice(0, 6))
        );

        const assignment = await ShortTermKpiAssignment.create(
          {
            short_term_kpi_id: kpi.short_term_kpi_id,
            government_structure_id: matchedSector.government_structure_id,
            internal_structure_id: matchedDept?.internal_structure_id || null,
            assignee_label: ownerLabel,
            allocated_target: totalTarget,
            period_targets: periodTargets,
          },
          { transaction: t }
        );

        // Seed Hidar Week 2 report if present in report workbook
        const repRow = reportRows.find((rr) => String(rr[1] || "").trim() === title);
        if (repRow) {
          const actual = parseNum(repRow[6]);
          const narrative = String(repRow[8] || "").trim();
          if (actual !== null || narrative) {
            const w2Start = convertEthiopianToGregorian(2019, 3, 8).dateStr;
            const w2End = convertEthiopianToGregorian(2019, 3, 15).dateStr;
            const planned = periodTargets["Hidar - Week 2"] ?? null;
            await ShortTermPeriodReport.create(
              {
                assignment_id: assignment.assignment_id,
                short_term_kpi_id: kpi.short_term_kpi_id,
                period_index: 2,
                period_label: "Hidar - Week 2",
                period_start_date: w2Start,
                period_end_date: w2End,
                submission_type: actual !== null ? "actual_and_narrative" : "narrative_only",
                planned_target: planned,
                reported_actual: actual,
                achievement_percent:
                  actual !== null && planned && planned > 0
                    ? Math.min(100, Math.round((actual / planned) * 1000) / 10)
                    : null,
                narrative: narrative || null,
              },
              { transaction: t }
            );
          }
        }
      }
    }

    await t.commit();
    console.log("Successfully seeded 100-Day Short-Term Plans from Excel.");
  } catch (err) {
    await t.rollback();
    console.error("Failed to seed 100-Day Short-Term Plans:", err);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  seed100DayShortTermPlan().then(() => process.exit());
}

module.exports = { seed100DayShortTermPlan };
