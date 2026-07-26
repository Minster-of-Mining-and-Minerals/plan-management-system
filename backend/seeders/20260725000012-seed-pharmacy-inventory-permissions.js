"use strict";

const { v4: uuidv4 } = require("uuid");

const PHARMACY_INVENTORY_PERMISSIONS = [
  { action: "inventory_view", description: "View pharmacy warehouse, stock levels, and batches", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "inventory_manage", description: "Manage pharmacy warehouses and inventory settings", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "stock_receive", description: "Receive medication stock batches", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "stock_adjust", description: "Perform manual inventory adjustments and quarantines", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "batch_manage", description: "Manage medication batch records and expiry dates", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "substitution_request", description: "Request medication substitution from doctor", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "substitution_approve", description: "Approve medication substitution proposals", roles: ["Doctor", "Admin", "Super Admin"] },
  { action: "controlled_dispense", description: "Dispense controlled substances", roles: ["Pharmacist", "Admin", "Super Admin"] },
  { action: "controlled_verify", description: "Perform secondary verification for controlled drug dispensing", roles: ["Pharmacist", "Doctor", "Admin", "Super Admin"] },
  { action: "billing_view", description: "View pharmacy billing charges and financial analytics", roles: ["Pharmacist", "Admin", "Super Admin"] },
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

      for (const p of PHARMACY_INVENTORY_PERMISSIONS) {
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
      const actions = PHARMACY_INVENTORY_PERMISSIONS.map((p) => `'${p.action}'`).join(",");
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
