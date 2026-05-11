const express = require("express");
const router = express.Router();

const {
    validateCreateStructure,
    validateUpdateStructure,
    validateAddUsers,
    validateRemoveUser,
    validateAddPermissionGroups,
    validateRemovePermissionGroup,
} = require("../../validators/structure/structureValidator");

const {
    createStructure,
    getStructures,
    getStructureById,
    updateStructure,
    deleteStructure,
    addUsersToStructure,
    removeUserFromStructure,
    addPermissionGroupsToStructure,
    removePermissionGroupFromStructure,
} = require("../../controllers/structure/structureController");

// ================= CRUD =================

router.post("/", validateCreateStructure, createStructure);
router.get("/", getStructures);
router.get("/:id", getStructureById);
router.put("/:id", validateUpdateStructure, updateStructure);
router.delete("/:id", deleteStructure);

// ================= USERS =================

router.post("/users/add", validateAddUsers, addUsersToStructure);
router.post("/users/remove", validateRemoveUser, removeUserFromStructure);

// ================= PERMISSION GROUPS =================

router.post(
    "/permission-groups/add",
    validateAddPermissionGroups,
    addPermissionGroupsToStructure
);

router.post(
    "/permission-groups/remove",
    validateRemovePermissionGroup,
    removePermissionGroupFromStructure
);

module.exports = router;