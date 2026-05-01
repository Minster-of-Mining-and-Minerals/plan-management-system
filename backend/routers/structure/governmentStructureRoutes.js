const express = require("express");
const router = express.Router();

const {
    validateCreateGovernmentStructure,
    validateUpdateGovernmentStructure,
    validateAddUsers,
    validateRemoveUser,
    validateAddPermissionGroups,
    validateRemovePermissionGroup,
} = require("../../validators/structure/governmentStructureValidator");

const {
    createGovernmentStructure,
    getGovernmentStructures,
    getGovernmentStructureById,
    updateGovernmentStructure,
    deleteGovernmentStructure,
    addUsersToStructure,
    removeUserFromStructure,
    addPermissionGroupsToStructure,
    removePermissionGroupFromStructure,
} = require("../../controllers/structure/governmentStructureController");

// ================= CRUD =================

router.post("/", validateCreateGovernmentStructure, createGovernmentStructure);
router.get("/", getGovernmentStructures);
router.get("/:id", getGovernmentStructureById);
router.put("/:id", validateUpdateGovernmentStructure, updateGovernmentStructure);
router.delete("/:id", deleteGovernmentStructure);

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