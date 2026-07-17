"use strict";

const express = require("express");
const router = express.Router();

const {
  validateCreatePermissionGroup,
  validateUpdatePermissionGroup,
  validateAddPermissions,
  validateRemovePermission,
  validateAddUsers,
  validateRemoveUser,
} = require("../../validators/user/permissionGroupValidator");

const {
  createPermissionGroup,
  getPermissionGroups,
  getPermissionGroupById,
  updatePermissionGroup,
  deletePermissionGroup,
  addPermissionsToGroup,
  removePermissionFromGroup,
  addUsersToGroup,
  removeUserFromGroup,
} = require("../../controllers/user/permissionGroupController");

const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.post(
  "/",
  checkPermission("permission_groups", "create"),
  validateCreatePermissionGroup,
  createPermissionGroup
);
router.get("/", checkPermission("permission_groups", "read"), getPermissionGroups);
router.get(
  "/:id",
  checkPermission("permission_groups", "read"),
  getPermissionGroupById
);
router.put(
  "/:id",
  checkPermission("permission_groups", "update"),
  validateUpdatePermissionGroup,
  updatePermissionGroup
);
router.delete(
  "/:id",
  checkPermission("permission_groups", "delete"),
  deletePermissionGroup
);

router.post(
  "/add-permissions",
  checkPermission("permission_groups", "assign_permission"),
  validateAddPermissions,
  addPermissionsToGroup
);
router.post(
  "/remove-permission",
  checkPermission("permission_groups", "remove_permission"),
  validateRemovePermission,
  removePermissionFromGroup
);
router.post(
  "/add-users",
  checkPermission("permission_groups", "add_user"),
  validateAddUsers,
  addUsersToGroup
);
router.post(
  "/remove-user",
  checkPermission("permission_groups", "remove_user"),
  validateRemoveUser,
  removeUserFromGroup
);

module.exports = router;
