"use strict";

/**
 * Non-destructive reconfiguration script:
 * Updates all existing National Reporting KPI assignments and requirements in place
 * to use the Ethiopian Calendar (Hamle 1, 2018 - Sene 30, 2019 => 2026-07-08 to 2027-07-07)
 * and configures the reporting window to -5 days before period end through +5 days after.
 *
 * Does NOT delete or recreate any KPI or assignment.
 */

const { sequelize } = require("../models");

const EC_START_GC = "2026-07-08"; // Hamle 1, 2018 EC
const EC_END_GC = "2027-07-07";   // Sene 30, 2019 EC
const PHASE_CONFIG = {
  is_custom: true,
  open_days_before: 5,
  close_days_after: 5,
  allow_grace_period: true,
  phase_description: "Ethiopian Calendar (-5 days before month end to +5 days into next month)",
};

async function run() {
  const tx = await sequelize.transaction();
  try {
    const [beforeReq] = await sequelize.query(
      "SELECT COUNT(*)::int AS cnt FROM national_reporting_requirements WHERE deleted_at IS NULL",
      { transaction: tx }
    );
    const [beforeAsgn] = await sequelize.query(
      "SELECT COUNT(*)::int AS cnt FROM national_reporting_assignments WHERE deleted_at IS NULL",
      { transaction: tx }
    );

    await sequelize.query(
      `UPDATE national_reporting_requirements
       SET calendar_system = 'EC',
           effective_start_date = :startDate,
           effective_end_date = :endDate,
           updated_at = NOW()
       WHERE deleted_at IS NULL`,
      {
        replacements: { startDate: EC_START_GC, endDate: EC_END_GC },
        transaction: tx,
      }
    );

    await sequelize.query(
      `UPDATE national_reporting_assignments
       SET calendar_system_override = 'EC',
           effective_start_date = :startDate,
           effective_end_date = :endDate,
           reporting_phase_override = CAST(:phaseConfig AS jsonb),
           updated_at = NOW()
       WHERE deleted_at IS NULL`,
      {
        replacements: {
          startDate: EC_START_GC,
          endDate: EC_END_GC,
          phaseConfig: JSON.stringify(PHASE_CONFIG),
        },
        transaction: tx,
      }
    );

    const [afterReq] = await sequelize.query(
      "SELECT COUNT(*)::int AS cnt FROM national_reporting_requirements WHERE deleted_at IS NULL AND calendar_system = 'EC'",
      { transaction: tx }
    );
    const [afterAsgn] = await sequelize.query(
      "SELECT COUNT(*)::int AS cnt FROM national_reporting_assignments WHERE deleted_at IS NULL AND calendar_system_override = 'EC'",
      { transaction: tx }
    );

    await tx.commit();

    console.log("EC Reconfiguration Complete (Zero Deletions):");
    console.log(`  Requirements before: ${beforeReq[0].cnt}, EC-configured after: ${afterReq[0].cnt}`);
    console.log(`  Assignments before:  ${beforeAsgn[0].cnt}, EC-configured after: ${afterAsgn[0].cnt}`);
    console.log(`  EC Range: Hamle 1, 2018 - Sene 30, 2019 (${EC_START_GC} to ${EC_END_GC})`);
    console.log(`  Reporting Window: open_days_before=5 (-5), close_days_after=5 (+5)`);
    process.exit(0);
  } catch (err) {
    await tx.rollback();
    console.error("Failed to reconfigure national assignments:", err);
    process.exit(1);
  }
}

run();
