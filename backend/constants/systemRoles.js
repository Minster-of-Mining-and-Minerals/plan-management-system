"use strict";

/** Seeded Super Admin — private scope, visible only to Super Admin */
const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000002";
const SUPER_ADMIN_ROLE_NAME = "Super Admin";

/** Seeded base User role — global scope, visible to all structures */
const USER_ROLE_ID = "10000000-0000-4000-8000-000000000010";
const USER_ROLE_NAME = "User";

const ROLE_SCOPE = {
  GLOBAL: "global",
  PRIVATE: "private",
  STRUCTURE: "structure",
};

/** System roles with global scope (all structures) */
const GLOBAL_ROLE_IDS = new Set([USER_ROLE_ID]);

/** System roles with private scope (Super Admin only) */
const PRIVATE_ROLE_IDS = new Set([SUPER_ADMIN_ROLE_ID]);

/** Global roles structures may assign to their users */
const STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS = new Set([USER_ROLE_ID]);

/** Roles that cannot be deleted */
const SYSTEM_PROTECTED_ROLE_IDS = new Set([
  SUPER_ADMIN_ROLE_ID,
  USER_ROLE_ID,
]);

module.exports = {
  SUPER_ADMIN_ROLE_ID,
  SUPER_ADMIN_ROLE_NAME,
  USER_ROLE_ID,
  USER_ROLE_NAME,
  ROLE_SCOPE,
  GLOBAL_ROLE_IDS,
  PRIVATE_ROLE_IDS,
  STRUCTURE_ASSIGNABLE_GLOBAL_ROLE_IDS,
  SYSTEM_PROTECTED_ROLE_IDS,
};
