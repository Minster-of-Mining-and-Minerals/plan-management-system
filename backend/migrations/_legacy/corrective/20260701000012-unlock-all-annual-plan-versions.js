"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface) {
        await queryInterface.sequelize.query(`
            UPDATE plan_versions
            SET is_locked = false
            WHERE version_kind = 'annual'
              AND is_locked = true
              AND status != 'completed'
        `);
    },

    async down(queryInterface) {
        // Intentionally no-op — prior lock state is not restored.
    },
};
