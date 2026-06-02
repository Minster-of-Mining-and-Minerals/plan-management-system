"use strict";

const { v4: uuidv4 } = require("uuid");

const PHARMACY_PERMISSIONS = [
  { resource: "pharmacy", action: "create" },
  { resource: "pharmacy", action: "update" },
  { resource: "pharmacy", action: "delete" },
  { resource: "pharmacy", action: "view" },
  { resource: "pharmacy", action: "manage" },
  { resource: "pharmacy", action: "user_manage" },
  { resource: "pharmacy_prescription", action: "send" },
  { resource: "pharmacy_prescription", action: "view" },
];

module.exports = {
  async up(queryInterface) {
    const [existing] = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions`
    );
    const map = new Map(
      existing.map((p) => [`${p.resource}:${p.action}`, p.permission_id])
    );

    const inserted = [];
    for (const { resource, action } of PHARMACY_PERMISSIONS) {
      const key = `${resource}:${action}`;
      if (!map.has(key)) {
        const id = uuidv4();
        inserted.push({
          permission_id: id,
          resource,
          action,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date(),
        });
        map.set(key, id);
      }
    }
    if (inserted.length) {
      await queryInterface.bulkInsert("permissions", inserted);
    }

    const [roles] = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE name IN ('Super Admin', 'Admin')`
    );

    const permIds = PHARMACY_PERMISSIONS.map((p) =>
      map.get(`${p.resource}:${p.action}`)
    ).filter(Boolean);

    for (const role of roles) {
      for (const permissionId of permIds) {
        const [dup] = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
          { replacements: { roleId: role.role_id, permissionId } }
        );
        if (dup.length) continue;
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: role.role_id,
            permission_id: permissionId,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource IN ('pharmacy', 'pharmacy_prescription')`
    );
    const ids = perms.map((p) => p.permission_id);
    if (ids.length) {
      await queryInterface.bulkDelete("role_permissions", {
        permission_id: ids,
      });
      await queryInterface.bulkDelete("permissions", {
        permission_id: ids,
      });
    }
  },
};
