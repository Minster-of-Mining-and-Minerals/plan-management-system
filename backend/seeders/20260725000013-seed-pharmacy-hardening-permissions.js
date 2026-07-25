"use strict";

const { v4: uuidv4 } = require("uuid");

const PHARMACY_HARDENING_PERMISSIONS = [
  { action: "transfer_manage", description: "Manage inter-pharmacy stock transfer requests and shipments", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "barcode_verify", description: "Perform barcode verification during medication dispensing", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "refill_manage", description: "Process prescription refill authorizations and dispensing", roles: ["Pharmacist", "Doctor", "Admin", "Super Admin"] },
  { action: "analytics_clinical", description: "Access advanced clinical and operational pharmacy analytics", roles: ["Pharmacist", "Doctor", "Admin", "Super Admin"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let [groupRow] = await queryInterface.sequelize.query(
        `SELECT group_id FROM permission_groups WHERE name = 'Pharmacy' LIMIT 1;`,
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
              name: "Pharmacy",
              description: "Permissions for multi-branch stock transfers, barcode verification, refills, and analytics",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      for (const p of PHARMACY_HARDENING_PERMISSIONS) {
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
                group_id: groupId,
                name: `pharmacy:${p.action}`,
                resource: "pharmacy",
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
      const actions = PHARMACY_HARDENING_PERMISSIONS.map((p) => `'${p.action}'`).join(",");
      const [perms] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = 'pharmacy' AND action IN (${actions});`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'pharmacy' AND action IN (${actions});`,
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
