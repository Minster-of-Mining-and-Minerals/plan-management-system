"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_versions AS annual
            SET status = 'draft',
                is_locked = false
            FROM plan_versions AS master
            WHERE annual.version_kind = 'annual'
              AND annual.parent_plan_version_id = master.plan_version_id
              AND master.version_kind = 'master'
              AND master.annual_targets_finalized_at IS NULL
              AND annual.status = 'locked'
              AND annual.status != 'completed'
        `);
    },

    async down(queryInterface) {
        // Intentionally no-op — prior status is not restored.
    },
};
