"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("plan_versions", "review_version_number", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      WITH numbered AS (
        SELECT
          plan_version_id,
          ROW_NUMBER() OVER (
            PARTITION BY review_snapshot_of_version_id
            ORDER BY created_at ASC
          ) AS rn
        FROM plan_versions
        WHERE version_kind = 'master'
          AND review_snapshot_of_version_id IS NOT NULL
          AND parent_plan_version_id IS NULL
      )
      UPDATE plan_versions pv
      SET review_version_number = numbered.rn
      FROM numbered
      WHERE pv.plan_version_id = numbered.plan_version_id
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("plan_versions", "review_version_number");
  },
};
