"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            WITH ranked AS (
                SELECT
                    plan_node_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY plan_version_id, parent_id
                        ORDER BY created_at ASC, plan_node_id ASC
                    ) - 1 AS new_order
                FROM plan_nodes
            )
            UPDATE plan_nodes AS pn
            SET "order" = ranked.new_order
            FROM ranked
            WHERE pn.plan_node_id = ranked.plan_node_id
              AND pn."order" IS DISTINCT FROM ranked.new_order
        `);
    },

    async down() {
        // Cannot restore previous order values
    },
};
