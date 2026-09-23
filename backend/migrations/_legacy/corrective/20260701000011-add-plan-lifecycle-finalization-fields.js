"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn("plan_versions", "annual_targets_finalized_at", {
            type: Sequelize.DATE,
            allowNull: true,
        });

        await queryInterface.addColumn("plan_versions", "period_subdivision_mode", {
            type: Sequelize.ENUM("quarterly", "semi_annual", "custom"),
            allowNull: true,
        });

        await queryInterface.addColumn("plan_versions", "period_targets_finalized_at", {
            type: Sequelize.DATE,
            allowNull: true,
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("plan_versions", "period_targets_finalized_at");
        await queryInterface.removeColumn("plan_versions", "period_subdivision_mode");
        await queryInterface.removeColumn("plan_versions", "annual_targets_finalized_at");
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_plan_versions_period_subdivision_mode";'
        );
    },
};
