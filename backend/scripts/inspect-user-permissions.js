"use strict";

const db = require("../models");
const {
  permissionResolutionIncludes,
  plainUserHasPermission,
} = require("../services/userPermissionService");

async function inspectUser(email) {
  const user = await db.User.findOne({
    where: { email },
    include: permissionResolutionIncludes(),
  });

  if (!user) {
    console.log(`User not found: ${email}`);
    return;
  }

  const plain = user.get({ plain: true });
  console.log(`\n=== ${plain.email} (${plain.full_name}) ===\n`);

  console.log("Roles:");
  for (const role of plain.roles || []) {
    const perms = (role.rolePermissions || [])
      .map((rp) => rp.permission)
      .filter(Boolean)
      .map((p) => `${p.resource}:${p.action}`);
    console.log(`  - ${role.name}`);
    const diagnosis = perms.filter((p) => p.startsWith("diagnosis"));
    console.log(`    diagnosis_*: ${diagnosis.join(", ") || "(none)"}`);
    console.log(`    all (${perms.length}): ${perms.join(", ")}`);
  }

  console.log("\nPermission groups:");
  for (const group of plain.permissionGroups || []) {
    const perms = (group.permissions || []).map(
      (p) => `${p.resource}:${p.action}`
    );
    console.log(`  - ${group.name}`);
    const diagnosis = perms.filter((p) => p.startsWith("diagnosis"));
    console.log(`    diagnosis_*: ${diagnosis.join(", ") || "(none)"}`);
  }

  const checks = [
    ["diagnosis_forms", "read"],
    ["diagnosis_forms", "create"],
    ["diagnosis_forms", "update"],
    ["clinical_suggestion", "read"],
  ];
  console.log("\nEffective permission checks:");
  for (const [resource, action] of checks) {
    console.log(
      `  ${resource}:${action} => ${plainUserHasPermission(plain, resource, action)}`
    );
  }

  const sidebarNeeds = ["read", "create", "update"].map((action) =>
    plainUserHasPermission(plain, "diagnosis_forms", action)
  );
  console.log(
    `\nSidebar Diagnosis/Medical Diagrams visible: ${sidebarNeeds.some(Boolean)}`
  );
}

inspectUser("reception@ophthalmology.demo")
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
