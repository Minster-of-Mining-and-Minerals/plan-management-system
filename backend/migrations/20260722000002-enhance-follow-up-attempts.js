"use strict";

const {
  safeAddColumn,
  columnExists,
  tableExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new columns to encounter_follow_up_attempts
    const tableName = "encounter_follow_up_attempts";

    if (await tableExists(queryInterface, tableName)) {
      // Add attempt_number column
      if (!(await columnExists(queryInterface, tableName, "attempt_number"))) {
        await queryInterface.addColumn(tableName, "attempt_number", {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
        });
      }

      // Add scheduled_at column
      if (!(await columnExists(queryInterface, tableName, "scheduled_at"))) {
        await queryInterface.addColumn(tableName, "scheduled_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }

      // Add attended_at column
      if (!(await columnExists(queryInterface, tableName, "attended_at"))) {
        await queryInterface.addColumn(tableName, "attended_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }

      // Add cancelled_at column
      if (!(await columnExists(queryInterface, tableName, "cancelled_at"))) {
        await queryInterface.addColumn(tableName, "cancelled_at", {
          type: Sequelize.DATE,
          allowNull: true,
        });
      }

      // Add missed_reason column
      if (!(await columnExists(queryInterface, tableName, "missed_reason"))) {
        await queryInterface.addColumn(tableName, "missed_reason", {
          type: Sequelize.TEXT,
          allowNull: true,
        });
      }

      // Add created_by column
      if (!(await columnExists(queryInterface, tableName, "created_by"))) {
        await queryInterface.addColumn(tableName, "created_by", {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }

      // Add updated_by column
      if (!(await columnExists(queryInterface, tableName, "updated_by"))) {
        await queryInterface.addColumn(tableName, "updated_by", {
          type: Sequelize.UUID,
          allowNull: true,
          references: { model: "users", key: "user_id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }

      // Add metadata column
      if (!(await columnExists(queryInterface, tableName, "metadata"))) {
        await queryInterface.addColumn(tableName, "metadata", {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        });
      }
    }

    // Add indexes for new columns
    await safeAddIndex(queryInterface, tableName, ["attempt_number"], {
      name: "idx_attempts_attempt_number",
    });
    await safeAddIndex(queryInterface, tableName, ["created_by"], {
      name: "idx_attempts_created_by",
    });
    await safeAddIndex(queryInterface, tableName, ["updated_by"], {
      name: "idx_attempts_updated_by",
    });

    // Add index on encounter_follow_ups for completed_encounter_id lookup
    const fuTable = "encounter_follow_ups";
    await safeAddIndex(queryInterface, fuTable, ["completed_encounter_id"], {
      name: "idx_fu_completed_encounter_id",
    });

    // Add index for patient + status queries (reception queue)
    await safeAddIndex(queryInterface, fuTable, ["patient_id", "status"], {
      name: "idx_fu_patient_status",
    });
  },

  async down(queryInterface, Sequelize) {
    const tableName = "encounter_follow_up_attempts";

    const columns = [
      "attempt_number",
      "scheduled_at",
      "attended_at",
      "cancelled_at",
      "missed_reason",
      "created_by",
      "updated_by",
      "metadata",
    ];

    for (const col of columns) {
      if (await columnExists(queryInterface, tableName, col)) {
        await queryInterface.removeColumn(tableName, col);
      }
    }

    // Remove indexes
    const indexes = [
      "idx_attempts_attempt_number",
      "idx_attempts_created_by",
      "idx_attempts_updated_by",
      "idx_fu_completed_encounter_id",
      "idx_fu_patient_status",
    ];

    for (const idx of indexes) {
      try {
        await queryInterface.removeIndex(
          idx.startsWith("idx_fu") ? "encounter_follow_ups" : tableName,
          idx
        );
      } catch {
        // index may not exist
      }
    }
  },
};