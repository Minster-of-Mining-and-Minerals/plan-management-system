"use strict";

const { sequelize, Role, RolePermission, Permission, User } = require("../models");

async function run() {
  console.log("=== PERMISSION & ROLE AUDIT ===");

  const roles = await Role.findAll({
    include: [
      {
        model: RolePermission,
        as: "rolePermissions",
        include: [
          {
            model: Permission,
            as: "permission",
          },
        ],
      },
    ],
  });

  console.log("\n--- ROLES & ASSIGNED PERMISSIONS ---");
  for (const r of roles) {
    const validPerms = r.rolePermissions.filter((rp) => rp.permission);
    console.log(
      `Role: "${r.name}" | ID: ${r.role_id} | Scope: ${r.scope} | IsActive: ${r.is_active} | Permissions Count: ${validPerms.length}`
    );
  }

  const [permCounts] = await sequelize.query(`
    SELECT COUNT(*) AS total_permissions,
           COUNT(DISTINCT CONCAT(LOWER(resource), ':', LOWER(action))) AS unique_canonical_permissions
    FROM permissions;
  `);
  console.log("\n--- PERMISSION STATS ---", permCounts[0]);

  const [missing] = await sequelize.query(`
    SELECT p.permission_id, p.resource, p.action
    FROM permissions p
    WHERE p.permission_id NOT IN (
      SELECT rp.permission_id FROM role_permissions rp WHERE rp.role_id = '00000000-0000-4000-8000-000000000002'
    );
  `);
  console.log("\n--- MISSING FROM SUPER ADMIN ---", missing);

  const [distinctResources] = await sequelize.query(`
    SELECT LOWER(resource) as resource, COUNT(*) as action_count
    FROM permissions
    GROUP BY LOWER(resource)
    ORDER BY LOWER(resource);
  `);
  console.log("\n--- RESOURCES IN DB ---");
  distinctResources.forEach((res) => console.log(`  ${res.resource}: ${res.action_count} actions`));

  // Inspect users who have administrative roles or federal scope
  const users = await User.findAll({
    where: {
      region_id: null,
      company_id: null,
      purchasing_center_id: null,
    },
    include: [{ model: Role, as: "roles" }],
    limit: 10,
  });

  console.log("\n--- FEDERAL USERS ---");
  users.forEach((u) => {
    console.log(`User: ${u.email} (${u.full_name}) | Roles: ${u.roles.map((r) => r.name).join(", ")}`);
  });

  const { SystemSetting } = require("../models");
  const settings = await SystemSetting.findAll();
  console.log("\n--- SYSTEM SETTINGS ---", settings.map((s) => s.toJSON()));

  const [domainPerms] = await sequelize.query(`
    SELECT permission_id, resource, action, permission_tier
    FROM permissions
    WHERE resource ILIKE '%gold%' OR resource ILIKE '%purchas%' OR resource ILIKE '%region%' OR resource ILIKE '%compan%' OR resource ILIKE '%asm%'
    ORDER BY resource, action;
  `);
  console.log("\n--- DOMAIN PERMISSIONS (Regional, Gold, Company) ---");
  domainPerms.forEach((p) => {
    console.log(`  ${p.resource}:${p.action} [tier: ${p.permission_tier}] ID: ${p.permission_id}`);
  });

  process.exit(0);
}

run().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
