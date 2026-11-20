"use strict";

/**
 * Federal plan nodes: evidence attachments for achievement reporting.
 * Required (with narration) when a submitted period/annual actual differs from its target.
 * Mirrors regional_plan_nodes.evidence_attachment_ids.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("plan_nodes");
    if (!table.evidence_attachment_ids) {
      await queryInterface.addColumn("plan_nodes", "evidence_attachment_ids", {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable("plan_nodes");
    if (table.evidence_attachment_ids) {
      await queryInterface.removeColumn("plan_nodes", "evidence_attachment_ids");
    }
  },
};
