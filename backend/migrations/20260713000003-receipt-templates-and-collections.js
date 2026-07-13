"use strict";

const { v4: uuidv4 } = require("uuid");
const { DEFAULT_RECEIPT_TEMPLATE_HTML } = require("../config/defaultReceiptTemplate");
const {
  tableExists,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

const RECEIPT_TEMPLATE_PERMISSIONS = [
  { resource: "receipt_template", action: "view" },
  { resource: "receipt_template", action: "create" },
  { resource: "receipt_template", action: "update" },
  { resource: "receipt_template", action: "delete" },
];

const FINANCE_COLLECTIONS_PERMISSIONS = [
  { resource: "finance_collections", action: "view" },
];

const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];
const CASHIER_ROLE_NAMES = ["Super Admin", "Admin", "Receptionist"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    if (!(await tableExists(queryInterface, "receipt_templates"))) {
      await queryInterface.createTable("receipt_templates", {
        template_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        name: { type: Sequelize.STRING(150), allowNull: false },
        code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        html_content: { type: Sequelize.TEXT, allowNull: false },
        is_default: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "active",
        },
        created_by: { type: Sequelize.UUID, allowNull: true },
        updated_by: { type: Sequelize.UUID, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
      });

      await queryInterface.bulkInsert("receipt_templates", [
        {
          template_id: uuidv4(),
          name: "Default payment receipt",
          code: "default_payment_receipt",
          html_content: DEFAULT_RECEIPT_TEMPLATE_HTML,
          is_default: true,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const allNewPerms = [
      ...RECEIPT_TEMPLATE_PERMISSIONS,
      ...FINANCE_COLLECTIONS_PERMISSIONS,
    ];

    const existingPerms = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const permMap = new Map(
      existingPerms.map((p) => [`${p.resource}:${p.action}`, p.permission_id])
    );

    for (const perm of allNewPerms) {
      const key = `${perm.resource}:${perm.action}`;
      if (permMap.has(key)) continue;
      const permissionId = uuidv4();
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: permissionId,
          resource: perm.resource,
          action: perm.action,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      permMap.set(key, permissionId);
    }

    const roles = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const linkPerm = async (roleId, permKey) => {
      const permissionId = permMap.get(permKey);
      if (!permissionId) return;
      const linked = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId AND is_active = true LIMIT 1`,
        {
          replacements: { roleId, permissionId },
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      if (linked.length) return;
      await queryInterface.bulkInsert("role_permissions", [
        {
          role_permission_id: uuidv4(),
          role_id: roleId,
          permission_id: permissionId,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    };

    const adminRoles = roles.filter((r) => ADMIN_ROLE_NAMES.includes(r.name));
    const receiptPermKeys = RECEIPT_TEMPLATE_PERMISSIONS.map(
      (p) => `${p.resource}:${p.action}`
    );
    const collectionsKey = "finance_collections:view";

    for (const role of adminRoles) {
      for (const key of receiptPermKeys) {
        await linkPerm(role.role_id, key);
      }
      await linkPerm(role.role_id, collectionsKey);
    }

    const cashierRoles = roles.filter((r) => CASHIER_ROLE_NAMES.includes(r.name));
    for (const role of cashierRoles) {
      await linkPerm(role.role_id, "receipt_template:view");
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "receipt_templates");
  },
};
