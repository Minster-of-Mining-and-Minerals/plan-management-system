"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        const tables = await queryInterface.showAllTables();
        const tableNames = tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]));

        const orphanPeriods = await queryInterface.sequelize.query(
            `
            SELECT ep.plan_version_id
            FROM plan_versions ep
            INNER JOIN plan_versions annual
                ON annual.plan_version_id = ep.parent_plan_version_id
               AND annual.version_kind = 'annual'
            WHERE ep.version_kind = 'execution_period'
              AND annual.period_subdivision_mode IS NULL
            `,
            { type: queryInterface.sequelize.QueryTypes.SELECT }
        );

        if (orphanPeriods.length === 0) {
            return;
        }

        const periodVersionIds = orphanPeriods.map((row) => row.plan_version_id);
        const nodes = await queryInterface.sequelize.query(
            `
            SELECT plan_node_id
            FROM plan_nodes
            WHERE plan_version_id IN (:periodVersionIds)
            `,
            {
                replacements: { periodVersionIds },
                type: queryInterface.sequelize.QueryTypes.SELECT,
            }
        );
        const nodeIds = nodes.map((row) => row.plan_node_id);

        if (nodeIds.length > 0) {
            if (tableNames.includes("plan_node_action_logs")) {
                await queryInterface.bulkDelete("plan_node_action_logs", {
                    plan_node_id: nodeIds,
                });
            }
            await queryInterface.bulkDelete("internal_assignments", {
                plan_node_id: nodeIds,
            });
            await queryInterface.bulkDelete("external_assignments", {
                plan_node_id: nodeIds,
            });
            await queryInterface.bulkDelete("plan_nodes", {
                plan_version_id: periodVersionIds,
            });
        }

        await queryInterface.bulkDelete("plan_versions", {
            plan_version_id: periodVersionIds,
        });
    },

    async down() {
        // Orphan removal is not reversible
    },
};
