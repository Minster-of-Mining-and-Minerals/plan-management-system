"use strict";

const {
  SUPER_ADMIN_ROLE_ID,
  USER_ROLE_ID,
  ROLE_SCOPE,
} = require("../constants/systemRoles");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE roles
      SET scope = :privateScope, government_structure_id = NULL
      WHERE role_id = :superAdminId
    `, {
      replacements: {
        privateScope: ROLE_SCOPE.PRIVATE,
        superAdminId: SUPER_ADMIN_ROLE_ID,
      },
    });

    await queryInterface.sequelize.query(`
      UPDATE roles
      SET scope = :globalScope, government_structure_id = NULL
      WHERE role_id = :userRoleId
    `, {
      replacements: {
        globalScope: ROLE_SCOPE.GLOBAL,
        userRoleId: USER_ROLE_ID,
      },
    });

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS roles_private_name_unique
      ON roles (LOWER(name))
      WHERE scope = 'private' AND deleted_at IS NULL
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_private_name_unique
    `);

    await queryInterface.sequelize.query(`
      UPDATE roles
      SET scope = :globalScope, government_structure_id = NULL
      WHERE role_id IN (:superAdminId, :userRoleId)
    `, {
      replacements: {
        globalScope: ROLE_SCOPE.GLOBAL,
        superAdminId: SUPER_ADMIN_ROLE_ID,
        userRoleId: USER_ROLE_ID,
      },
    });
  },
};
