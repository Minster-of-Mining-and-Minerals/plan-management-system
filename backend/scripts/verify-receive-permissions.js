"use strict";

const db = require("../models");

async function main() {
  const [perms] = await db.sequelize.query(
    `SELECT resource, action FROM permissions
     WHERE resource = 'patients' AND action LIKE 'receive%'
     ORDER BY action`
  );
  console.log("Permissions:", perms);

  for (const email of [
    "doctor_1@test.novacure",
    "lab_1@test.novacure",
    "reception_1@test.novacure",
  ]) {
    const [rows] = await db.sequelize.query(
      `SELECT p.action
       FROM users u
       JOIN user_permission_groups upg ON u.user_id = upg.user_id
       JOIN permission_group_permissions pgp ON upg.permission_group_id = pgp.permission_group_id
       JOIN permissions p ON pgp.permission_id = p.permission_id
       WHERE u.email = :email AND p.resource = 'patients' AND p.action LIKE 'receive%'`,
      { replacements: { email } }
    );
    console.log(`${email}:`, rows.map((r) => r.action));
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
