const express = require("express");
const router = express.Router();
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserActiveStatus,
  resetUserPassword,
  getProfile,
  updateProfile,
  getUserDisplayNames,
} = require("../../controllers/user/userController");
const {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");
const {
  validateUpdateProfile,
} = require("../../validators/user/userValidator");

router.use(authenticateToken);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and retrieval
 */


/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, or phone number
 *     responses:
 *       200:
 *         description: List of users
 */
router.get(
  "/",
  checkAnyPermission([
    { resource: "USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
  ]),
  getUsers
);

router.get("/profile/me", getProfile);
router.patch("/profile/me", validateUpdateProfile, updateProfile);
router.post(
  "/display-names",
  checkAnyPermission([
    { resource: "USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
  ]),
  getUserDisplayNames
);

router.get(
  "/:id",
  checkAnyPermission([
    { resource: "USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
  ]),
  getUserById
);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - full_name
 *               - email
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               role_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: User created
 */
router.post(
  "/",
  checkAnyPermission([
    { resource: "USERS", action: "CREATE" },
    { resource: "REGIONAL_USERS", action: "CREATE" },
    { resource: "COMPANY_USERS", action: "CREATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "CREATE" },
  ]),
  createUser
);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               role_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated
 */
router.put(
  "/:id",
  checkAnyPermission([
    { resource: "USERS", action: "UPDATE" },
    { resource: "REGIONAL_USERS", action: "UPDATE" },
    { resource: "COMPANY_USERS", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "UPDATE" },
  ]),
  updateUser
);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Deactivate a user
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 */
router.delete(
  "/:id",
  checkAnyPermission([
    { resource: "USERS", action: "DELETE" },
    { resource: "REGIONAL_USERS", action: "DELETE" },
    { resource: "COMPANY_USERS", action: "DELETE" },
    { resource: "PURCHASING_CENTER_USERS", action: "DELETE" },
  ]),
  deleteUser
);

/**
 * @swagger
 * /users/{id}/toggle-status:
 *   patch:
 *     summary: Toggle user active status
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Status updated
 */
router.patch(
  "/:id/toggle-status",
  checkAnyPermission([
    { resource: "USERS", action: "UPDATE" },
    { resource: "REGIONAL_USERS", action: "UPDATE" },
    { resource: "COMPANY_USERS", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "UPDATE" },
  ]),
  toggleUserActiveStatus
);

/**
 * @swagger
 * /users/{id}/reset-password:
 *   post:
 *     summary: Reset user password
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post(
  "/:id/reset-password",
  checkAnyPermission([
    { resource: "USERS", action: "UPDATE" },
    { resource: "REGIONAL_USERS", action: "UPDATE" },
    { resource: "COMPANY_USERS", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "UPDATE" },
  ]),
  resetUserPassword
);

module.exports = router;
