"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
  tableExists,
  columnExists,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    if (!(await columnExists(queryInterface, "staff_appointments", "workflow_status"))) {
      await queryInterface.addColumn("staff_appointments", "workflow_status", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "active",
      });
    }
    if (
      !(await columnExists(
        queryInterface,
        "staff_appointments",
        "workflow_completed_at"
      ))
    ) {
      await queryInterface.addColumn("staff_appointments", "workflow_completed_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!(await tableExists(queryInterface, "medical_history_logs"))) {
      await queryInterface.createTable("medical_history_logs", {
      log_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
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
      sender_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      receiver_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      action_type: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "submit",
      },
      header_title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      form_config_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "diagnosis_form_configs", key: "config_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      form_data: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      attachment_ids: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "submitted",
      },
      parent_log_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "medical_history_logs", key: "log_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
      });
    }

    await safeAddIndex(queryInterface, "medical_history_logs", ["appointment_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["patient_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["sender_staff_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", ["receiver_staff_id"]);
    await safeAddIndex(queryInterface, "medical_history_logs", [
      "appointment_id",
      "created_at",
    ]);

    if (!(await tableExists(queryInterface, "workflow_tasks"))) {
      await queryInterface.createTable("workflow_tasks", {
      task_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
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
      assignee_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      assigned_by_staff_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      medical_log_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "medical_history_logs", key: "log_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "pending",
      },
      ...ts,
      });
    }

    await safeAddIndex(queryInterface, "workflow_tasks", ["assignee_staff_id", "status"]);
    await safeAddIndex(queryInterface, "workflow_tasks", ["appointment_id"]);

    const [perms] = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions WHERE resource = 'workflow' AND action = 'read' LIMIT 1`
    );
    if (!perms.length) {
      const now = new Date();
      const workflowPerms = [
        { resource: "workflow", action: "read" },
        { resource: "workflow", action: "forward" },
      ];
      for (const p of workflowPerms) {
        await queryInterface.bulkInsert("permissions", [
          {
            permission_id: uuidv4(),
            resource: p.resource,
            action: p.action,
            is_active: true,
            created_at: now,
            updated_at: now,
          },
        ]);
      }
    }
  },

  async down(queryInterface) {
    await dropTableIfExists(queryInterface, "workflow_tasks");
    await dropTableIfExists(queryInterface, "medical_history_logs");
    await queryInterface.removeColumn("staff_appointments", "workflow_completed_at");
    await queryInterface.removeColumn("staff_appointments", "workflow_status");
  },
};
