"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_nodes AS derived
            SET "order" = source."order"
            FROM plan_nodes AS source,
                 plan_versions AS derived_version
            WHERE derived.source_plan_node_id = source.plan_node_id
              AND derived.plan_version_id = derived_version.plan_version_id
              AND derived_version.version_kind = 'annual'
              AND source.plan_version_id = derived_version.parent_plan_version_id
              AND derived."order" IS DISTINCT FROM source."order"
        `);

        await queryInterface.sequelize.query(`
            UPDATE plan_nodes AS derived
            SET "order" = source."order"
            FROM plan_nodes AS source,
                 plan_versions AS period_version,
                 plan_versions AS annual_version
            WHERE derived.source_plan_node_id = source.plan_node_id
              AND derived.plan_version_id = period_version.plan_version_id
              AND period_version.version_kind = 'execution_period'
              AND period_version.parent_plan_version_id = annual_version.plan_version_id
              AND annual_version.version_kind = 'annual'
              AND source.plan_version_id = annual_version.plan_version_id
              AND derived."order" IS DISTINCT FROM source."order"
        `);
    },

    async down() {
        // Cannot restore previous order values
    },
};
