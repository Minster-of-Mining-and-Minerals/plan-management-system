"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_versions AS master
            SET period_subdivision_mode = annual_modes.mode
            FROM (
                SELECT
                    parent_plan_version_id AS master_id,
                    MIN(period_subdivision_mode::text)::enum_plan_versions_period_subdivision_mode AS mode
                FROM plan_versions
                WHERE version_kind = 'annual'
                  AND period_subdivision_mode IS NOT NULL
                GROUP BY parent_plan_version_id
                HAVING COUNT(DISTINCT period_subdivision_mode) = 1
                   AND COUNT(*) = COUNT(period_subdivision_mode)
            ) AS annual_modes
            WHERE master.plan_version_id = annual_modes.master_id
              AND master.version_kind = 'master'
              AND master.period_subdivision_mode IS NULL
        `);
    },

    async down() {
        // No-op: master-level subdivision mode is additive
    },
};
