"use strict";
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { assertDemoSeedAllowed } = require("../utils/assertDemoSeedAllowed");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const USER_ROLE_ID = "00000000-0000-4000-8000-000000000003";
const REGULAR_USER_ID = "00000000-0000-4000-8000-000000000004";

async function countById(queryInterface, table, idColumn, id) {
  const rows = await queryInterface.sequelize.query(
    `SELECT COUNT(*)::int AS count FROM ${table} WHERE ${idColumn} = :id`,
    { replacements: { id }, type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  return rows[0]?.count ?? 0;
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!assertDemoSeedAllowed("demo-users")) return;
    const now = new Date();
    const passwordHash = await bcrypt.hash("password", 10);

    const adminExists =
      (await countById(queryInterface, "users", "user_id", ADMIN_USER_ID)) > 0;
    if (!adminExists) {
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
          account_type: "INTERNAL",
          created_at: now,
          updated_at: now,
        },
        {
          user_id: REGULAR_USER_ID,
          full_name: "Regular User",
          email: "user@gmail.com",
          password: passwordHash,
          phone_number: "251911000002",
          profile_image: null,
          is_first_logged_in: false,
          last_login_at: null,
          password_changed_at: null,
          is_active: true,
          account_type: "INTERNAL",
          created_at: now,
          updated_at: now,
        },
      ]);

      await queryInterface.bulkInsert("internal_user_profiles", [
        {
          profile_id: uuidv4(),
          user_id: ADMIN_USER_ID,
          metadata: JSON.stringify({}),
          created_at: now,
          updated_at: now,
        },
        {
          profile_id: uuidv4(),
          user_id: REGULAR_USER_ID,
          metadata: JSON.stringify({}),
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const superAdminRoleExists =
      (await countById(queryInterface, "roles", "role_id", SUPER_ADMIN_ROLE_ID)) >
      0;
    if (!superAdminRoleExists) {
      await queryInterface.bulkInsert("roles", [
        {
          role_id: SUPER_ADMIN_ROLE_ID,
          name: "Super Admin",
          description: "Full access to all system resources and actions.",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
        {
          role_id: USER_ROLE_ID,
          name: "User",
          description: "Standard user with no assigned permissions.",
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const rolePermCount = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count FROM role_permissions WHERE role_id = :roleId`,
      {
        replacements: { roleId: SUPER_ADMIN_ROLE_ID },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    if ((rolePermCount[0]?.count ?? 0) === 0) {
      const permissions = await queryInterface.sequelize.query(
        `SELECT permission_id FROM permissions;`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (permissions && permissions.length > 0) {
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
    }

    const adminRoleAssigned = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS count FROM user_roles WHERE user_id = :userId AND role_id = :roleId`,
      {
        replacements: { userId: ADMIN_USER_ID, roleId: SUPER_ADMIN_ROLE_ID },
        type: Sequelize.QueryTypes.SELECT,
      }
    );
    if ((adminRoleAssigned[0]?.count ?? 0) === 0) {
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
        {
          user_role_id: uuidv4(),
          user_id: REGULAR_USER_ID,
          role_id: USER_ROLE_ID,
          assigned_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
        },
      ]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete(
      "user_roles",
      { user_id: [ADMIN_USER_ID, REGULAR_USER_ID] },
      {}
    );
    await queryInterface.bulkDelete("role_permissions", { role_id: SUPER_ADMIN_ROLE_ID }, {});
    await queryInterface.bulkDelete(
      "internal_user_profiles",
      { user_id: [ADMIN_USER_ID, REGULAR_USER_ID] },
      {}
    );
    await queryInterface.bulkDelete(
      "roles",
      { role_id: [SUPER_ADMIN_ROLE_ID, USER_ROLE_ID] },
      {}
    );
    await queryInterface.bulkDelete(
      "users",
      { user_id: [ADMIN_USER_ID, REGULAR_USER_ID] },
      {}
    );
  },
};
