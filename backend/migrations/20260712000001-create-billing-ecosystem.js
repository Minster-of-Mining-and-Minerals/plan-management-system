"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  DEFAULT_BILLING_CATEGORIES,
  BILLING_SERVICE_PERMISSIONS,
  BILLING_CATEGORY_PERMISSIONS,
  APPOINTMENT_BILLING_PERMISSIONS,
} = require("../config/billingConstants");
const {
  CASHIER_PERMISSIONS,
  CASHIER_ROLE_NAMES,
} = require("../config/cashierConstants");
const { dropTableIfExists } = require("./_helpers/migrationUtils");

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

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const tables = await queryInterface.showAllTables();
    const hasCategories = tables.includes("billing_service_categories");

    if (!hasCategories) {
    await queryInterface.createTable("billing_service_categories", {
      category_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      description: { type: Sequelize.TEXT, allowNull: true },
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

    await queryInterface.createTable("billing_services", {
      service_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      category_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "billing_service_categories", key: "category_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "departments", key: "department_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      name: { type: Sequelize.STRING(255), allowNull: false },
      code: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      effective_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.createTable("appointment_billing_accounts", {
      account_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
      },
      appointment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
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
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "draft",
      },
      subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_total: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      tax_total: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      grand_total: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      amount_paid: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      balance_due: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
      },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      last_payment_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await queryInterface.createTable("appointment_billing_entries", {
      entry_id: {
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
        references: { model: "staff_appointments", key: "appointment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      service_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "billing_services", key: "service_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      service_name: { type: Sequelize.STRING(255), allowNull: false },
      service_code: { type: Sequelize.STRING(64), allowNull: true },
      category_name: { type: Sequelize.STRING(150), allowNull: true },
      department_id: { type: Sequelize.UUID, allowNull: true },
      department_name: { type: Sequelize.STRING(255), allowNull: true },
      quantity: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 1,
      },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
      },
      original_unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true,
      },
      tax_percent: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      line_subtotal: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      discount_type: { type: Sequelize.STRING(32), allowNull: true },
      discount_value: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      discount_amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
      },
      discount_reason: { type: Sequelize.TEXT, allowNull: true },
      discount_approved_by: { type: Sequelize.UUID, allowNull: true },
      line_tax_amount: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      line_total: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
      },
      currency: {
        type: Sequelize.STRING(8),
        allowNull: false,
        defaultValue: "ETB",
      },
      note: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      },
      has_price_override: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      override_reason: { type: Sequelize.TEXT, allowNull: true },
      override_approved_by: { type: Sequelize.UUID, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: true },
      updated_by: { type: Sequelize.UUID, allowNull: true },
      deleted_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS billing_services_status ON billing_services (status)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS billing_services_department_id ON billing_services (department_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS billing_services_category_id ON billing_services (category_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS appointment_billing_entries_appointment_id ON appointment_billing_entries (appointment_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS appointment_billing_entries_account_id ON appointment_billing_entries (account_id)`
    );
    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS appointment_billing_entries_status ON appointment_billing_entries (status)`
    );
    }

    const [existingCategories] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count FROM billing_service_categories`
    );
    if ((existingCategories[0]?.count || 0) === 0) {
    for (const cat of DEFAULT_BILLING_CATEGORIES) {
      await queryInterface.bulkInsert("billing_service_categories", [
        {
          category_id: uuidv4(),
          name: cat.name,
          code: cat.code,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      ]);
    }
    }

    const allPerms = [
      ...BILLING_SERVICE_PERMISSIONS,
      ...BILLING_CATEGORY_PERMISSIONS,
      ...APPOINTMENT_BILLING_PERMISSIONS,
      ...CASHIER_PERMISSIONS,
    ];

    const permMap = new Map();
    for (const { resource, action } of allPerms) {
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

    const adminRoles = roles.filter((r) => ADMIN_ROLE_NAMES.includes(r.name));
    const clinicalRoles = roles.filter((r) => CLINICAL_ROLE_NAMES.includes(r.name));

    const adminPermKeys = allPerms.map((p) => `${p.resource}:${p.action}`);
    const clinicalPermKeys = [
      "appointment_billing:view",
      "appointment_billing:create",
      "billing_service:view",
    ];

    const linkPerm = async (roleId, permKey) => {
      const permissionId = permMap.get(permKey);
      if (!permissionId) return;
      const linked = await queryInterface.sequelize.query(
        `SELECT role_permission_id FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
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

    for (const role of adminRoles) {
      for (const key of adminPermKeys) {
        await linkPerm(role.role_id, key);
      }
    }

    for (const role of clinicalRoles) {
      for (const key of clinicalPermKeys) {
        await linkPerm(role.role_id, key);
      }
    }

    const cashierRoles = roles.filter((r) => CASHIER_ROLE_NAMES.includes(r.name));
    const cashierPermKeys = CASHIER_PERMISSIONS.map((p) => `${p.resource}:${p.action}`);
    for (const role of cashierRoles) {
      for (const key of cashierPermKeys) {
        await linkPerm(role.role_id, key);
      }
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
        expected_cash_total: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        counted_cash_total: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        variance: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
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
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
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
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
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
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "payment_tenders");
    await dropTableIfExists(queryInterface, "cashier_payments");
    await dropTableIfExists(queryInterface, "cashier_sessions");
    await dropTableIfExists(queryInterface, "receipt_sequences");
    await dropTableIfExists(queryInterface, "appointment_billing_entries");
    await dropTableIfExists(queryInterface, "appointment_billing_accounts");
    await dropTableIfExists(queryInterface, "billing_services");
    await dropTableIfExists(queryInterface, "billing_service_categories");

    const resources = [
      "billing_service",
      "billing_service_category",
      "appointment_billing",
      "billing",
      "cashier_session",
      "cashier_payment",
      "cashier_queue",
    ];
    const perms = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource IN (:resources)`,
      { replacements: { resources }, type: queryInterface.sequelize.QueryTypes.SELECT }
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
