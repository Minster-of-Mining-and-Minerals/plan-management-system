"use strict";

const { v4: uuidv4 } = require("uuid");

const PHARMACY_CLINICAL_PERMISSIONS = [
  { action: "clinical_view", description: "View pharmacy clinical orders and dispensing history", roles: ["Doctor", "Nurse", "Pharmacist", "Admin", "Super Admin"] },
  { action: "send", description: "Send and forward prescriptions to pharmacy", roles: ["Doctor", "Nurse", "Admin", "Super Admin"] },
  { action: "manage_status", description: "Manage pharmacy dispensing workflow status", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "view_history", description: "View patient pharmacy clinical history", roles: ["Doctor", "Nurse", "Pharmacist", "Admin", "Super Admin"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let [pharmGroup] = await queryInterface.sequelize.query(
        `SELECT permission_group_id FROM permission_groups WHERE name = 'Pharmacy' LIMIT 1;`,
        { transaction }
      );

      let groupId;
      if (pharmGroup && pharmGroup.length > 0) {
        groupId = pharmGroup[0].permission_group_id;
      } else {
        groupId = uuidv4();
        await queryInterface.bulkInsert(
          "permission_groups",
          [
            {
              permission_group_id: groupId,
              name: "Pharmacy",
              description: "Permissions for managing enterprise pharmacy operations",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      for (const p of PHARMACY_CLINICAL_PERMISSIONS) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT permission_id FROM permissions WHERE resource = 'pharmacy' AND action = '${p.action}' LIMIT 1;`,
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
                resource: "pharmacy",
                action: p.action,
                is_active: true,
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
        `SELECT permission_id FROM permissions WHERE resource = 'pharmacy' AND action IN ('clinical_view', 'send', 'manage_status', 'view_history');`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'pharmacy' AND action IN ('clinical_view', 'send', 'manage_status', 'view_history');`,
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
