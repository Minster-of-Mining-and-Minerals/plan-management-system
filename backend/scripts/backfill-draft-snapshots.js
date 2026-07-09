"use strict";

/**
 * Backfill owned plan-rule and planning-configuration snapshots for existing
 * master drafts that still point at live global/sector templates.
 *
 * Usage: node backend/scripts/backfill-draft-snapshots.js
 */

require("dotenv").config();

const { Op } = require("sequelize");
const { PlanVersion, PlanRule, PlanningConfiguration, sequelize } = require("../models");
const { attachDraftSnapshotsToPlanVersion } = require("../services/planVersionSnapshotService");

async function main() {
  const masters = await PlanVersion.findAll({
    where: {
      version_kind: "master",
      status: "draft",
      [Op.or]: [
        { planning_configuration_id: null },
        sequelize.literal(`
          NOT EXISTS (
            SELECT 1 FROM planning_configurations pc
            WHERE pc.planning_configuration_id = "PlanVersion"."planning_configuration_id"
              AND pc.owned_by_plan_version_id = "PlanVersion"."plan_version_id"
          )
        `),
        sequelize.literal(`
          "PlanVersion"."plan_rule_id" IS NULL OR NOT EXISTS (
            SELECT 1 FROM plan_rules pr
            WHERE pr.plan_rule_id = "PlanVersion"."plan_rule_id"
              AND pr.owned_by_plan_version_id = "PlanVersion"."plan_version_id"
          )
        `),
      ],
    },
    order: [["created_at", "ASC"]],
  });

  console.log(`Found ${masters.length} master draft(s) needing snapshot backfill.`);

  let updated = 0;
  for (const master of masters) {
    const t = await sequelize.transaction();
    try {
      const refreshed = await attachDraftSnapshotsToPlanVersion(master, t);

      const annualVersions = await PlanVersion.findAll({
        where: {
          parent_plan_version_id: refreshed.plan_version_id,
          version_kind: "annual",
        },
        transaction: t,
      });

      for (const annual of annualVersions) {
        await annual.update(
          {
            plan_rule_id: refreshed.plan_rule_id,
            planning_configuration_id: refreshed.planning_configuration_id,
          },
          { transaction: t }
        );

        await PlanVersion.update(
          {
            plan_rule_id: refreshed.plan_rule_id,
            planning_configuration_id: refreshed.planning_configuration_id,
          },
          {
            where: {
              parent_plan_version_id: annual.plan_version_id,
              version_kind: "execution_period",
            },
            transaction: t,
          }
        );
      }

      await t.commit();
      updated += 1;
      console.log(`Backfilled ${master.plan_version_id} (${master.draft_name})`);
    } catch (error) {
      await t.rollback();
      console.error(`Failed ${master.plan_version_id}: ${error.message}`);
    }
  }

  console.log(`Done. Updated ${updated} of ${masters.length} draft(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
