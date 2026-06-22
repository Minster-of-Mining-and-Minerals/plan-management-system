"use strict";
require("dotenv").config();
const { sequelize } = require("../models");

(async () => {
  const plans = await sequelize.query(
    `SELECT pv.plan_version_id, pv.draft_name, gs.name AS sector, pv.start_year, pv.planning_duration_years
     FROM plan_versions pv
     LEFT JOIN government_structures gs ON gs.government_structure_id = pv.government_structure_id
     WHERE pv.version_kind = 'master'
     ORDER BY pv.created_at DESC
     LIMIT 15`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log("PLANS:", JSON.stringify(plans, null, 2));

  const sectors = await sequelize.query(
    `SELECT government_structure_id, name, parent_id, level FROM government_structures ORDER BY level, name`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log("SECTORS:", JSON.stringify(sectors, null, 2));

  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
