#!/usr/bin/env node
"use strict";

/**
 * Replaces legacy migration history with the squashed baseline entry.
 * Run ONLY when the database schema already matches the current application models.
 *
 * Usage: node scripts/squash-sequelize-meta.js [--dry-run]
 */

require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const { Sequelize } = require("sequelize");
const config = require("../config/config.js")[process.env.NODE_ENV || "development"];

const LEGACY_MIGRATIONS = [
  "20260101000001-create-permissions-and-rbac.js",
  "20260101000002-create-users.js",
  "20260101000003-create-user-rbac-junctions.js",
  "20260101000004-create-departments-and-user-titles.js",
  "20260101000005-create-user-profiles.js",
  "20260101000006-create-form-field-system.js",
  "20260101000007-create-system-branding-and-audit-logs.js",
  "20260101000008-create-attachments.js",
  "20260102000009-add-slip-config-to-system-branding.js",
  "20260103000001-create-patient-schedules.js",
  "20260104000001-create-staff-appointments-and-notifications.js",
  "20260105000001-create-diagnosis-form-system.js",
  "20260106000001-create-diagnosis-templates.js",
  "20260107000001-ensure-diagnosis-template-schema.js",
  "20260108000001-add-notification-category.js",
  "20260109000001-create-medical-workflow.js",
  "20260528000001-create-prescription-ecosystem.js",
  "20260605000007-add-prescription-signature-to-branding.js",
  "20260605000008-clear-logo-from-prescription-signatures.js",
  "20260608000001-create-pharmacy-ecosystem.js",
  "20260609000001-create-prescription-pharmacy-forwards.js",
  "20260610000001-pharmacy-forward-lifecycle.js",
  "20260611000001-allow-multiple-staff-diagnosis-forms.js",
  "20260612000001-create-medical-certificate-ecosystem.js",
  "20260612000001-create-medical-diagrams.js",
  "20260613000001-create-medical-diagram-categories.js",
  "20260614000001-create-clinical-suggestions.js",
  "20260615000001-seed-ophthalmology-diagnosis-template.js",
  "20260706000001-seed-ophthalmology-lab-report-template.js",
  "20260707000001-upgrade-ophthalmology-form-engine-v2.js",
  "20260712000001-create-billing-ecosystem.js",
  "20260712000002-create-cashier-ecosystem.js",
];

const BASELINE = "20260101000000-complete-database-schema.js";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const sequelize = new Sequelize(
    config.database,
    config.username,
    config.password,
    { host: config.host, port: config.port, dialect: config.dialect, logging: false }
  );

  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query(`SELECT name FROM "SequelizeMeta" ORDER BY name`);
    const existing = new Set(rows.map((r) => r.name));

    if (existing.has(BASELINE) && LEGACY_MIGRATIONS.every((m) => !existing.has(m))) {
      console.log("Already squashed.");
      return;
    }

    if (dryRun) {
      console.log("Would remove:", LEGACY_MIGRATIONS.filter((m) => existing.has(m)).length);
      console.log("Would insert:", BASELINE);
      return;
    }

    await sequelize.transaction(async (t) => {
      for (const name of LEGACY_MIGRATIONS) {
        if (!existing.has(name)) continue;
        await sequelize.query(`DELETE FROM "SequelizeMeta" WHERE name = :name`, {
          replacements: { name },
          transaction: t,
        });
      }
      if (!existing.has(BASELINE)) {
        await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:name)`, {
          replacements: { name: BASELINE },
          transaction: t,
        });
      }
    });

    console.log(`Squashed ${LEGACY_MIGRATIONS.length} legacy entries → ${BASELINE}`);
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
