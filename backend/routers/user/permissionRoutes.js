const express = require("express");
const router = express.Router();
const permissionController = require("../../controllers/user/permissionController");

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: Permission management
 */

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Get all permissions
 *     tags: [Permissions]
 *     responses:
 *       200:
 *         description: List of permissions
 */
router.get("/", permissionController.getPermissions);

/**
 * @swagger
 * /permissions/activate/{permission_id}:
 *   put:
 *     summary: Activate a permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID to activate
 *     responses:
 *       200:
 *         description: Permission activated
 */
router.put("/activate/:permission_id", permissionController.activatePermission);

/**
 * @swagger
 * /permissions/deactivate/{permission_id}:
 *   put:
 *     summary: Deactivate a permission
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID to deactivate
 *     responses:
 *       200:
 *         description: Permission deactivated
 */
router.put(
  "/deactivate/:permission_id",
  permissionController.deactivatePermission
);

/**
 * @swagger
 * /permissions/toggle/{permission_id}:
 *   put:
 *     summary: Toggle permission status
 *     tags: [Permissions]
 *     parameters:
 *       - in: path
 *         name: permission_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID to toggle
 *     responses:
 *       200:
 *         description: Permission status toggled
 */
router.put("/toggle/:permission_id", permissionController.togglePermission);

module.exports = router;
