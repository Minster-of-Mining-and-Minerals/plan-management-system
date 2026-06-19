"use strict";
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { QueryTypes } = require("sequelize");

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";

const PERMISSIONS = [
  { resource: "dashboard", action: "view" },
  { resource: "users", action: "create" },
  { resource: "users", action: "read" },
  { resource: "users", action: "update" },
  { resource: "users", action: "delete" },
  { resource: "users", action: "assign_role" },
  { resource: "permissions", action: "read" },
  { resource: "permissions", action: "update" },
  { resource: "permission_groups", action: "create" },
  { resource: "permission_groups", action: "read" },
  { resource: "permission_groups", action: "update" },
  { resource: "permission_groups", action: "delete" },
  { resource: "permission_groups", action: "assign_permission" },
  { resource: "permission_groups", action: "remove_permission" },
  { resource: "permission_groups", action: "add_user" },
  { resource: "permission_groups", action: "remove_user" },
  { resource: "permission_groups", action: "add_structure" },
  { resource: "permission_groups", action: "remove_structure" },
  { resource: "roles", action: "create" },
  { resource: "roles", action: "read" },
  { resource: "roles", action: "update" },
  { resource: "roles", action: "delete" },
  { resource: "roles", action: "assign_permission" },
  { resource: "government_structures", action: "create" },
  { resource: "government_structures", action: "read" },
  { resource: "government_structures", action: "update" },
  { resource: "government_structures", action: "delete" },
  { resource: "internal_structures", action: "create" },
  { resource: "internal_structures", action: "read" },
  { resource: "internal_structures", action: "update" },
  { resource: "internal_structures", action: "delete" },
  { resource: "plans", action: "create" },
  { resource: "plans", action: "read" },
  { resource: "plans", action: "update" },
  { resource: "plans", action: "delete" },
  { resource: "plans", action: "approve" },
  { resource: "plans", action: "submit" },
  { resource: "plans", action: "edit_finalized" },
  { resource: "plan", action: "start_process" },
  { resource: "plan", action: "complete_annual" },
  { resource: "plan", action: "complete_period" },
  { resource: "plan", action: "finalize" },
  { resource: "plan", action: "draft_publish" },
  { resource: "plan_assignments", action: "create" },
  { resource: "plan_assignments", action: "read" },
  { resource: "plan_assignments", action: "update" },
  { resource: "plan_assignments", action: "delete" },
  { resource: "plan_rules", action: "create" },
  { resource: "plan_rules", action: "read" },
  { resource: "plan_rules", action: "update" },
  { resource: "plan_rules", action: "delete" },
  { resource: "plan_assignment_actions", action: "create" },
  { resource: "plan_assignment_actions", action: "read" },
  { resource: "plan_assignment_actions", action: "update" },
  { resource: "plan_assignment_actions", action: "delete" },
  { resource: "action_logs", action: "create" },
  { resource: "action_logs", action: "read" },
  { resource: "action_logs", action: "update" },
  { resource: "performance_color_thresholds", action: "create" },
  { resource: "performance_color_thresholds", action: "read" },
  { resource: "performance_color_thresholds", action: "update" },
  { resource: "performance_color_thresholds", action: "delete" },
  { resource: "branding_settings", action: "read" },
  { resource: "branding_settings", action: "update" },
  { resource: "system_settings", action: "read" },
  { resource: "system_settings", action: "update" },
  { resource: "system_audit_logs", action: "read" },
  { resource: "issues", action: "create" },
  { resource: "issues", action: "read" },
  { resource: "issues", action: "read_own" },
  { resource: "issues", action: "read_assigned" },
  { resource: "issues", action: "read_all" },
  { resource: "issues", action: "review" },
  { resource: "issues", action: "resolve" },
  { resource: "issues", action: "close" },
  { resource: "issue_categories", action: "create" },
  { resource: "issue_categories", action: "read" },
  { resource: "issue_categories", action: "update" },
  { resource: "issue_categories", action: "delete" },
  { resource: "issue_categories", action: "configure_form" },
  { resource: "plan", action: "publish_for_review" },
  { resource: "plan", action: "view_assigned_review" },
  { resource: "plan", action: "complete_review" },
  { resource: "plan", action: "unlock_review_corrections" },
  { resource: "plan", action: "republish_review" },
  { resource: "plan", action: "raise_review_issue" },
  { resource: "plan", action: "view_own_review_issues" },
  { resource: "plan", action: "view_review_dashboard" },
];

