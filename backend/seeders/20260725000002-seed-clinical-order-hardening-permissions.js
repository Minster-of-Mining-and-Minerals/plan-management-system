"use strict";

const { v4: uuidv4 } = require("uuid");

const HARDENING_PERMISSIONS = [
  { action: "cancel", description: "Allows cancelling clinical orders" },
  { action: "amend", description: "Allows amending recorded clinical order results" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Find or create PermissionGroup for orders
      let [orderGroup] = await queryInterface.sequelize.query(
        `SELECT permission_group_id FROM permission_groups WHERE name = 'Clinical Orders' LIMIT 1;`,
        { transaction }
      );

      let groupId;
      if (orderGroup && orderGroup.length > 0) {
        groupId = orderGroup[0].permission_group_id;
      } else {
        groupId = uuidv4();
        await queryInterface.bulkInsert(
          "permission_groups",
          [
            {
              permission_group_id: groupId,
              name: "Clinical Orders",
              description: "Permissions for managing unified clinical orders",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      // Seed permissions
      for (const p of HARDENING_PERMISSIONS) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT permission_id FROM permissions WHERE resource = 'orders' AND action = '${p.action}' LIMIT 1;`,
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
                resource: "orders",
                action: p.action,
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
            { transaction }
          );
        }

        // Grant to Doctor, Admin, and Super Admin roles
        const [roles] = await queryInterface.sequelize.query(
          `SELECT role_id, name FROM roles WHERE name IN ('Doctor', 'Admin', 'Super Admin');`,
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
        `SELECT permission_id FROM permissions WHERE resource = 'orders' AND action IN ('cancel', 'amend');`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'orders' AND action IN ('cancel', 'amend');`,
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
