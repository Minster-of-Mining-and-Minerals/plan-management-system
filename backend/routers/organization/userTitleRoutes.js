"use strict";

const express = require("express");
const router = express.Router();

const {
  authenticateToken,
  checkPermission,
} = require("../../middlewares/authMiddleware");
const { requireInternalAccount } = require("../../middlewares/accountTypeMiddleware");

const {
  validateCreateUserTitle,
  validateUpdateUserTitle,
  validateUserTitleStatus,
} = require("../../validators/organization/userTitleValidator");

const {
  createUserTitle,
  getUserTitles,
  getUserTitleById,
  updateUserTitle,
  toggleUserTitleStatus,
  deleteUserTitle,
} = require("../../controllers/organization/userTitleController");

router.use(authenticateToken, requireInternalAccount);

/**
 * @swagger
 * tags:
 *   name: UserTitles
 *   description: Professional titles for internal hospital staff
 */

router.get("/", checkPermission("user_titles", "read"), getUserTitles);
router.get("/:id", checkPermission("user_titles", "read"), getUserTitleById);
router.post(
  "/",
  checkPermission("user_titles", "create"),
  validateCreateUserTitle,
  createUserTitle
);
router.put(
  "/:id",
  checkPermission("user_titles", "update"),
  validateUpdateUserTitle,
  updateUserTitle
);
router.patch(
  "/:id/status",
  checkPermission("user_titles", "update"),
  validateUserTitleStatus,
  toggleUserTitleStatus
);
router.delete(
  "/:id",
  checkPermission("user_titles", "delete"),
  deleteUserTitle
);

module.exports = router;
