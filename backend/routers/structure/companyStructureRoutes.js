"use strict";

const express = require("express");
const router = express.Router();
const companyStructureController = require("../../controllers/structure/companyStructureController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

router.get(
  "/",
  checkPermission("COMPANY_STRUCTURES", "READ"),
  companyStructureController.listStructures
);

router.get(
  "/:id",
  checkPermission("COMPANY_STRUCTURES", "READ"),
  companyStructureController.getStructureById
);

router.post(
  "/",
  checkPermission("COMPANY_STRUCTURES", "CREATE"),
  companyStructureController.createStructure
);

router.put(
  "/:id",
  checkPermission("COMPANY_STRUCTURES", "UPDATE"),
  companyStructureController.updateStructure
);

router.delete(
  "/:id",
  checkPermission("COMPANY_STRUCTURES", "DELETE"),
  companyStructureController.deleteStructure
);

module.exports = router;
