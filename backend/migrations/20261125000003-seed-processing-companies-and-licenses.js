"use strict";

const seedProcessingCompanies = require("../scripts/seed-processing-companies");

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("[MIGRATION] Running seedProcessingCompanies...");
    await seedProcessingCompanies();
  },

  async down(queryInterface, Sequelize) {
    // Idempotent migration - data preserved
  },
};
