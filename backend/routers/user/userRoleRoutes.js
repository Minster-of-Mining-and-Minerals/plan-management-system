"use strict";

const express = require("express");
const router = express.Router();
const {
  assignRolesToUser,
  removeRoleFromUser,
} = require("../../controllers/user/userRolesController");
const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

router.use(authenticateToken, requireInternalAccount);

router.post("/assign", checkPermission("users", "assign_role"), assignRolesToUser);
router.post("/remove", checkPermission("users", "assign_role"), removeRoleFromUser);

module.exports = router;
