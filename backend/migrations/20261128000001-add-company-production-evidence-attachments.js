"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const reportsTable = await queryInterface.describeTable("company_production_reports");

    if (!reportsTable.evidence_attachments) {
      await queryInterface.addColumn("company_production_reports", "evidence_attachments", {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("company_production_reports", "evidence_attachments").catch(() => {});
  },
};
