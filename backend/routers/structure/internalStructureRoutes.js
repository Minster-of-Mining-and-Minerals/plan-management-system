const express = require("express");
const router = express.Router();

const {
    createInternalStructure,
    getInternalStructures,
    getInternalStructureById,
    updateInternalStructure,
    reactivateInternalStructure,
    deleteInternalStructure,
    assignUsersToInternalStructure,
    removeUserFromInternalStructure,
} = require("../../controllers/structure/internalStructureController");

const {
    validateCreateInternalStructure,
    validateUpdateInternalStructure,
    validateAssignUsers,
    validateRemoveUser,
} = require("../../validators/structure/internalStructureValidator");

const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

/**
 * CRUD
 */
router.post("/", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "CREATE"), validateCreateInternalStructure, createInternalStructure);
router.get("/", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "READ"), getInternalStructures);
router.get("/:id", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "READ"), getInternalStructureById);
router.put("/:id", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "UPDATE"), validateUpdateInternalStructure, updateInternalStructure);
router.patch("/:id/reactivate", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "UPDATE"), reactivateInternalStructure);
router.delete("/:id", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "DELETE"), deleteInternalStructure);

/**
 * USER MANAGEMENT
 */
router.post("/assign-users", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "UPDATE"), validateAssignUsers, assignUsersToInternalStructure);
router.post("/remove-user", authenticateToken, checkPermission("INTERNAL_STRUCTURES", "UPDATE"), validateRemoveUser, removeUserFromInternalStructure);

module.exports = router;
