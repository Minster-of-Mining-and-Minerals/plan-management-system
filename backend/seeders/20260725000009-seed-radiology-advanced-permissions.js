"use strict";

const { v4: uuidv4 } = require("uuid");

const ADVANCED_PERMISSIONS = [
  { action: "view_images", description: "View DICOM image object metadata", roles: ["Doctor", "Nurse", "Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "open_viewer", description: "Open DICOM Web Viewer sessions", roles: ["Doctor", "Nurse", "Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "manage_templates", description: "Manage structured radiology report templates", roles: ["Radiologist", "Admin", "Super Admin"] },
  { action: "critical_alert_manage", description: "Create critical result communication alerts", roles: ["Radiologist", "Doctor", "Admin", "Super Admin"] },
  { action: "critical_alert_acknowledge", description: "Acknowledge critical result communication alerts", roles: ["Doctor", "Admin", "Super Admin"] },
  { action: "resource_manage", description: "Manage radiology equipment and room resources", roles: ["Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "external_import", description: "Import external imaging studies and outside reports", roles: ["Doctor", "Radiographer", "Radiologist", "Admin", "Super Admin"] },
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

      for (const p of ADVANCED_PERMISSIONS) {
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
        `SELECT permission_id FROM permissions WHERE resource = 'radiology' AND action IN ('view_images', 'open_viewer', 'manage_templates', 'critical_alert_manage', 'critical_alert_acknowledge', 'resource_manage', 'external_import');`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'radiology' AND action IN ('view_images', 'open_viewer', 'manage_templates', 'critical_alert_manage', 'critical_alert_acknowledge', 'resource_manage', 'external_import');`,
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
