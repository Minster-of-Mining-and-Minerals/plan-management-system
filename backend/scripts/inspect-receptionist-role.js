"use strict";

const db = require("../models");

async function inspectReceptionistRole() {
  const [roles] = await db.sequelize.query(
    `SELECT role_id, name FROM roles WHERE name ILIKE '%reception%' ORDER BY name`
  );
  console.log("Reception-related roles:", roles);

  for (const role of roles) {
    const [rows] = await db.sequelize.query(
      `SELECT rp.role_permission_id, rp.is_active AS rp_active,
              p.resource, p.action, p.is_active AS perm_active
       FROM role_permissions rp
       JOIN permissions p ON p.permission_id = rp.permission_id
       WHERE rp.role_id = :roleId
         AND p.resource = 'diagnosis_forms'
       ORDER BY p.action, rp.role_permission_id`,
      { replacements: { roleId: role.role_id } }
    );
    console.log(`\n${role.name} (${role.role_id}) diagnosis_forms links:`);
    console.log(rows.length ? rows : "(none)");
  }

  const user = await db.User.findOne({
    where: { email: "reception@ophthalmology.demo" },
    include: [{ model: db.Role, as: "roles", through: { attributes: [] } }],
  });
  console.log("\nUser roles:", user?.roles?.map((r) => ({ id: r.role_id, name: r.name })));
}

inspectReceptionistRole()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
