"use strict";

const express = require("express");
const router = express.Router();
const regionalStructureController = require("../../controllers/structure/regionalStructureController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("REGIONAL_STRUCTURES", "READ"),
  regionalStructureController.listStructures
);

router.get(
  "/:id",
  checkPermission("REGIONAL_STRUCTURES", "READ"),
  regionalStructureController.getStructureById
);

router.post(
  "/",
  checkPermission("REGIONAL_STRUCTURES", "CREATE"),
  regionalStructureController.createStructure
);

router.put(
  "/:id",
  checkPermission("REGIONAL_STRUCTURES", "UPDATE"),
  regionalStructureController.updateStructure
);

router.delete(
  "/:id",
  checkPermission("REGIONAL_STRUCTURES", "DELETE"),
  regionalStructureController.deleteStructure
);

router.post(
  "/:id/users",
  checkPermission("REGIONAL_STRUCTURES", "UPDATE"),
  regionalStructureController.assignUsers
);

router.delete(
  "/:id/users/:user_id",
  checkPermission("REGIONAL_STRUCTURES", "UPDATE"),
  regionalStructureController.removeUser
);

module.exports = router;
