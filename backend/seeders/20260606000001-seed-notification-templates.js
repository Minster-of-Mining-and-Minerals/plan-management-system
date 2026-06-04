"use strict";

const { v4: uuidv4 } = require("uuid");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const DEMO_PLAN_VERSION_ID = "20000000-0000-4000-8000-000000000001";
const DEMO_PLAN_NODE_ID = "40000000-0000-4000-8000-000000000011";

const TEMPLATES = [
  {
    notification_template_id: "70000000-0000-4000-8000-000000000001",
    template_code: "PLAN_VERSION_PUBLISHED",
    category: "plans",
    notification_type: "plan_published",
    title_template: "Plan version published",
    message_template: "The {{year}} plan (v{{version}}) for {{sector}} has been published and is now active.",
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
    message_template: "You have been assigned to \"{{node_title}}\" as {{role_label}}.",
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
    message_template: "The assignment for \"{{node_title}}\" was reassigned from {{previous_target}} to {{new_target}}.",
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
    message_template: "The KPI \"{{node_title}}\" is due for progress reporting by {{due_date}}.",
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
    message_template: "The system will undergo maintenance on {{maintenance_date}} from {{start_time}} to {{end_time}}.",
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
    message_template: "\"{{node_title}}\" was assigned to {{branch_target}} under the shared objective.",
    related_entity_type: "plan_node",
    default_link_path: "/plans/{{plan_version_id}}/nodes/{{plan_node_id}}",
    icon_variant: "git-branch",
    priority: "normal",
  },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    const existingTemplates = await queryInterface.sequelize.query(
      `SELECT notification_template_id FROM notification_templates LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (existingTemplates.length === 0) {
      await queryInterface.bulkInsert(
        "notification_templates",
        TEMPLATES.map((t) => ({
          ...t,
          is_active: true,
          created_at: now,
          updated_at: now,
        }))
      );
    }

    const existingNotifications = await queryInterface.sequelize.query(
      `SELECT notification_id FROM notifications WHERE recipient_id = :adminId LIMIT 1`,
      {
        replacements: { adminId: ADMIN_USER_ID },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existingNotifications.length > 0) {
      console.log("Demo notifications already seeded — skipping.");
      return;
    }

    const demoNotifications = [
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "PLAN_VERSION_PUBLISHED",
        category: "plans",
        notification_type: "plan_published",
        title: "Plan version published",
        message:
          "The 2026 plan (v1) for Ministry of Mines has been published and is now active.",
        related_entity_type: "plan_version",
        related_entity_id: DEMO_PLAN_VERSION_ID,
        link_path: `/plans/${DEMO_PLAN_VERSION_ID}`,
        icon_variant: "flag",
        priority: "high",
        metadata: JSON.stringify({ year: 2026, version: 1, sector: "Ministry of Mines" }),
        is_read: false,
        created_at: now,
        updated_at: now,
      },
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "PLAN_NODE_ASSIGNED",
        category: "assignments",
        notification_type: "plan_assignment",
        title: "New plan assignment",
        message:
          'You have been assigned to "Strengthen Mineral Governance & Licensing" as Department Head.',
        related_entity_type: "plan_node",
        related_entity_id: DEMO_PLAN_NODE_ID,
        link_path: `/plans/${DEMO_PLAN_VERSION_ID}/nodes/${DEMO_PLAN_NODE_ID}`,
        icon_variant: "user-plus",
        priority: "normal",
        metadata: JSON.stringify({ node_title: "Strengthen Mineral Governance & Licensing", role_label: "Department Head" }),
        is_read: false,
        created_at: new Date(now.getTime() - 3600000),
        updated_at: new Date(now.getTime() - 3600000),
      },
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "PLAN_KPI_DUE",
        category: "plans",
        notification_type: "kpi_reminder",
        title: "KPI reporting due",
        message:
          'The KPI "Licenses processed within SLA" is due for progress reporting by May 30, 2026.',
        related_entity_type: "plan_node",
        related_entity_id: "41000000-0000-4000-8000-000000000111",
        link_path: `/plans/${DEMO_PLAN_VERSION_ID}/nodes/41000000-0000-4000-8000-000000000111`,
        icon_variant: "target",
        priority: "high",
        metadata: JSON.stringify({ node_title: "Licenses processed within SLA", due_date: "May 30, 2026" }),
        is_read: true,
        created_at: new Date(now.getTime() - 86400000),
        updated_at: new Date(now.getTime() - 86400000),
      },
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "SYSTEM_MAINTENANCE",
        category: "system",
        notification_type: "system_alert",
        title: "Scheduled maintenance",
        message:
          "The system will undergo maintenance on June 1, 2026 from 22:00 to 23:30 EAT.",
        related_entity_type: null,
        related_entity_id: null,
        link_path: null,
        icon_variant: "shield-alert",
        priority: "normal",
        metadata: JSON.stringify({ maintenance_date: "June 1, 2026", start_time: "22:00", end_time: "23:30 EAT" }),
        is_read: false,
        created_at: new Date(now.getTime() - 172800000),
        updated_at: new Date(now.getTime() - 172800000),
      },
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "AUDIT_LOG_ENTRY",
        category: "logs",
        notification_type: "audit_log",
        title: "Audit activity recorded",
        message: "System Admin updated performance color thresholds.",
        related_entity_type: "audit_log",
        related_entity_id: null,
        link_path: null,
        icon_variant: "clipboard-list",
        priority: "low",
        metadata: JSON.stringify({ actor_name: "System Admin", action_label: "updated", entity_label: "performance color thresholds" }),
        is_read: true,
        created_at: new Date(now.getTime() - 259200000),
        updated_at: new Date(now.getTime() - 259200000),
      },
      {
        notification_id: uuidv4(),
        recipient_id: ADMIN_USER_ID,
        template_code: "SHARED_ASSIGNMENT_BRANCH",
        category: "assignments",
        notification_type: "shared_branch",
        title: "Shared objective branch created",
        message:
          '"Increase Mineral Production" was assigned to Finance Directorate under the shared objective.',
        related_entity_type: "plan_node",
        related_entity_id: "40000000-0000-4000-8000-000000000012",
        link_path: `/plans/${DEMO_PLAN_VERSION_ID}/nodes/40000000-0000-4000-8000-000000000012`,
        icon_variant: "git-branch",
        priority: "normal",
        metadata: JSON.stringify({ node_title: "Increase Mineral Production", branch_target: "Finance Directorate", plan_version_id: DEMO_PLAN_VERSION_ID }),
        is_read: false,
        created_at: new Date(now.getTime() - 7200000),
        updated_at: new Date(now.getTime() - 7200000),
      },
    ];

    await queryInterface.bulkInsert("notifications", demoNotifications);

    console.log(`Seeded ${TEMPLATES.length} notification templates and ${demoNotifications.length} demo notifications.`);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("notifications", {});
    await queryInterface.bulkDelete("notification_templates", {});
  },
};
