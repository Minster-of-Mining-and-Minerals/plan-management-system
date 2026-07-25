"use strict";

const { v4: uuidv4 } = require("uuid");

const MEDICATION_SAFETY_PERMISSIONS = [
  { action: "safety_view", description: "View medication safety evaluations, warnings, and alerts", roles: ["Doctor", "Nurse", "Pharmacist", "Admin", "Super Admin"] },
  { action: "alert_manage", description: "Manage and acknowledge medication safety alerts", roles: ["Doctor", "Pharmacist", "Admin", "Super Admin"] },
  { action: "override", description: "Override medication safety warnings with mandatory clinical reason", roles: ["Doctor", "Admin", "Super Admin"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let [groupRow] = await queryInterface.sequelize.query(
        `SELECT group_id FROM permission_groups WHERE name = 'Medication Safety' LIMIT 1;`,
        { transaction }
      );

      let groupId;
      if (groupRow && groupRow.length > 0) {
        groupId = groupRow[0].group_id;
      } else {
        groupId = uuidv4();
        await queryInterface.bulkInsert(
          "permission_groups",
          [
            {
              group_id: groupId,
              name: "Medication Safety",
              description: "Permissions for medication intelligence, allergy checking, drug interactions, and decision overrides",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      for (const p of MEDICATION_SAFETY_PERMISSIONS) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT permission_id FROM permissions WHERE resource = 'medication' AND action = '${p.action}' LIMIT 1;`,
          { transaction }
        );

        let permId;
        if (existing && existing.length > 0) {
          permId = existing[0].permission_id;
        } else {
          permId = uuidv4();
          await queryInterface.bulkInsert(
            "permissions",
            [
              {
                permission_id: permId,
                group_id: groupId,
                name: `medication:${p.action}`,
                resource: "medication",
                action: p.action,
                description: p.description,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            { transaction }
          );
        }

        const [roles] = await queryInterface.sequelize.query(
          `SELECT role_id, name FROM roles WHERE name IN (${p.roles.map((r) => `'${r}'`).join(",")});`,
          { transaction }
        );

        for (const r of roles) {
          const [assoc] = await queryInterface.sequelize.query(
            `SELECT * FROM role_permissions WHERE role_id = '${r.role_id}' AND permission_id = '${permId}';`,
            { transaction }
          );

          if (!assoc || assoc.length === 0) {
            await queryInterface.bulkInsert(
              "role_permissions",
              [
                {
                  role_permission_id: uuidv4(),
                  role_id: r.role_id,
                  permission_id: permId,
                  created_at: new Date(),
                  updated_at: new Date(),
                },
              ],
              { transaction }
            );
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [perms] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'medication' AND action IN ('safety_view', 'alert_manage', 'override');`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'medication' AND action IN ('safety_view', 'alert_manage', 'override');`,
          { transaction }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
