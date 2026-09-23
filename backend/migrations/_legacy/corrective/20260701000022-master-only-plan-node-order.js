"use strict";

/**
 * Plan node order is owned only by master plan versions.
 * Annual and execution-period nodes mirror their source node order.
 */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            WITH ranked AS (
                SELECT
                    pn.plan_node_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY pn.plan_version_id, pn.parent_id
                        ORDER BY pn.created_at ASC, pn.plan_node_id ASC
                    ) - 1 AS new_order
                FROM plan_nodes pn
                INNER JOIN plan_versions pv ON pv.plan_version_id = pn.plan_version_id
                WHERE pv.version_kind = 'master'
            )
            UPDATE plan_nodes AS pn
            SET "order" = ranked.new_order
            FROM ranked
            WHERE pn.plan_node_id = ranked.plan_node_id
              AND pn."order" IS DISTINCT FROM ranked.new_order
        `);

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
