"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  BILLING_COLLECTION_PERMISSIONS,
} = require("../config/billingCollectionConstants");
const {
  tableExists,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");

const ADMIN_ROLE_NAMES = ["Super Admin", "Admin"];
const CLINICAL_ROLE_NAMES = [
  "Super Admin",
  "Admin",
  "Doctor",
  "Nurse",
  "Ophthalmologist",
  "Laboratory Technician",
  "Pharmacist",
  "Receptionist",
];
const CASHIER_ROLE_NAMES = ["Super Admin", "Admin", "Receptionist"];

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    if (!(await tableExists(queryInterface, "billing_collection_requests"))) {
      await queryInterface.createTable("billing_collection_requests", {
        request_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        account_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "appointment_billing_accounts",
            key: "account_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: "staff_appointments",
            key: "appointment_id",
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        patient_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        requested_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        requested_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: now,
        },
        amount_due_at_request: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0,
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "pending",
        },
        source: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "manual",
        },
        note: { type: Sequelize.TEXT, allowNull: true },
        collected_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });

      await queryInterface.addIndex(
        "billing_collection_requests",
        ["account_id", "status"],
        { name: "billing_collection_requests_account_status_idx" }
      );
      await queryInterface.addIndex(
        "billing_collection_requests",
        ["appointment_id"],
        { name: "billing_collection_requests_appointment_idx" }
      );
    }

    const existingPerms = await queryInterface.sequelize.query(
      `SELECT permission_id, resource, action FROM permissions`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const permMap = new Map(
      existingPerms.map((p) => [`${p.resource}:${p.action}`, p.permission_id])
    );

    for (const perm of BILLING_COLLECTION_PERMISSIONS) {
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

    for (const role of roles.filter((r) => CLINICAL_ROLE_NAMES.includes(r.name))) {
      await linkPerm(role.role_id, "billing_collection:send");
      await linkPerm(role.role_id, "billing_collection:view");
    }

    for (const role of roles.filter((r) => CASHIER_ROLE_NAMES.includes(r.name))) {
      await linkPerm(role.role_id, "billing_collection:view");
    }

    for (const role of roles.filter((r) => ADMIN_ROLE_NAMES.includes(r.name))) {
      await linkPerm(role.role_id, "billing_collection:send");
      await linkPerm(role.role_id, "billing_collection:view");
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "billing_collection_requests");
  },
};
