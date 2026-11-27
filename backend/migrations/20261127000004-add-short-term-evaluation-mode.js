"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const kpiDesc = await queryInterface.describeTable("short_term_kpis");
    if (!kpiDesc.evaluation_mode) {
      await queryInterface.addColumn("short_term_kpis", "evaluation_mode", {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: "number", // number | percentage | frequency
      });
    }

    const assignDesc = await queryInterface.describeTable("short_term_kpi_assignments");
    if (!assignDesc.evaluation_mode_override) {
      await queryInterface.addColumn("short_term_kpi_assignments", "evaluation_mode_override", {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: null,
      });
    }

    // Backfill seeded percentage KPIs based on unit text
    await queryInterface.sequelize.query(`
      UPDATE short_term_kpis
      SET evaluation_mode = 'percentage'
      WHERE unit ILIKE '%መቶኛ%' OR unit ILIKE '%percent%' OR unit = '%';
    `);
    await queryInterface.sequelize.query(`
      UPDATE short_term_kpis
      SET evaluation_mode = 'frequency'
      WHERE unit ILIKE '%ወራት%' OR unit ILIKE '%month%' OR unit ILIKE '%frequency%';
    `);
  },

  async down(queryInterface) {
    const kpiDesc = await queryInterface.describeTable("short_term_kpis");
    if (kpiDesc.evaluation_mode) {
      await queryInterface.removeColumn("short_term_kpis", "evaluation_mode");
    }
    const assignDesc = await queryInterface.describeTable("short_term_kpi_assignments");
    if (assignDesc.evaluation_mode_override) {
      await queryInterface.removeColumn("short_term_kpi_assignments", "evaluation_mode_override");
    }
  },
};
