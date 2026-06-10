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
    reactivateGovernmentStructure,
    deleteGovernmentStructure,
    addUsersToStructure,
    removeUserFromStructure,
    addPermissionGroupsToStructure,
    removePermissionGroupFromStructure,
} = require("../../controllers/structure/governmentStructureController");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

// ================= CRUD =================

router.post("/", authenticateToken, checkPermission("GOVERNMENT_STRUCTURES", "CREATE"), validateCreateGovernmentStructure, createGovernmentStructure);
router.get("/", authenticateToken, getGovernmentStructures);
router.get("/:id", authenticateToken, getGovernmentStructureById);
router.put("/:id", authenticateToken, checkPermission("GOVERNMENT_STRUCTURES", "UPDATE"), validateUpdateGovernmentStructure, updateGovernmentStructure);
router.patch("/:id/reactivate", authenticateToken, checkPermission("GOVERNMENT_STRUCTURES", "UPDATE"), reactivateGovernmentStructure);
router.delete("/:id", authenticateToken, checkPermission("GOVERNMENT_STRUCTURES", "DELETE"), deleteGovernmentStructure);

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