"use strict";

const { seedRegionalTestUsers } = require("../scripts/seed-regional-test-users");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log("[MIGRATION] Running seedRegionalTestUsers migration...");
    await seedRegionalTestUsers();
  },

  down: async (queryInterface, Sequelize) => {
    // Reversible if needed
    console.log("[MIGRATION] seedRegionalTestUsers down migration (noop)");
  },
};
