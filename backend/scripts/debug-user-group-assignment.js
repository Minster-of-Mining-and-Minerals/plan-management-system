"use strict";

const { sequelize, User, PermissionGroup, GovernmentStructure } = require("../models");

const USER_EMAIL =
  "alt-mom.alt-mom-minister-chief-executive-officer-planning-monitoring-and-evaluation-executive-officer-head@mom-demo.et";
const ALT_MOM = "10000000-0000-4000-8000-000000000004";

async function main() {
  const user = await User.findOne({
    where: { email: USER_EMAIL },
    attributes: ["user_id", "email", "full_name", "government_structure_id", "internal_structure_id", "is_active"],
  });

  console.log("=== User ===");
  if (!user) {
    console.log("NOT FOUND:", USER_EMAIL);
    const partial = await sequelize.query(
      `SELECT email, full_name FROM users WHERE email ILIKE :q LIMIT 5`,
      {
        replacements: { q: "%planning-monitoring-and-evaluation%" },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    console.log("Similar emails:", partial);
  } else {
    const structure = user.government_structure_id
      ? await GovernmentStructure.findByPk(user.government_structure_id, {
          attributes: ["government_structure_id", "name", "parent_id"],
        })
      : null;
    console.log({
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      is_active: user.is_active,
      government_structure_id: user.government_structure_id,
      structure_name: structure?.name,
      structure_parent_id: structure?.parent_id,
      internal_structure_id: user.internal_structure_id,
    });
  }

  const groups = await sequelize.query(
    `SELECT pg.permission_group_id, pg.name, pg.group_kind, pg.is_active,
            (SELECT COUNT(*)::int FROM permission_group_permissions pgp WHERE pgp.permission_group_id = pg.permission_group_id) AS perm_count
     FROM permission_groups pg
     WHERE pg.name ILIKE '%plan management%'
     ORDER BY pg.name`,
    { type: sequelize.QueryTypes.SELECT }
  );

  console.log("\n=== Plan Management group(s) ===");
  console.log(JSON.stringify(groups, null, 2));

  for (const g of groups) {
    const links = await sequelize.query(
      `SELECT gs.government_structure_id, gs.name
       FROM government_structure_permission_groups gspg
       JOIN government_structures gs ON gs.government_structure_id = gspg.government_structure_id
       WHERE gspg.permission_group_id = :gid`,
      { replacements: { gid: g.permission_group_id }, type: sequelize.QueryTypes.SELECT }
    );
    const members = await sequelize.query(
      `SELECT u.email, u.government_structure_id, gs.name AS structure_name
       FROM user_permission_groups upg
       JOIN users u ON u.user_id = upg.user_id
       LEFT JOIN government_structures gs ON gs.government_structure_id = u.government_structure_id
       WHERE upg.permission_group_id = :gid`,
      { replacements: { gid: g.permission_group_id }, type: sequelize.QueryTypes.SELECT }
    );
    console.log(`\n  Links for "${g.name}":`, links);
    console.log(`  Members:`, members);

    if (user) {
      const match = links.some((l) => l.government_structure_id === user.government_structure_id);
      const altMomMatch = links.some((l) => l.government_structure_id === ALT_MOM);
      console.log(`  User structure matches linked structure: ${match}`);
      console.log(`  Group linked to Alt MoM canonical id: ${altMomMatch}`);
      console.log(`  User on Alt MoM canonical id: ${user.government_structure_id === ALT_MOM}`);
    }
  }

  if (user) {
    const existing = await sequelize.query(
      `SELECT pg.name FROM user_permission_groups upg
       JOIN permission_groups pg ON pg.permission_group_id = upg.permission_group_id
       WHERE upg.user_id = :uid`,
      { replacements: { uid: user.user_id }, type: sequelize.QueryTypes.SELECT }
    );
    console.log("\n=== User current permission groups ===");
    console.log(existing);
  }

  // Check internal structure vs government structure mismatch
  if (user?.internal_structure_id) {
    const dept = await sequelize.query(
      `SELECT internal_structure_id, name, government_structure_id FROM internal_structures
       WHERE internal_structure_id = :id`,
      { replacements: { id: user.internal_structure_id }, type: sequelize.QueryTypes.SELECT }
    );
    console.log("\n=== User department ===");
    console.log(dept[0]);
    if (dept[0] && dept[0].government_structure_id !== user.government_structure_id) {
      console.log("MISMATCH: user.government_structure_id != department.government_structure_id");
    }
  }

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
