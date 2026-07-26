"use strict";

const express = require("express");
const router = express.Router();
const tenantController = require("../controllers/organization/tenantController");
const { authenticateToken, checkPermission } = require("../middlewares/authMiddleware");

// Public/Open branding endpoint for shell loading
router.get("/branding", tenantController.getTenantBranding);

// Protected routes requiring authentication
router.use(authenticateToken);

// Tenant Endpoints
router.post(
  "/tenants",
  checkPermission("tenant", "tenant:create"),
  tenantController.createTenant
);
router.get("/tenants", tenantController.listTenants);
router.get("/tenants/:id", tenantController.getTenant);
router.put(
  "/tenants/:id",
  checkPermission("tenant", "tenant:update"),
  tenantController.updateTenant
);

// Facility Endpoints
router.post(
  "/facilities",
  checkPermission("facility", "facility:create"),
  tenantController.createFacility
);
router.get("/facilities", tenantController.listFacilities);
router.get("/facilities/:id", tenantController.getFacility);
router.put(
  "/facilities/:id",
  checkPermission("facility", "facility:manage"),
  tenantController.updateFacility
);

// Unit Endpoints
router.post("/units", tenantController.createUnit);
router.get("/units", tenantController.listUnits);

// User Facility Assignments
router.post("/user-facility-assignments", tenantController.assignUserFacility);
router.get("/user-facility-assignments/my", tenantController.getMyFacilityAssignments);

// Tenant Branding Endpoint
router.put(
  "/branding",
  checkPermission("facility", "facility:configuration"),
  tenantController.updateTenantBranding
);

// Patient Identity Endpoints
router.post("/patient-identity/register-facility", tenantController.registerPatientFacility);
router.get("/patient-identity/:id", tenantController.getGlobalPatientIdentity);

module.exports = router;
