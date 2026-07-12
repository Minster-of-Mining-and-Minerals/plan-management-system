"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  CASHIER_PERMISSIONS,
  CASHIER_ROLE_NAMES,
} = require("../config/cashierConstants");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const tables = await queryInterface.showAllTables();

    if (tables.includes("appointment_billing_accounts")) {
      const accountCols = await queryInterface.describeTable(
        "appointment_billing_accounts"
      );
      if (!accountCols.amount_paid) {
        await queryInterface.addColumn("appointment_billing_accounts", "amount_paid", {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0,
        });
      }
      if (!accountCols.balance_due) {
        await queryInterface.addColumn("appointment_billing_accounts", "balance_due", {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0,
        });
      }
      if (!accountCols.paid_at) {
        await queryInterface.addColumn("appointment_billing_accounts", "paid_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }
      if (!accountCols.last_payment_at) {
        await queryInterface.addColumn(
          "appointment_billing_accounts",
          "last_payment_at",
          { type: Sequelize.DATE, allowNull: true }
        );
      }

      await queryInterface.sequelize.query(`
        UPDATE appointment_billing_accounts
        SET balance_due = GREATEST(grand_total - COALESCE(amount_paid, 0), 0)
      `);
    }

    if (!tables.includes("cashier_sessions")) {
      await queryInterface.createTable("cashier_sessions", {
        session_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        cashier_user_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "open",
        },
        opening_float: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
          defaultValue: 0,
        },
        expected_cash_total: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: true,
        },
        counted_cash_total: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: true,
        },
        variance: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: true,
        },
        close_notes: { type: Sequelize.TEXT, allowNull: true },
        opened_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        closed_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    if (!tables.includes("cashier_payments")) {
      await queryInterface.createTable("cashier_payments", {
        payment_id: {
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
          onDelete: "RESTRICT",
        },
        appointment_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "staff_appointments", key: "appointment_id" },
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
        session_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "cashier_sessions", key: "session_id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        receipt_number: {
          type: Sequelize.STRING(32),
          allowNull: false,
          unique: true,
        },
        amount: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
        },
        currency: {
          type: Sequelize.STRING(8),
          allowNull: false,
          defaultValue: "ETB",
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: "completed",
        },
        reference_note: { type: Sequelize.TEXT, allowNull: true },
        client_reference: { type: Sequelize.UUID, allowNull: true, unique: true },
        received_by: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT",
        },
        voided_by: { type: Sequelize.UUID, allowNull: true },
        void_reason: { type: Sequelize.TEXT, allowNull: true },
        voided_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    if (!tables.includes("payment_tenders")) {
      await queryInterface.createTable("payment_tenders", {
        tender_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        payment_id: {
          type: Sequelize.UUID,
          allowNull: false,
          references: { model: "cashier_payments", key: "payment_id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        method: { type: Sequelize.STRING(32), allowNull: false },
        amount: {
          type: Sequelize.DECIMAL(14, 2),
          allowNull: false,
        },
        reference: { type: Sequelize.STRING(128), allowNull: true },
        provider: { type: Sequelize.STRING(64), allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    if (!tables.includes("receipt_sequences")) {
      await queryInterface.createTable("receipt_sequences", {
        sequence_id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.literal("gen_random_uuid()"),
        },
        facility_key: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: "default",
        },
        year: { type: Sequelize.INTEGER, allowNull: false },
        last_number: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });

      await queryInterface.addIndex("receipt_sequences", ["facility_key", "year"], {
        unique: true,
        name: "receipt_sequences_facility_year_unique",
      });
    }

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS cashier_sessions_cashier_status ON cashier_sessions (cashier_user_id, status)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS cashier_payments_account_id ON cashier_payments (account_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS cashier_payments_session_id ON cashier_payments (session_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS appointment_billing_accounts_status ON appointment_billing_accounts (status)`
    );

    const permMap = new Map();
    for (const { resource, action } of CASHIER_PERMISSIONS) {
      const existing = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        {
          replacements: { resource, action },
          type: Sequelize.QueryTypes.SELECT,
        }
      );
      if (existing.length) {
        permMap.set(`${resource}:${action}`, existing[0].permission_id);
        continue;
      }
      const id = uuidv4();
      await queryInterface.bulkInsert("permissions", [
        {
          permission_id: id,
          resource,
          action,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
      permMap.set(`${resource}:${action}`, id);
    }

    const roles = await queryInterface.sequelize.query(
      `SELECT role_id, name FROM roles WHERE is_active = true`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const cashierRoles = roles.filter((r) => CASHIER_ROLE_NAMES.includes(r.name));
    const allKeys = CASHIER_PERMISSIONS.map((p) => `${p.resource}:${p.action}`);

    for (const role of cashierRoles) {
      for (const key of allKeys) {
        const permissionId = permMap.get(key);
        if (!permissionId) continue;
        const linked = await queryInterface.sequelize.query(
          `SELECT role_permission_id FROM role_permissions
           WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
          {
            replacements: { roleId: role.role_id, permissionId },
            type: Sequelize.QueryTypes.SELECT,
          }
        );
        if (linked.length) continue;
        await queryInterface.bulkInsert("role_permissions", [
          {
            role_permission_id: uuidv4(),
            role_id: role.role_id,
            permission_id: permissionId,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("payment_tenders");
    await queryInterface.dropTable("cashier_payments");
    await queryInterface.dropTable("cashier_sessions");
    await queryInterface.dropTable("receipt_sequences");

    const tables = await queryInterface.showAllTables();
    if (tables.includes("appointment_billing_accounts")) {
      const accountCols = await queryInterface.describeTable(
        "appointment_billing_accounts"
      );
      for (const col of [
        "amount_paid",
        "balance_due",
        "paid_at",
        "last_payment_at",
      ]) {
        if (accountCols[col]) {
          await queryInterface.removeColumn("appointment_billing_accounts", col);
        }
      }
    }

    const resources = ["cashier_session", "cashier_payment", "cashier_queue"];
    const perms = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource IN (:resources)`,
      { replacements: { resources }, type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const ids = perms.map((p) => p.permission_id);
    if (ids.length) {
      await queryInterface.bulkDelete("role_permissions", { permission_id: ids });
      await queryInterface.bulkDelete("permissions", { permission_id: ids });
    }
  },
};
