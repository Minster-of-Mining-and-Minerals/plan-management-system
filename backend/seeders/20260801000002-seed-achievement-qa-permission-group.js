"use strict";

const { v4: uuidv4 } = require("uuid");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const QA_GROUP_ID = "a1000000-0000-4000-8000-000000000001";

const QA_GROUP_PERMISSIONS = [
  { resource: "plan", action: "bypass_achievement_assignment" },
  { resource: "plan", action: "execute_achievement" },
  { resource: "plan", action: "approve_achievement" },
  { resource: "plan", action: "override_parent_achievement" },
];

async function findPermissionId(queryInterface, resource, action) {
  const rows = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions
     WHERE resource = :resource AND action = :action
     LIMIT 1`,
    {
      replacements: { resource, action },
      type: queryInterface.sequelize.QueryTypes.SELECT,
    }
  );
  return rows[0]?.permission_id ?? null;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existingGroup = await queryInterface.sequelize.query(
      `SELECT permission_group_id FROM permission_groups
       WHERE permission_group_id = :id OR name = :name
       LIMIT 1`,
      {
        replacements: { id: QA_GROUP_ID, name: "Achievement Workflow QA" },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    let groupId = existingGroup[0]?.permission_group_id ?? QA_GROUP_ID;

    if (existingGroup.length === 0) {
      await queryInterface.bulkInsert("permission_groups", [
        {
          permission_group_id: groupId,
          name: "Achievement Workflow QA",
          description:
            "Testers who may execute, approve, and override achievements without plan-tree assignment when the system bypass setting is enabled.",
          group_kind: "special",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    } else {
      await queryInterface.sequelize.query(
        `UPDATE permission_groups
         SET group_kind = 'special',
             description = :description,
             is_active = true,
             updated_at = :now
         WHERE permission_group_id = :id`,
        {
          replacements: {
            id: groupId,
            now,
            description:
              "Testers who may execute, approve, and override achievements without plan-tree assignment when the system bypass setting is enabled.",
          },
        }
      );
    }

    for (const perm of QA_GROUP_PERMISSIONS) {
      const permissionId = await findPermissionId(queryInterface, perm.resource, perm.action);
      if (!permissionId) {
        console.warn(`Skipping QA group link — permission missing: ${perm.resource}:${perm.action}`);
        continue;
      }

      const existingLink = await queryInterface.sequelize.query(
        `SELECT permission_group_id FROM permission_group_permissions
         WHERE permission_group_id = :groupId AND permission_id = :permissionId
         LIMIT 1`,
        {
          replacements: { groupId, permissionId },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (existingLink.length === 0) {
        await queryInterface.bulkInsert("permission_group_permissions", [
          {
            permission_group_id: groupId,
            permission_id: permissionId,
            created_at: now,
          },
        ]);
      }
    }

    const existingMembership = await queryInterface.sequelize.query(
      `SELECT id FROM user_permission_groups
       WHERE user_id = :userId AND permission_group_id = :groupId
       LIMIT 1`,
      {
        replacements: { userId: ADMIN_USER_ID, groupId },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existingMembership.length === 0) {
      const adminExists = await queryInterface.sequelize.query(
        `SELECT user_id FROM users WHERE user_id = :userId LIMIT 1`,
        {
          replacements: { userId: ADMIN_USER_ID },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );

      if (adminExists.length > 0) {
        await queryInterface.bulkInsert("user_permission_groups", [
          {
            id: uuidv4(),
            user_id: ADMIN_USER_ID,
            permission_group_id: groupId,
          },
        ]);
      }
    }

    console.log("Achievement Workflow QA special permission group ready.");
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `DELETE FROM user_permission_groups WHERE permission_group_id = :groupId`,
      { replacements: { groupId: QA_GROUP_ID } }
    );
    await queryInterface.sequelize.query(
      `DELETE FROM permission_group_permissions WHERE permission_group_id = :groupId`,
      { replacements: { groupId: QA_GROUP_ID } }
    );
    await queryInterface.bulkDelete("permission_groups", {
      permission_group_id: QA_GROUP_ID,
    });
  },
};
