"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("system_audit_logs", {
      system_audit_log_id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      module: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      action: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.UUID,
        allowNull: true,
      },
      entity_label: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      previous_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      new_values: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      changed_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: "users",
          key: "user_id",
        },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });

    await queryInterface.addIndex("system_audit_logs", ["module"], {
      name: "system_audit_logs_module_idx",
    });
    await queryInterface.addIndex("system_audit_logs", ["action"], {
      name: "system_audit_logs_action_idx",
    });
    await queryInterface.addIndex("system_audit_logs", ["changed_by"], {
      name: "system_audit_logs_changed_by_idx",
    });
    await queryInterface.addIndex("system_audit_logs", ["created_at"], {
      name: "system_audit_logs_created_at_idx",
    });

    const brandingLogs = await queryInterface.sequelize.query(
      `SELECT * FROM branding_audit_logs ORDER BY created_at ASC`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (brandingLogs.length > 0) {
      const { v4: uuidv4 } = require("uuid");
      await queryInterface.bulkInsert(
        "system_audit_logs",
        brandingLogs.map((log) => ({
          system_audit_log_id: uuidv4(),
          module: "branding_settings",
          action: "update",
          entity_id: log.branding_setting_id,
          entity_label: log.new_values?.system_name_full || "Branding Settings",
          summary: `Branding updated: ${log.previous_values?.system_name_full || ""} → ${log.new_values?.system_name_full || ""}`,
          previous_values: log.previous_values,
          new_values: log.new_values,
          changed_by: log.changed_by,
          ip_address: null,
          created_at: log.created_at,
        }))
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("system_audit_logs");
  },
};
