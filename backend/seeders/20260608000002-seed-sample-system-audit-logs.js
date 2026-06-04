"use strict";

const { v4: uuidv4 } = require("uuid");
const { QueryTypes } = require("sequelize");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const BRANDING_ID = "80000000-0000-4000-8000-000000000001";

const SAMPLE_LOGS = [
  {
    module: "branding_settings",
    action: "update",
    entity_id: BRANDING_ID,
    entity_label: "Ministry of Mines Plan Management System",
    summary: "Branding updated: MoM PMS → Ministry of Mines Plan Management System",
    previous_values: { system_name_full: "MoM PMS", primary_color: "#073954" },
    new_values: { system_name_full: "Ministry of Mines Plan Management System", primary_color: "#0C4A6E" },
    daysAgo: 5,
  },
  {
    module: "branding_settings",
    action: "restore",
    entity_id: BRANDING_ID,
    entity_label: "Ministry of Mines Plan Management System",
    summary: "Restored Ministry of Mines Plan Management System to defaults",
    previous_values: { accent_color: "#EAB308" },
    new_values: { accent_color: "#CA8A04" },
    daysAgo: 4,
  },
  {
    module: "users",
    action: "create",
    entity_label: "Alemu Bekele",
    summary: "User created: Alemu Bekele",
    previous_values: null,
    new_values: { full_name: "Alemu Bekele", email: "alemu.bekele@mom-demo.et", is_active: true },
    daysAgo: 4,
  },
  {
    module: "users",
    action: "update",
    entity_label: "Sara Tadesse",
    summary: "User updated: Sara Tadesse",
    previous_values: { full_name: "Sara Tadesse", is_active: false },
    new_values: { full_name: "Sara Tadesse", is_active: true },
    daysAgo: 3,
  },
  {
    module: "plans",
    action: "create",
    entity_label: "2026 Plan v1",
    summary: "Created 2026 Plan v1",
    previous_values: null,
    new_values: { year: 2026, version_number: 1, status: "draft" },
    daysAgo: 3,
  },
  {
    module: "plans",
    action: "update",
    entity_label: "2026 Plan v1",
    summary: "Plan updated: draft → active",
    previous_values: { status: "draft" },
    new_values: { status: "active" },
    daysAgo: 2,
  },
  {
    module: "government_structures",
    action: "update",
    entity_label: "Geological Survey Sector",
    summary: "Government Structures update: Geological Survey Sector",
    previous_values: { name: "Geological Survey" },
    new_values: { name: "Geological Survey Sector" },
    daysAgo: 2,
  },
  {
    module: "performance_color_thresholds",
    action: "create",
    entity_label: "On Track",
    summary: "Created On Track performance threshold",
    previous_values: null,
    new_values: { label: "On Track", color_hex: "#16A34A", min_percentage: 70 },
    daysAgo: 2,
  },
  {
    module: "permission_groups",
    action: "update",
    entity_label: "Plan Reviewers",
    summary: "Permission Groups update: Plan Reviewers",
    previous_values: { name: "Plan Reviewer Group" },
    new_values: { name: "Plan Reviewers" },
    daysAgo: 1,
  },
  {
    module: "roles",
    action: "update",
    entity_label: "Sector Admin",
    summary: "Roles update: Sector Admin",
    previous_values: { description: "Sector level admin" },
    new_values: { description: "Sector-level administrator role" },
    daysAgo: 1,
  },
  {
    module: "notifications",
    action: "update",
    entity_label: "Plan Assignment Template",
    summary: "Notifications update: Plan Assignment Template",
    previous_values: { title: "New assignment" },
    new_values: { title: "New plan assignment" },
    daysAgo: 1,
  },
  {
    module: "internal_structures",
    action: "create",
    entity_label: "Planning Directorate",
    summary: "Created Planning Directorate",
    previous_values: null,
    new_values: { name: "Planning Directorate", is_active: true },
    daysAgo: 0,
  },
];

module.exports = {
  async up(queryInterface) {
    const existing = await queryInterface.sequelize.query(
      `SELECT system_audit_log_id FROM system_audit_logs LIMIT 1`,
      { type: QueryTypes.SELECT }
    );

    if (existing.length >= 10) return;

    const now = Date.now();
    const rows = SAMPLE_LOGS.map((log) => ({
      system_audit_log_id: uuidv4(),
      module: log.module,
      action: log.action,
      entity_id: log.entity_id ?? null,
      entity_label: log.entity_label,
      summary: log.summary,
      previous_values: log.previous_values
        ? JSON.stringify(log.previous_values)
        : null,
      new_values: log.new_values ? JSON.stringify(log.new_values) : null,
      changed_by: ADMIN_USER_ID,
      ip_address: "127.0.0.1",
      created_at: new Date(now - log.daysAgo * 24 * 60 * 60 * 1000),
    }));

    await queryInterface.bulkInsert("system_audit_logs", rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("system_audit_logs", {
      changed_by: ADMIN_USER_ID,
      ip_address: "127.0.0.1",
    });
  },
};
