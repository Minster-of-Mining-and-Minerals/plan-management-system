"use strict";

const express = require("express");
const router = express.Router();
const companyController = require("../../controllers/structure/companyController");
const { authenticateToken, checkPermission } = require("../../middlewares/authMiddleware");
const { isSuperAdminActor } = require("../../utils/structureScopeUtils");

// Public listing of active companies
router.get("/public", async (req, res) => {
  try {
    const companyService = require("../../services/companyService");
    const companies = await companyService.listCompanies({ is_active: true });
    return res.status(200).json({
      success: true,
      data: companies.map((c) => ({
        company_id: c.company_id,
        name: c.name,
        code: c.code,
        logo_path: c.logo_path,
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Authorization middleware: company users can access their assigned company; federal users require COMPANIES:READ
const authorizeCompanyRead = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_company) {
    if (req.user.company_id && req.user.company_id === req.params.id) {
      return next();
    }
    return res.status(403).json({
      success: false,
      message: "Access denied. Cannot access a different company's details.",
    });
  }

  if (req.user?.is_purchasing_center) {
    return res.status(403).json({
      success: false,
      message: "Purchasing center users cannot access company administrative details.",
    });
  }

  if (req.user?.is_regional) {
    return res.status(403).json({
      success: false,
      message: "Regional users cannot access company domain resources.",
    });
  }

  return checkPermission("COMPANIES", "READ")(req, res, next);
};

// Authorization middleware: company users can list companies (scoped to own company by controller); federal users require COMPANIES:READ
const authorizeCompanyList = (req, res, next) => {
  if (isSuperAdminActor(req)) {
    return next();
  }

  if (req.user?.is_company) {
    return next();
  }

  if (req.user?.is_purchasing_center) {
    return next();
  }

  if (req.user?.is_regional) {
    return res.status(403).json({
      success: false,
      message: "Regional users cannot access company domain resources.",
    });
  }

  return checkPermission("COMPANIES", "READ")(req, res, next);
};

router.use(authenticateToken);

router.get(
  "/",
  authorizeCompanyList,
  companyController.listCompanies
);

router.get(
  "/:id",
  authorizeCompanyRead,
  companyController.getCompanyById
);

router.post(
  "/",
  checkPermission("COMPANIES", "CREATE"),
  companyController.createCompany
);

router.put(
  "/:id",
  checkPermission("COMPANIES", "UPDATE"),
  companyController.updateCompany
);

router.patch(
  "/:id/status",
  checkPermission("COMPANIES", "UPDATE"),
  companyController.toggleCompanyActiveStatus
);

router.delete(
  "/:id",
  checkPermission("COMPANIES", "DELETE"),
  companyController.deleteCompany
);

module.exports = router;
