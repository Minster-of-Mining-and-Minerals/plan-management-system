"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Alter default values for regions national reporting method to form_based
    await queryInterface.changeColumn("regions", "national_reporting_method", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "form_based",
    });

    await queryInterface.changeColumn("regions", "form_reporting_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    // 2. Update existing active regions to default to form_based reporting
    await queryInterface.sequelize.query(`
      UPDATE "regions"
      SET "national_reporting_method" = 'form_based',
          "form_reporting_active" = true
      WHERE "national_reporting_method" IS NULL 
         OR "national_reporting_method" = 'node_mapping';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("regions", "national_reporting_method", {
      type: Sequelize.STRING(50),
      allowNull: false,
      defaultValue: "node_mapping",
    });

    await queryInterface.changeColumn("regions", "form_reporting_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
  },
};

