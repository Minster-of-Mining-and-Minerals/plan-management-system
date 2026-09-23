"use strict";

const { dedupePermissions } = require("../utils/permissionSeedUtils");

const UNIQUE_INDEX = "idx_permissions_resource_action_unique";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const mergedGroups = await dedupePermissions(queryInterface);
    if (mergedGroups > 0) {
      console.log(`Merged ${mergedGroups} duplicate permission group(s).`);
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ${UNIQUE_INDEX}
      ON permissions (lower(resource), lower(action))
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS ${UNIQUE_INDEX}`);
  },
};
