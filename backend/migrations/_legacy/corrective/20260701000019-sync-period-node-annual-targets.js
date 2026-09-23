"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_nodes AS period_node
            SET annual_target = annual_node.annual_target
            FROM plan_nodes AS annual_node,
                 plan_versions AS period_version,
                 plan_versions AS annual_version
            WHERE period_node.plan_version_id = period_version.plan_version_id
              AND period_version.version_kind = 'execution_period'
              AND period_version.parent_plan_version_id = annual_version.plan_version_id
              AND annual_version.version_kind = 'annual'
              AND period_node.source_plan_node_id = annual_node.plan_node_id
              AND annual_node.plan_version_id = annual_version.plan_version_id
              AND period_node.annual_target IS DISTINCT FROM annual_node.annual_target
        `);
    },

    async down() {
        // Cannot restore previous stale values
    },
};
