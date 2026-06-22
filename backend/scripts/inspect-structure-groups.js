"use strict";
const { sequelize } = require("../models");

(async () => {
  const rows = await sequelize.query(
    `SELECT gs.government_structure_id AS child_id, gs.name AS child,
            p.government_structure_id AS parent_id, p.name AS parent,
            COUNT(gspg.permission_group_id)::int AS child_groups,
            (SELECT COUNT(*)::int FROM government_structure_permission_groups g2
             WHERE g2.government_structure_id = p.government_structure_id) AS parent_groups
     FROM government_structures gs
     JOIN government_structures p ON p.government_structure_id = gs.parent_id
     LEFT JOIN government_structure_permission_groups gspg
       ON gspg.government_structure_id = gs.government_structure_id
     WHERE gs.is_active = true
     GROUP BY gs.government_structure_id, gs.name, p.government_structure_id, p.name
     ORDER BY child_groups DESC, parent_groups DESC`,
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log(JSON.stringify(rows, null, 2));

  const [groups] = await sequelize.query(
    "SELECT COUNT(*)::int AS c FROM permission_groups",
    { type: sequelize.QueryTypes.SELECT }
  );
  const [links] = await sequelize.query(
    "SELECT COUNT(*)::int AS c FROM government_structure_permission_groups",
    { type: sequelize.QueryTypes.SELECT }
  );
  const roleScopes = await sequelize.query(
    "SELECT scope, COUNT(*)::int AS c FROM roles WHERE deleted_at IS NULL GROUP BY scope ORDER BY scope",
    { type: sequelize.QueryTypes.SELECT }
  );
  console.log("\npermission_groups:", groups.c);
  console.log("structure-group links:", links.c);
  console.log("roles by scope:", roleScopes);

  await sequelize.close();
})();
