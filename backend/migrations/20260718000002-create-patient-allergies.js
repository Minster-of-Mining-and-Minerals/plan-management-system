"use strict";

const {
  timestampColumns,
  createTableIfNotExists,
  dropTableIfExists,
  safeAddIndex,
} = require("./_helpers/migrationUtils");

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = timestampColumns(Sequelize);

    await createTableIfNotExists(queryInterface, "patient_allergies", {
      allergy_id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      patient_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      allergen: {
        type: Sequelize.STRING(150),
        allowNull: false,
      },
      severity: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: "MEDIUM", // LOW, MEDIUM, HIGH, CRITICAL
      },
      reaction: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: "users", key: "user_id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      ...ts,
    });

    await safeAddIndex(queryInterface, "patient_allergies", ["patient_id"]);
  },

  async down(queryInterface, Sequelize) {
    await dropTableIfExists(queryInterface, "patient_allergies");
  },
};
