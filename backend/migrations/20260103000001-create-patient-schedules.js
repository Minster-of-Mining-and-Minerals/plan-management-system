"use strict";

const { v4: uuidv4 } = require("uuid");
const {
  timestampColumns,
  safeAddIndex,
  dropTableIfExists,
} = require("./_helpers/migrationUtils");
const { DEFAULT_SCHEDULE_SETTINGS } = require("../config/defaultScheduleSettings");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await queryInterface.createTable("schedule_settings", {
      schedule_setting_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      slot_interval_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      },
      horizon_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 365,
      },
      days_config: {
        type: Sequelize.JSONB,
        allowNull: false,
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
    });

    await queryInterface.bulkInsert("schedule_settings", [
      {
        schedule_setting_id: uuidv4(),
        slot_interval_minutes: DEFAULT_SCHEDULE_SETTINGS.slot_interval_minutes,
        horizon_days: DEFAULT_SCHEDULE_SETTINGS.horizon_days,
        days_config: JSON.stringify(DEFAULT_SCHEDULE_SETTINGS.days_config),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    await queryInterface.createTable("patient_schedules", {
      schedule_id: {
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
      assigned_staff_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      schedule_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      start_time: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      end_time: {
        type: Sequelize.STRING(5),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "scheduled",
      },
      appointment_type: {
        type: Sequelize.STRING(128),
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "patient_schedules", ["assigned_staff_id", "schedule_date"], {
      name: "patient_schedules_staff_date_idx",
    });
    await safeAddIndex(queryInterface, "patient_schedules", ["patient_id"], {
      name: "patient_schedules_patient_idx",
    });
    await safeAddIndex(queryInterface, "patient_schedules", ["schedule_date", "start_time"], {
      name: "patient_schedules_date_time_idx",
    });

    const now = new Date();
    const perms = [
      { resource: "patients", action: "receive_patient" },
      { resource: "patients", action: "schedule" },
    ];

    for (const p of perms) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
        { replacements: p }
      );
      if (!existing.length) {
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
    await queryInterface.sequelize.query(
      `DELETE FROM permissions WHERE resource = 'patients' AND action IN ('receive_patient', 'schedule')`
    );
    await dropTableIfExists(queryInterface, "patient_schedules");
    await dropTableIfExists(queryInterface, "schedule_settings");
  },
};
