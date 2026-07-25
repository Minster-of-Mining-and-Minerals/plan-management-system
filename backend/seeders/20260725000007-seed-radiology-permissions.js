"use strict";

const { v4: uuidv4 } = require("uuid");

const RADIOLOGY_PERMISSIONS = [
  { action: "view", description: "View radiology orders, studies, and reports", roles: ["Doctor", "Nurse", "Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "schedule", description: "Schedule radiology imaging studies", roles: ["Radiographer", "Radiologist", "Nurse", "Admin", "Super Admin"] },
  { action: "perform", description: "Perform and acquire radiology imaging studies", roles: ["Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "report_create", description: "Draft radiology examination findings and impressions", roles: ["Radiologist", "Admin", "Super Admin"] },
  { action: "report_verify", description: "Verify and sign off radiology imaging reports", roles: ["Radiologist", "Doctor", "Admin", "Super Admin"] },
  { action: "report_amend", description: "Amend verified radiology diagnostic reports", roles: ["Radiologist", "Admin", "Super Admin"] },
  { action: "view_queue", description: "Access radiology operational work queue", roles: ["Radiographer", "Radiologist", "Nurse", "Admin", "Super Admin"] },
  { action: "claim_work", description: "Claim items from the radiology work queue", roles: ["Radiographer", "Radiologist", "Admin", "Super Admin"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let [groupRow] = await queryInterface.sequelize.query(
        `SELECT group_id FROM permission_groups WHERE name = 'Radiology' LIMIT 1;`,
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
              name: "Radiology",
              description: "Permissions for radiology imaging and diagnostic reporting workflows",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      for (const p of RADIOLOGY_PERMISSIONS) {
        const [existing] = await queryInterface.sequelize.query(
          `SELECT permission_id FROM permissions WHERE resource = 'radiology' AND action = '${p.action}' LIMIT 1;`,
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
                name: `radiology:${p.action}`,
                resource: "radiology",
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
        `SELECT permission_id FROM permissions WHERE resource = 'radiology';`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'radiology';`,
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
