"use strict";

const { columnExists, safeAddIndex } = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await columnExists(queryInterface, "notifications", "category"))) {
      await queryInterface.addColumn("notifications", "category", {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: "system",
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE notifications
      SET category = CASE
        WHEN lower(coalesce(related_entity_type, '')) = 'appointment' THEN 'appointments'
        WHEN lower(coalesce(related_entity_type, '')) IN ('log', 'logs', 'audit', 'audit_log') THEN 'logs'
        ELSE 'system'
      END
      WHERE category IS NULL OR category = '';
    `);

    await safeAddIndex(queryInterface, "notifications", ["recipient_id", "category", "is_read"], {
      name: "notifications_recipient_category_read_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("notifications", "category");
  },
};

