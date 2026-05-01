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
    validateAddStructures,
    validateRemoveStructure,
} = require("../../validators/user/permissionGroupValidator");

const {
    createPermissionGroup,
    getPermissionGroups,
    updatePermissionGroup,
    deletePermissionGroup,
    addPermissionsToGroup,
    removePermissionFromGroup,
    addUsersToGroup,
    removeUserFromGroup,
    addStructuresToGroup,
    removeStructureFromGroup,
} = require("../../controllers/user/permissionGroupController");

/**
 * @swagger
 * tags:
 *   name: PermissionGroups
 *   description: Manage permission groups and assignments
 */

/**
 * =================== CRUD ===================
 */
router.post("/", validateCreatePermissionGroup, createPermissionGroup);

router.get("/", getPermissionGroups);

router.put("/:id", validateUpdatePermissionGroup, updatePermissionGroup);

router.delete("/:id", deletePermissionGroup);

/**
 * =================== PERMISSIONS ===================
 */
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

/**
 * =================== USERS ===================
 */
router.post("/add-users", validateAddUsers, addUsersToGroup);

router.post("/remove-user", validateRemoveUser, removeUserFromGroup);

/**
 * =================== GOVERNMENT STRUCTURES ===================
 */
router.post(
    "/add-structures",
    validateAddStructures,
    addStructuresToGroup
);

router.post(
    "/remove-structure",
    validateRemoveStructure,
    removeStructureFromGroup
);

module.exports = router;