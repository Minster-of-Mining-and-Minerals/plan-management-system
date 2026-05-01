const express = require("express");
const router = express.Router();

const {
    createInternalStructure,
    getInternalStructures,
    getInternalStructureById,
    updateInternalStructure,
    deleteInternalStructure,
    toggleInternalStructureStatus,
    assignUsersToInternalStructure,
    removeUserFromInternalStructure,
} = require("../../controllers/structure/internalStructureController");

const {
    validateCreateInternalStructure,
    validateUpdateInternalStructure,
    validateAssignUsers,
    validateRemoveUser,
} = require("../../validators/structure/internalStructureValidator");

/**
 * CRUD
 */
router.post("/", validateCreateInternalStructure, createInternalStructure);
router.get("/", getInternalStructures);
router.get("/:id", getInternalStructureById);
router.put("/:id", validateUpdateInternalStructure, updateInternalStructure);
router.delete("/:id", deleteInternalStructure);

/**
 * TOGGLE STATUS
 */
router.patch("/:id/toggle-status", toggleInternalStructureStatus);

/**
 * USER MANAGEMENT
 */
router.post("/assign-users", validateAssignUsers, assignUsersToInternalStructure);
router.post("/remove-user", validateRemoveUser, removeUserFromInternalStructure);

module.exports = router;