"use strict";

const { v4: uuidv4 } = require("uuid");

const COMPLETION_PERMISSIONS = [
  { action: "pacs_manage", description: "Manage PACS imaging metadata and series registration", roles: ["Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "pacs_view", description: "View DICOM images and launch web viewer links", roles: ["Doctor", "Nurse", "Radiographer", "Radiologist", "Admin", "Super Admin"] },
  { action: "review_clinical", description: "Perform ordering clinician review and record decisions", roles: ["Doctor", "Admin", "Super Admin"] },
  { action: "release_patient", description: "Control radiology report release to patient portal", roles: ["Doctor", "Radiologist", "Admin", "Super Admin"] },
  { action: "billing_manage", description: "Manage radiology billing charge generation", roles: ["Radiologist", "Admin", "Super Admin"] },
  { action: "analytics_view", description: "View radiology operational and radiologist performance analytics", roles: ["Doctor", "Radiologist", "Admin", "Super Admin"] },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      let [radGroup] = await queryInterface.sequelize.query(
        `SELECT permission_group_id FROM permission_groups WHERE name = 'Radiology' LIMIT 1;`,
        { transaction }
      );

      let groupId;
      if (radGroup && radGroup.length > 0) {
        groupId = radGroup[0].permission_group_id;
      } else {
        groupId = uuidv4();
        await queryInterface.bulkInsert(
          "permission_groups",
          [
            {
              permission_group_id: groupId,
              name: "Radiology",
              description: "Permissions for managing enterprise radiology operations",
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
          { transaction }
        );
      }

      for (const p of COMPLETION_PERMISSIONS) {
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
                resource: "radiology",
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
        `SELECT permission_id FROM permissions WHERE resource = 'radiology' AND action IN ('pacs_manage', 'pacs_view', 'review_clinical', 'release_patient', 'billing_manage', 'analytics_view');`,
        { transaction }
      );

      if (perms && perms.length > 0) {
        const permIds = perms.map((p) => `'${p.permission_id}'`).join(",");
        await queryInterface.sequelize.query(
          `DELETE FROM role_permissions WHERE permission_id IN (${permIds});`,
          { transaction }
        );
        await queryInterface.sequelize.query(
          `DELETE FROM permissions WHERE resource = 'radiology' AND action IN ('pacs_manage', 'pacs_view', 'review_clinical', 'release_patient', 'billing_manage', 'analytics_view');`,
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
