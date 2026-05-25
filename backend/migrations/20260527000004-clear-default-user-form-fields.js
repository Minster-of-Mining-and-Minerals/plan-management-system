"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkDelete("form_fields", { model_name: "User" });
  },

  async down() {
    // Intentionally empty — defaults are not restored.
  },
};
