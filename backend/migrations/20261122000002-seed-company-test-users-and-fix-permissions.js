"use strict";

const { seedCompanyTestUsers } = require("../scripts/seed-company-test-users");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log("[MIGRATION] Running seedCompanyTestUsers migration...");
    await seedCompanyTestUsers();
  },

  down: async (queryInterface, Sequelize) => {
    console.log("[MIGRATION] seedCompanyTestUsers down migration (noop)");
  },
};
