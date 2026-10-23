"use strict";

const express = require("express");
const router = express.Router();
const purchasingCenterOperationalController = require("../../controllers/structure/purchasingCenterOperationalController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Purchasing center dashboard summary
router.get(
  "/dashboard",
  checkAnyPermission([
    { resource: "PURCHASING_CENTER_DASHBOARD", action: "VIEW" },
    { resource: "PURCHASING_CENTERS", action: "READ" },
  ]),
  purchasingCenterOperationalController.getPurchasingCenterDashboard
);

// Purchasing center assignable roles
router.get(
  "/roles",
  checkAnyPermission([
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "CREATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "ASSIGN_ROLE" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "READ" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
    { resource: "ROLES", action: "READ" },
    { resource: "USERS", action: "READ" },
    { resource: "USERS", action: "MANAGE" },
  ]),
  purchasingCenterOperationalController.getPurchasingCenterRoles
);

module.exports = router;
