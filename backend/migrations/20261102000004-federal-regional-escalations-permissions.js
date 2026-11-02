"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const FEDERAL_ESCALATION_PERMISSIONS = [
  { resource: "federal_regional_escalations", action: "read", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "read_all", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "assign", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "review", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "respond", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "request_clarification", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "provide_assistance", permission_tier: "standard" },
  { resource: "federal_regional_escalations", action: "close", permission_tier: "standard" },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    for (const perm of FEDERAL_ESCALATION_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );

      let permId;
      if (!existing || existing.length === 0) {
        permId = uuidv4();
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: permId,
            resource: perm.resource,
            action: perm.action,
            permission_tier: perm.permission_tier,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      } else {
        permId = existing[0].permission_id;
      }

      // Assign to Super Admin
      const existingSuperAdminPerm = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permId LIMIT 1`,
        {
          replacements: { roleId: SUPER_ADMIN_ROLE_ID, permId },
          type: QueryTypes.SELECT,
        }
      );

      if (!existingSuperAdminPerm || existingSuperAdminPerm.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: SUPER_ADMIN_ROLE_ID,
            permission_id: permId,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  down: async (queryInterface) => {
    for (const perm of FEDERAL_ESCALATION_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE LOWER(resource) = LOWER(:resource) AND LOWER(action) = LOWER(:action) LIMIT 1`,
        {
          replacements: { resource: perm.resource, action: perm.action },
          type: QueryTypes.SELECT,
        }
      );
      if (existing && existing.length > 0) {
        const permId = existing[0].permission_id;
        await queryInterface.bulkDelete("role_permissions", { permission_id: permId });
        await queryInterface.bulkDelete("permissions", { permission_id: permId });
      }
    }
  },
};

