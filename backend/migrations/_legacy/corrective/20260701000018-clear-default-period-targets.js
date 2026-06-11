"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_nodes AS pn
            SET period_target = NULL
            FROM plan_versions AS period_version
            INNER JOIN plan_versions AS annual_version
                ON annual_version.plan_version_id = period_version.parent_plan_version_id
               AND annual_version.version_kind = 'annual'
            INNER JOIN plan_versions AS master_version
                ON master_version.plan_version_id = annual_version.parent_plan_version_id
               AND master_version.version_kind = 'master'
            WHERE pn.plan_version_id = period_version.plan_version_id
              AND period_version.version_kind = 'execution_period'
              AND master_version.period_targets_finalized_at IS NULL
              AND pn.period_target IS NOT NULL
        `);
    },

    async down() {
        // Cannot restore cleared period targets
    },
};
