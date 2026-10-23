"use strict";

const express = require("express");
const router = express.Router();
const companyOperationalController = require("../../controllers/structure/companyOperationalController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

router.use(authenticateToken);

// Company dashboard summary
router.get(
  "/dashboard",
  checkAnyPermission([
    { resource: "COMPANY_DASHBOARD", action: "VIEW" },
    { resource: "COMPANIES", action: "READ" },
  ]),
  companyOperationalController.getCompanyDashboard
);

// Company assignable roles
router.get(
  "/roles",
  checkAnyPermission([
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "CREATE" },
    { resource: "COMPANY_USERS", action: "UPDATE" },
    { resource: "COMPANY_USERS", action: "ASSIGN_ROLE" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "READ" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "READ" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "ROLES", action: "READ" },
    { resource: "USERS", action: "READ" },
    { resource: "USERS", action: "MANAGE" },
  ]),
  companyOperationalController.getCompanyRoles
);

module.exports = router;