function dedupePermissions(permissions) {
  const seen = new Set();
  const unique = [];
  const duplicates = [];

  for (const perm of permissions) {
    const resource = String(perm.resource).trim().toLowerCase();
    const action = String(perm.action).trim().toLowerCase();
    const key = `${resource}:${action}`;

    if (seen.has(key)) {
      duplicates.push(key);
      continue;
    }

    seen.add(key);
    unique.push({ resource, action });
  }

  if (duplicates.length > 0) {
    throw new Error(
      `Duplicate permissions in seeder (resource:action): ${[...new Set(duplicates)].join(", ")}`
    );
  }

  return unique;
}

const UNIQUE_PERMISSIONS = dedupePermissions(PERMISSIONS);

async function ensurePermission(queryInterface, perm, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT permission_id FROM permissions WHERE resource = :resource AND action = :action LIMIT 1`,
    {
      replacements: { resource: perm.resource, action: perm.action },
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) {
    return existing[0].permission_id;
  }

  const permissionId = uuidv4();
  await queryInterface.bulkInsert("permissions", [
    {
      permission_id: permissionId,
      resource: perm.resource,
      action: perm.action,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
  return permissionId;
}

async function ensureRolePermission(queryInterface, roleId, permissionId, now) {
  const existing = await queryInterface.sequelize.query(
    `SELECT role_permission_id FROM role_permissions
     WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
    {
      replacements: { roleId, permissionId },
      type: QueryTypes.SELECT,
    }
  );

  if (existing.length > 0) return;

  await queryInterface.bulkInsert("role_permissions", [
    {
      role_permission_id: uuidv4(),
      role_id: roleId,
      permission_id: permissionId,
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  ]);
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const permissionIds = [];

    for (const perm of UNIQUE_PERMISSIONS) {
      const permissionId = await ensurePermission(queryInterface, perm, now);
      permissionIds.push(permissionId);
    }

    const existingRole = await queryInterface.sequelize.query(
      `SELECT role_id FROM roles WHERE role_id = :roleId LIMIT 1`,
      { replacements: { roleId: SUPER_ADMIN_ROLE_ID }, type: QueryTypes.SELECT }
    );

    if (existingRole.length === 0) {
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
    }

    for (const permissionId of permissionIds) {
      await ensureRolePermission(queryInterface, SUPER_ADMIN_ROLE_ID, permissionId, now);
    }

    const existingUser = await queryInterface.sequelize.query(
      `SELECT user_id FROM users WHERE user_id = :userId LIMIT 1`,
      { replacements: { userId: ADMIN_USER_ID }, type: QueryTypes.SELECT }
    );

    if (existingUser.length === 0) {
      const passwordHash = await bcrypt.hash("password", 10);
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
          government_structure_id: null,
          internal_structure_id: null,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    const existingUserRole = await queryInterface.sequelize.query(
      `SELECT user_role_id FROM user_roles WHERE user_id = :userId AND role_id = :roleId LIMIT 1`,
      {
        replacements: { userId: ADMIN_USER_ID, roleId: SUPER_ADMIN_ROLE_ID },
        type: QueryTypes.SELECT,
      }
    );

    if (existingUserRole.length === 0) {
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
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete("user_roles", { user_id: ADMIN_USER_ID }, {});
    await queryInterface.bulkDelete("role_permissions", { role_id: SUPER_ADMIN_ROLE_ID }, {});
    await queryInterface.bulkDelete("roles", { role_id: SUPER_ADMIN_ROLE_ID }, {});
    await queryInterface.bulkDelete("users", { user_id: ADMIN_USER_ID }, {});

    for (const perm of UNIQUE_PERMISSIONS) {
      await queryInterface.bulkDelete("permissions", {
        resource: perm.resource,
        action: perm.action,
      });
    }
  },
};