"use strict";

const express = require("express");
const router = express.Router();
const regionalOperationalController = require("../../controllers/structure/regionalOperationalController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Regional dashboard summary
router.get(
  "/dashboard",
  checkAnyPermission([
    { resource: "REGIONAL_DASHBOARD", action: "VIEW" },
    { resource: "REGIONS", action: "READ" },
  ]),
  regionalOperationalController.getRegionalDashboard
);

// Regional assignable roles
router.get(
  "/roles",
  checkAnyPermission([
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "CREATE" },
    { resource: "REGIONAL_USERS", action: "UPDATE" },
    { resource: "REGIONAL_USERS", action: "ASSIGN_ROLE" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "READ" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "ROLES", action: "READ" },
    { resource: "USERS", action: "READ" },
    { resource: "USERS", action: "MANAGE" },
  ]),
  regionalOperationalController.getRegionalRoles
);

module.exports = router;
