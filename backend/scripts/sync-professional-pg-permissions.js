"use strict";

/**
 * Idempotently sync TEST_PERMISSION_GROUPS → permission_group_permissions.
 * Run after updating professionalTestUsersConstants.js.
 */
const {
  TEST_PERMISSION_GROUPS,
} = require("../config/professionalTestUsersConstants");
const db = require("../models");

async function findPermissionId(resource, action) {
  const [rows] = await db.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action AND is_active = true LIMIT 1`,
    { replacements: { resource, action } }
  );
  return rows[0]?.permission_id || null;
}

async function syncGroup(group) {
  const now = new Date();
  const groupId = group.permission_group_id;
  const desired = new Set();
  const added = [];
  const missing = [];

  for (const [resource, actions] of Object.entries(group.permissions)) {
    for (const action of actions) {
      const permissionId = await findPermissionId(resource, action);
      if (!permissionId) {
        missing.push(`${resource}:${action}`);
        continue;
      }
      desired.add(permissionId);

      const [linked] = await db.sequelize.query(
        `SELECT permission_group_id FROM permission_group_permissions
         WHERE permission_group_id = :groupId AND permission_id = :permissionId LIMIT 1`,
        { replacements: { groupId, permissionId } }
      );
      if (linked.length) continue;

      await db.sequelize.query(
        `INSERT INTO permission_group_permissions
           (permission_group_id, permission_id, created_at)
         VALUES (:groupId, :permissionId, :now)`,
        { replacements: { groupId, permissionId, now } }
      );
      added.push(`${resource}:${action}`);
    }
  }

  const managedResources = Object.keys(group.permissions);
  if (managedResources.length) {
    const [currentLinks] = await db.sequelize.query(
      `SELECT pgp.permission_id, p.resource, p.action
       FROM permission_group_permissions pgp
       JOIN permissions p ON p.permission_id = pgp.permission_id
       WHERE pgp.permission_group_id = :groupId
         AND p.resource IN (:resources)`,
      { replacements: { groupId, resources: managedResources } }
    );

    for (const link of currentLinks) {
      if (!desired.has(link.permission_id)) {
        await db.sequelize.query(
          `DELETE FROM permission_group_permissions
           WHERE permission_group_id = :groupId AND permission_id = :permissionId`,
          { replacements: { groupId, permissionId: link.permission_id } }
        );
        console.log(
          `  removed stale ${link.resource}:${link.action} from ${group.name}`
        );
      }
    }
  }

  console.log(`${group.name}:`);
  if (added.length) console.log("  added:", added.join(", "));
  else console.log("  added: (none — already synced)");
  if (missing.length) console.log("  missing perms in DB:", missing.join(", "));

  const [final] = await db.sequelize.query(
    `SELECT p.resource, p.action
     FROM permission_group_permissions pgp
     JOIN permissions p ON p.permission_id = pgp.permission_id
     WHERE pgp.permission_group_id = :groupId
     ORDER BY p.resource, p.action`,
    { replacements: { groupId } }
  );
  console.log(
    "  matrix:",
    final.map((r) => `${r.resource}:${r.action}`).join(", ")
  );
}

(async () => {
  try {
    for (const group of TEST_PERMISSION_GROUPS) {
      await syncGroup(group);
    }
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
