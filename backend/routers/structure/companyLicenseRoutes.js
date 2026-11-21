"use strict";

const express = require("express");
const router = express.Router();
const companyLicenseController = require("../../controllers/structure/companyLicenseController");
const { authenticateToken, checkAnyPermission } = require("../../middlewares/authMiddleware");

const licenseReadAccess = checkAnyPermission([
  { resource: "company_licenses", action: "read" },
  { resource: "company_licenses", action: "manage" },
  { resource: "companies", action: "read" },
  { resource: "companies", action: "manage" },
]);

const licenseManageAccess = checkAnyPermission([
  { resource: "company_licenses", action: "create" },
  { resource: "company_licenses", action: "update" },
  { resource: "company_licenses", action: "manage" },
  { resource: "companies", action: "manage" },
]);

router.use(authenticateToken);

router.get("/", licenseReadAccess, companyLicenseController.listLicenses);
router.get("/:id", licenseReadAccess, companyLicenseController.getLicenseById);
router.post("/", licenseManageAccess, companyLicenseController.createLicense);
router.put("/:id", licenseManageAccess, companyLicenseController.updateLicense);
router.delete("/:id", licenseManageAccess, companyLicenseController.deleteLicense);

module.exports = router;
