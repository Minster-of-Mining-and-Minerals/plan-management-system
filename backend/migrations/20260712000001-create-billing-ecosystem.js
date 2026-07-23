"use strict";

const {
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. billing_service_categories
    await createTableIfNotExists(queryInterface, "billing_service_categories", {
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

    // 2. billing_services
    await createTableIfNotExists(queryInterface, "billing_services", {
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

    await safeAddIndex(queryInterface, "billing_services", ["status"]);
    await safeAddIndex(queryInterface, "billing_services", ["department_id"]);
    await safeAddIndex(queryInterface, "billing_services", ["category_id"]);

    // 3. appointment_billing_accounts
    await createTableIfNotExists(queryInterface, "appointment_billing_accounts", {
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
      serving_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      serving_claimed_at: { type: Sequelize.DATE, allowNull: true },
      serving_expires_at: { type: Sequelize.DATE, allowNull: true },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      last_payment_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
    });

    await safeAddIndex(queryInterface, "appointment_billing_accounts", ["status"]);

    // 4. appointment_billing_entries
    await createTableIfNotExists(queryInterface, "appointment_billing_entries", {
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

    await safeAddIndex(queryInterface, "appointment_billing_entries", ["appointment_id"]);
    await safeAddIndex(queryInterface, "appointment_billing_entries", ["account_id"]);
    await safeAddIndex(queryInterface, "appointment_billing_entries", ["status"]);

    // 5. receipt_sequences
    await createTableIfNotExists(queryInterface, "receipt_sequences", {
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
    await safeAddIndex(queryInterface, "receipt_sequences", ["facility_key", "year"], {
      unique: true,
      name: "receipt_sequences_facility_year_unique",
    });

    // 6. receipt_templates
    await createTableIfNotExists(queryInterface, "receipt_templates", {
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

    // 7. cashier_sessions
    await createTableIfNotExists(queryInterface, "cashier_sessions", {
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

    await safeAddIndex(queryInterface, "cashier_sessions", ["cashier_user_id", "status"], {
      name: "idx_cashier_sessions_cashier_status",
    });

    // 8. cashier_payments
    await createTableIfNotExists(queryInterface, "cashier_payments", {
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

    await safeAddIndex(queryInterface, "cashier_payments", ["account_id"], {
      name: "idx_cashier_payments_account_id",
    });
    await safeAddIndex(queryInterface, "cashier_payments", ["session_id"], {
      name: "idx_cashier_payments_session_id",
    });
    await safeAddIndex(queryInterface, "cashier_payments", ["created_at"], {
      name: "idx_cashier_payments_created_at",
    });
    await safeAddIndex(queryInterface, "cashier_payments", ["received_by", "created_at"], {
      name: "idx_cashier_payments_received_by_created_at",
    });
    await safeAddIndex(queryInterface, "cashier_payments", ["status", "created_at"], {
      name: "idx_cashier_payments_status_created_at",
    });

    // 9. payment_tenders
    await createTableIfNotExists(queryInterface, "payment_tenders", {
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

    // 10. billing_collection_requests
    await createTableIfNotExists(queryInterface, "billing_collection_requests", {
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

    await safeAddIndex(queryInterface, "billing_collection_requests", ["account_id", "status"], {
      name: "idx_billing_collection_requests_account_status",
    });
    await safeAddIndex(queryInterface, "billing_collection_requests", ["appointment_id"], {
      name: "idx_billing_collection_requests_appointment",
    });
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "billing_collection_requests");
    await dropTableIfExists(queryInterface, "payment_tenders");
    await dropTableIfExists(queryInterface, "cashier_payments");
    await dropTableIfExists(queryInterface, "cashier_sessions");
    await dropTableIfExists(queryInterface, "receipt_templates");
    await dropTableIfExists(queryInterface, "receipt_sequences");
    await dropTableIfExists(queryInterface, "appointment_billing_entries");
    await dropTableIfExists(queryInterface, "appointment_billing_accounts");
    await dropTableIfExists(queryInterface, "billing_services");
    await dropTableIfExists(queryInterface, "billing_service_categories");
  },
};
