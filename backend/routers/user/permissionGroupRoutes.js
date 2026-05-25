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

router.post("/", validateCreatePermissionGroup, createPermissionGroup);
router.get("/", getPermissionGroups);
router.get("/:id", getPermissionGroupById);
router.put("/:id", validateUpdatePermissionGroup, updatePermissionGroup);
router.delete("/:id", deletePermissionGroup);

router.post(
    "/add-permissions",
    validateAddPermissions,
    addPermissionsToGroup
);

router.post(
    "/remove-permission",
    validateRemovePermission,
    removePermissionFromGroup
);

router.post("/add-users", validateAddUsers, addUsersToGroup);
router.post("/remove-user", validateRemoveUser, removeUserFromGroup);

module.exports = router;
