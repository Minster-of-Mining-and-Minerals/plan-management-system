"use strict";

/**
 * Ensures the Super Admin role exists before later migrations grant
 * permissions to it. On a fresh database the role is otherwise only created
 * by the seed-permissions seeder, which runs after all migrations, causing
 * FK violations on role_permissions.role_id.
 *
 * Idempotent: does nothing if the role already exists (by id or by name in
 * the private scope). The seeder still runs later and normalizes the row.
 */

const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `INSERT INTO roles (role_id, name, description, scope, government_structure_id, is_active, created_at, updated_at)
       SELECT :roleId, 'Super Admin', 'Full access to all system resources and actions.', 'private', NULL, true, NOW(), NOW()
       WHERE NOT EXISTS (
         SELECT 1 FROM roles
         WHERE role_id = :roleId
            OR (LOWER(name) = 'super admin' AND scope = 'private' AND deleted_at IS NULL)
       )`,
      { replacements: { roleId: SUPER_ADMIN_ROLE_ID } }
    );
  },

  async down() {
    // No-op: the role is owned by the seed-permissions seeder; removing it
    // here would break data created by later migrations/seeders.
  },
};
