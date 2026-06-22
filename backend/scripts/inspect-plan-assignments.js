"use strict";
require("dotenv").config();
const { sequelize } = require("../models");

const PLAN_ID = process.argv[2] || "eab1dbd8-f448-41ee-91e4-6a58f5058807";

(async () => {
  const nodes = await sequelize.query(
    `SELECT plan_node_id, parent_id, type, title, level, "order"
     FROM plan_nodes WHERE plan_version_id = :id AND is_active = true
     ORDER BY level, "order"`,
    { replacements: { id: PLAN_ID }, type: sequelize.QueryTypes.SELECT }
  );
  console.log("NODES", nodes.length);
  nodes.forEach((n) => console.log(`  L${n.level} ${n.type} ${n.title}`));

  const ext = await sequelize.query(
    `SELECT ea.plan_node_id, pn.title, pn.type, gs.name AS sector
     FROM external_assignments ea
     JOIN plan_nodes pn ON pn.plan_node_id = ea.plan_node_id
     JOIN government_structures gs ON gs.government_structure_id = ea.government_structure_id
     WHERE pn.plan_version_id = :id AND ea.is_active = true`,
    { replacements: { id: PLAN_ID }, type: sequelize.QueryTypes.SELECT }
  );
  console.log("\nEXTERNAL", ext.length);
  ext.forEach((r) => console.log(`  ${r.type} "${r.title}" -> ${r.sector}`));

  const int = await sequelize.query(
    `SELECT ia.plan_node_id, pn.title, pn.type, pn.level, ist.name AS dept, ist.level AS dept_level,
            paa.code AS action, u.full_name, u.email
     FROM internal_assignments ia
     JOIN plan_nodes pn ON pn.plan_node_id = ia.plan_node_id
     JOIN internal_structures ist ON ist.internal_structure_id = ia.internal_structure_id
     JOIN plan_assignment_actions paa ON paa.assignment_action_id = ia.action_id
     LEFT JOIN users u ON u.user_id = ia.user_id
     WHERE pn.plan_version_id = :id AND ia.is_active = true
     ORDER BY pn.level, pn."order", ist.level`,
    { replacements: { id: PLAN_ID }, type: sequelize.QueryTypes.SELECT }
  );
  console.log("\nINTERNAL", int.length);
  int.forEach((r) =>
    console.log(
      `  L${r.level} ${r.type} "${r.title}" | dept L${r.dept_level} ${r.dept} | ${r.action} | ${r.full_name || "dept-only"}`
    )
  );

  await sequelize.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
