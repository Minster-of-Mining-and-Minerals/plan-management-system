"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

function normalizePermission(resource, action) {
  return {
    resource: String(resource).trim().toLowerCase(),
    action: String(action).trim().toLowerCase(),
  };
}

function permissionKey(resource, action) {
  const normalized = normalizePermission(resource, action);
  return `${normalized.resource}:${normalized.action}`;
}

/**
 * Insert permission if missing; return existing or new permission_id.
 */
async function ensurePermission(
  queryInterface,
  { resource, action, permission_tier = "standard", is_active = true },
  now = new Date()
) {
  const normalized = normalizePermission(resource, action);

  const existing = await queryInterface.sequelize.query(
    `SELECT permission_id
     FROM permissions
     WHERE lower(resource) = :resource AND lower(action) = :action
     LIMIT 1`,
    {
      replacements: normalized,
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) {
    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET resource = :resource,
           action = :action,
           permission_tier = :permission_tier,
           is_active = :is_active,
           updated_at = :now
       WHERE permission_id = :permissionId`,
      {
        replacements: {
          ...normalized,
          permission_tier,
          is_active,
          now,
          permissionId: existing[0].permission_id,
        },
      }
    );
    return existing[0].permission_id;
  }

  const permissionId = uuidv4();
  await queryInterface.bulkInsert("permissions", [
    {
      permission_id: permissionId,
      resource: normalized.resource,
      action: normalized.action,
      permission_tier,
      is_active,
      created_at: now,
      updated_at: now,
    },
  ]);

  return permissionId;
}

async function ensureRolePermission(queryInterface, roleId, permissionId, now = new Date()) {
  if (!roleId || !permissionId) return;

  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions
     WHERE role_id = :roleId AND permission_id = :permissionId
     LIMIT 1`,
    {
      replacements: { roleId, permissionId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) return;

  await queryInterface.bulkInsert("role_permissions", [
    {
      role_permission_id: uuidv4(),
      role_id: roleId,
      permission_id: permissionId,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

/**
 * Merge duplicate permissions (same resource+action) into the oldest row.
 */
async function dedupePermissions(queryInterface) {
  const duplicateGroups = await queryInterface.sequelize.query(
    `SELECT lower(resource) AS resource_key,
            lower(action) AS action_key,
            array_agg(permission_id ORDER BY created_at ASC, permission_id ASC) AS permission_ids
     FROM permissions
     GROUP BY lower(resource), lower(action)
     HAVING COUNT(*) > 1`,
    { type: QueryTypes.SELECT }
  );

  for (const group of duplicateGroups) {
    const permissionIds = group.permission_ids;
    const canonicalId = permissionIds[0];
    const duplicateIds = permissionIds.slice(1);

    for (const duplicateId of duplicateIds) {
      await queryInterface.sequelize.query(
        `UPDATE role_permissions rp
         SET permission_id = :canonicalId, updated_at = NOW()
         WHERE permission_id = :duplicateId
           AND NOT EXISTS (
             SELECT 1 FROM role_permissions existing
             WHERE existing.role_id = rp.role_id
               AND existing.permission_id = :canonicalId
           )`,
        { replacements: { canonicalId, duplicateId } }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM role_permissions WHERE permission_id = :duplicateId`,
        { replacements: { duplicateId } }
      );

      await queryInterface.sequelize.query(
        `DELETE FROM permission_group_permissions pgp
         WHERE permission_id = :duplicateId
           AND EXISTS (
             SELECT 1 FROM permission_group_permissions existing
             WHERE existing.permission_group_id = pgp.permission_group_id
               AND existing.permission_id = :canonicalId
           )`,
        { replacements: { canonicalId, duplicateId } }
      );

      await queryInterface.sequelize.query(
        `UPDATE permission_group_permissions
         SET permission_id = :canonicalId
         WHERE permission_id = :duplicateId`,
        { replacements: { canonicalId, duplicateId } }
      );

      await queryInterface.bulkDelete("permissions", { permission_id: duplicateId });
    }

    await queryInterface.sequelize.query(
      `UPDATE permissions
       SET resource = :resource, action = :action, updated_at = NOW()
       WHERE permission_id = :canonicalId`,
      {
        replacements: {
          resource: group.resource_key,
          action: group.action_key,
          canonicalId,
        },
      }
    );
  }

  return duplicateGroups.length;
}

module.exports = {
  normalizePermission,
  permissionKey,
  ensurePermission,
  ensureRolePermission,
  dedupePermissions,
};
