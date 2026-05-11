"use strict";
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    // 1. Common password hash
    const passwordHash = await bcrypt.hash("password", 10);

    // 2. Insert Admin User (No structure IDs)
    await queryInterface.bulkInsert("users", [
      {
        user_id: ADMIN_USER_ID,
        full_name: "System Administrator",
        email: "admin@gmail.com",
        password: passwordHash,
        phone_number: "251911000001",
        profile_image: null,
        is_first_logged_in: false,
        last_login_at: null,
        password_changed_at: null,
        is_active: true,
        structure_id: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 3. Insert Super Admin Role
    await queryInterface.bulkInsert("roles", [
      {
        role_id: SUPER_ADMIN_ROLE_ID,
        name: "Super Admin",
        description: "Full access to all system resources and actions.",
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 4. Fetch all permission IDs
    const permissions = await queryInterface.sequelize.query(
      `SELECT permission_id FROM permissions;`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (permissions && permissions.length > 0) {
      // 5. Link all permissions to Super Admin Role
      const rolePermissions = permissions.map((p) => ({
        role_permission_id: uuidv4(),
        role_id: SUPER_ADMIN_ROLE_ID,
        permission_id: p.permission_id,
        is_active: true,
        created_at: now,
        updated_at: now,
      }));

      await queryInterface.bulkInsert("role_permissions", rolePermissions);
    }

    // 6. Assign Admin User to Super Admin Role
    await queryInterface.bulkInsert("user_roles", [
      {
        user_role_id: uuidv4(),
        user_id: ADMIN_USER_ID,
        role_id: SUPER_ADMIN_ROLE_ID,
        assigned_at: now,
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    // Delete in reverse order of dependencies
    await queryInterface.bulkDelete("user_roles", { user_id: ADMIN_USER_ID }, {});
    await queryInterface.bulkDelete("role_permissions", { role_id: SUPER_ADMIN_ROLE_ID }, {});
    await queryInterface.bulkDelete("roles", { role_id: SUPER_ADMIN_ROLE_ID }, {});
    await queryInterface.bulkDelete("users", { user_id: ADMIN_USER_ID }, {});
  },
};