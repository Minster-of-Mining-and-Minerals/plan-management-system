"use strict";

const { createTableIfNotExists, dropEnumTypes } = require("./helpers/schemaHelpers");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE enum_plan_versions_review_status AS ENUM (
          'under_review',
          'corrections_unlocked',
          'review_completed'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryInterface.addColumn("plan_versions", "review_status", {
      type: Sequelize.ENUM("under_review", "corrections_unlocked", "review_completed"),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn("plan_versions", "published_for_review_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_versions", "review_unlocked_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addColumn("plan_versions", "review_completed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_plan_versions_review_status
      ON plan_versions (review_status)
      WHERE review_status IS NOT NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_versions", "review_completed_at");
    await queryInterface.removeColumn("plan_versions", "review_unlocked_at");
    await queryInterface.removeColumn("plan_versions", "published_for_review_at");
    await queryInterface.removeColumn("plan_versions", "review_status");
    await dropEnumTypes(queryInterface, ["enum_plan_versions_review_status"]);
  },
};
