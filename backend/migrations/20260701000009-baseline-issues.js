"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  createTableIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
  dropEnumTypes,
} = require("./helpers/schemaHelpers");

const ISSUE_STATUSES = [
  "submitted",
  "under_review",
  "accepted",
  "rejected",
  "resolved",
  "closed",
];

const DEFAULT_CATEGORIES = [
  { name: "KPI Issue", description: "Issues related to KPI definitions, measurements, or targets.", display_order: 1 },
  { name: "Target Issue", description: "Issues with target values, allocations, or thresholds.", display_order: 2 },
  { name: "Strategic Alignment Issue", description: "Misalignment with strategic objectives or priorities.", display_order: 3 },
  { name: "Budget & Resource Issue", description: "Budget, funding, or resource allocation concerns.", display_order: 4 },
  { name: "Timeline Issue", description: "Schedule, deadlines, or timeline feasibility concerns.", display_order: 5 },
  { name: "Ownership Issue", description: "Unclear or incorrect ownership or accountability.", display_order: 6 },
  { name: "Naming & Description Issue", description: "Naming, labeling, or description clarity problems.", display_order: 7 },
  { name: "Data Issue", description: "Data quality, accuracy, or completeness problems.", display_order: 8 },
  { name: "Dependency Issue", description: "Cross-entity or cross-team dependency concerns.", display_order: 9 },
  { name: "General Recommendation", description: "General recommendations not covered by other categories.", display_order: 10 },
];

const DEFAULT_PRIORITIES = [
  { code: "low", label: "Low", display_order: 1, color_hex: "#6B7280" },
  { code: "medium", label: "Medium", display_order: 2, color_hex: "#2563EB" },
  { code: "high", label: "High", display_order: 3, color_hex: "#D97706" },
  { code: "critical", label: "Critical", display_order: 4, color_hex: "#DC2626" },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "issue_categories", {
      issue_category_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "issue_priorities", {
      issue_priority_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      code: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      label: { type: Sequelize.STRING(100), allowNull: false },
      display_order: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      color_hex: { type: Sequelize.STRING(7), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "issues", {
      issue_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      issue_number: { type: Sequelize.STRING(30), allowNull: false, unique: true },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: false },
      issue_category_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "issue_categories", key: "issue_category_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      issue_priority_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "issue_priorities", key: "issue_priority_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: {
        type: Sequelize.ENUM(...ISSUE_STATUSES),
        allowNull: false,
        defaultValue: "submitted",
      },
      raised_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      assigned_to: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      entity_type: { type: Sequelize.STRING(100), allowNull: false },
      entity_id: { type: Sequelize.UUID, allowNull: false },
      current_value: { type: Sequelize.TEXT, allowNull: true },
      suggested_value: { type: Sequelize.TEXT, allowNull: true },
      justification: { type: Sequelize.TEXT, allowNull: false },
      response: { type: Sequelize.TEXT, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },
      resolution_notes: { type: Sequelize.TEXT, allowNull: true },
      attachment_path: { type: Sequelize.STRING(500), allowNull: true },
      resolved_at: { type: Sequelize.DATE, allowNull: true },
      closed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "issue_histories", {
      issue_history_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "issues", key: "issue_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action_type: { type: Sequelize.STRING(80), allowNull: false },
      field_name: { type: Sequelize.STRING(80), allowNull: true },
      old_value: { type: Sequelize.TEXT, allowNull: true },
      new_value: { type: Sequelize.TEXT, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      performed_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "issue_attachments", {
      issue_attachment_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      issue_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "issues", key: "issue_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attachment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "attachments", key: "attachment_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_category ON issues (issue_category_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues (issue_priority_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_raised_by ON issues (raised_by)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_assigned_to ON issues (assigned_to)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issues_entity ON issues (entity_type, entity_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_issue_histories_issue_id ON issue_histories (issue_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_issue_attachments_issue_attachment
      ON issue_attachments (issue_id, attachment_id)
    `);

    const now = new Date();
    for (const category of DEFAULT_CATEGORIES) {
      await queryInterface.bulkInsert("issue_categories", [
        {
          issue_category_id: uuidv4(),
          name: category.name,
          description: category.description,
          display_order: category.display_order,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    for (const priority of DEFAULT_PRIORITIES) {
      await queryInterface.bulkInsert("issue_priorities", [
        {
          issue_priority_id: uuidv4(),
          code: priority.code,
          label: priority.label,
          display_order: priority.display_order,
          color_hex: priority.color_hex,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE enum_notification_templates_category ADD VALUE IF NOT EXISTS 'issues';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        ALTER TYPE enum_notifications_category ADD VALUE IF NOT EXISTS 'issues';
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "issue_attachments", "uq_issue_attachments_issue_attachment");
    await dropIndexIfExists(queryInterface, "issue_histories", "idx_issue_histories_issue_id");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_entity");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_assigned_to");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_raised_by");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_priority");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_category");
    await dropIndexIfExists(queryInterface, "issues", "idx_issues_status");

    await dropTablesInOrder(queryInterface, [
      "issue_attachments",
      "issue_histories",
      "issues",
      "issue_priorities",
      "issue_categories",
    ]);

    await dropEnumTypes(queryInterface, ["enum_issues_status"]);
  },
};
