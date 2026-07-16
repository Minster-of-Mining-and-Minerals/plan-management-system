"use strict";

const {
  SUPER_ADMIN_ROLE_ID,
  USER_ROLE_ID,
  ROLE_SCOPE,
} = require("../constants/systemRoles");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("roles");

    if (!table.government_structure_id) {
      await queryInterface.addColumn("roles", "government_structure_id", {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: "government_structures",
          key: "government_structure_id",
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    if (!table.scope) {
      await queryInterface.addColumn("roles", "scope", {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: ROLE_SCOPE.STRUCTURE,
      });
    }

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

    await queryInterface.sequelize.query(`
      UPDATE roles
      SET scope = :structureScope
      WHERE role_id NOT IN (:superAdminId, :userRoleId)
        AND (scope IS NULL OR scope = '')
    `, {
      replacements: {
        structureScope: ROLE_SCOPE.STRUCTURE,
        superAdminId: SUPER_ADMIN_ROLE_ID,
        userRoleId: USER_ROLE_ID,
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_name_key
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_name_unique
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS roles_global_name_unique
      ON roles (LOWER(name))
      WHERE scope = 'global' AND deleted_at IS NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS roles_structure_name_unique
      ON roles (LOWER(name), government_structure_id)
      WHERE scope = 'structure' AND deleted_at IS NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_government_structure_id
      ON roles (government_structure_id)
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_roles_government_structure_id
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_structure_name_unique
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS roles_global_name_unique
    `);

    const table = await queryInterface.describeTable("roles");

    if (table.scope) {
      await queryInterface.removeColumn("roles", "scope");
    }
    if (table.government_structure_id) {
      await queryInterface.removeColumn("roles", "government_structure_id");
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS roles_name_key ON roles (name)
    `);
  },
};
