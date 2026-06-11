"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_versions
            SET is_locked = false,
                status = CASE
                    WHEN status IN ('locked', 'active') THEN 'draft'
                    ELSE status
                END
            WHERE version_kind IN ('annual', 'execution_period')
              AND status != 'completed'
        `);
    },

    async down(queryInterface) {
        // Intentionally no-op — prior lock/active state is not restored.
    },
};
