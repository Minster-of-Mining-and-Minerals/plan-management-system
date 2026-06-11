"use strict";

const {
  createTableIfNotExists,
  dropTablesInOrder,
  dropIndexIfExists,
  dropEnumTypes,
} = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await createTableIfNotExists(queryInterface, "notification_templates", {
      notification_template_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      template_code: { type: Sequelize.STRING(80), allowNull: false, unique: true },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
      },
      notification_type: { type: Sequelize.STRING(80), allowNull: false },
      title_template: { type: Sequelize.STRING(255), allowNull: false },
      message_template: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      default_link_path: { type: Sequelize.STRING(500), allowNull: true },
      icon_variant: { type: Sequelize.STRING(50), allowNull: false, defaultValue: "bell" },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await createTableIfNotExists(queryInterface, "notifications", {
      notification_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      recipient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      template_code: { type: Sequelize.STRING(80), allowNull: true },
      category: {
        type: Sequelize.ENUM("plans", "assignments", "system", "logs"),
        allowNull: false,
        defaultValue: "system",
      },
      notification_type: { type: Sequelize.STRING(80), allowNull: false, defaultValue: "general" },
      title: { type: Sequelize.STRING(255), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      related_entity_type: { type: Sequelize.STRING(50), allowNull: true },
      related_entity_id: { type: Sequelize.UUID, allowNull: true },
      link_path: { type: Sequelize.STRING(500), allowNull: true },
      icon_variant: { type: Sequelize.STRING(50), allowNull: true },
      priority: {
        type: Sequelize.ENUM("low", "normal", "high"),
        allowNull: false,
        defaultValue: "normal",
      },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      is_read: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications (recipient_id)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_category ON notifications (recipient_id, category)
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_recipient_read ON notifications (recipient_id, is_read)
    `);

    const [existingTemplates] = await queryInterface.sequelize.query(
      `SELECT notification_template_id FROM notification_templates LIMIT 1`
    );

    if (existingTemplates.length === 0) {
      const now = new Date();
      const templates = [
        {
          notification_template_id: "70000000-0000-4000-8000-000000000001",
          template_code: "PLAN_VERSION_PUBLISHED",
          category: "plans",
          notification_type: "plan_published",
          title_template: "Plan version published",
          message_template:
            "The {{year}} plan (v{{version}}) for {{sector}} has been published and is now active.",
          related_entity_type: "plan_version",
          default_link_path: "/plans/{{plan_version_id}}",
          icon_variant: "flag",
          priority: "high",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000002",
          template_code: "PLAN_NODE_ASSIGNED",
          category: "assignments",
          notification_type: "plan_assignment",
          title_template: "New plan assignment",
          message_template: 'You have been assigned to "{{node_title}}" as {{role_label}}.',
          related_entity_type: "plan_node",
          default_link_path: "/plans/{{plan_version_id}}/nodes/{{plan_node_id}}",
          icon_variant: "user-plus",
          priority: "normal",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000003",
          template_code: "PLAN_ASSIGNMENT_REPLACED",
          category: "assignments",
          notification_type: "plan_reassignment",
          title_template: "Plan assignment updated",
          message_template:
            'The assignment for "{{node_title}}" was reassigned from {{previous_target}} to {{new_target}}.',
          related_entity_type: "plan_node",
          default_link_path: "/plans/{{plan_version_id}}/nodes/{{plan_node_id}}",
          icon_variant: "refresh",
          priority: "normal",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000004",
          template_code: "PLAN_KPI_DUE",
          category: "plans",
          notification_type: "kpi_reminder",
          title_template: "KPI reporting due",
          message_template:
            'The KPI "{{node_title}}" is due for progress reporting by {{due_date}}.',
          related_entity_type: "plan_node",
          default_link_path: "/plans/{{plan_version_id}}/nodes/{{plan_node_id}}",
          icon_variant: "target",
          priority: "high",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000005",
          template_code: "SYSTEM_MAINTENANCE",
          category: "system",
          notification_type: "system_alert",
          title_template: "Scheduled maintenance",
          message_template:
            "The system will undergo maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.",
          related_entity_type: null,
          default_link_path: null,
          icon_variant: "shield-alert",
          priority: "normal",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000006",
          template_code: "AUDIT_LOG_ENTRY",
          category: "logs",
          notification_type: "audit_log",
          title_template: "Audit activity recorded",
          message_template: "{{actor_name}} {{action_label}} on {{entity_label}}.",
          related_entity_type: "audit_log",
          default_link_path: null,
          icon_variant: "clipboard-list",
          priority: "low",
        },
        {
          notification_template_id: "70000000-0000-4000-8000-000000000007",
          template_code: "SHARED_ASSIGNMENT_BRANCH",
          category: "assignments",
          notification_type: "shared_branch",
          title_template: "Shared objective branch created",
          message_template:
            '"{{node_title}}" was assigned to {{branch_target}} under the shared objective.',
          related_entity_type: "plan_node",
          default_link_path: "/plans/{{plan_version_id}}/nodes/{{plan_node_id}}",
          icon_variant: "git-branch",
          priority: "normal",
        },
      ];

      await queryInterface.bulkInsert(
        "notification_templates",
        templates.map((template) => ({
          ...template,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }
  },

  async down(queryInterface) {
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_read");
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_category");
    await dropIndexIfExists(queryInterface, "notifications", "idx_notifications_recipient_id");

    await dropTablesInOrder(queryInterface, ["notifications", "notification_templates"]);

    await dropEnumTypes(queryInterface, [
      "enum_notifications_category",
      "enum_notifications_priority",
      "enum_notification_templates_category",
      "enum_notification_templates_priority",
    ]);
  },
};
