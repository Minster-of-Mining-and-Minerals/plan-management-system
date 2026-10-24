const express = require("express");
const router = express.Router();

const {
  validateCreateRole,
  validateUpdateRole,
} = require("../../validators/user/roleValidator");

const {
  authenticateToken,
  checkPermission,
  checkAnyPermission,
} = require("../../middlewares/authMiddleware");

const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../../controllers/user/roleController");

router.use(authenticateToken);

router.post(
  "/",
  checkAnyPermission([
    { resource: "ROLES", action: "CREATE" },
    { resource: "REGIONAL_ROLES", action: "CREATE" },
    { resource: "REGIONAL_ROLES", action: "MANAGE" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "CREATE" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "CREATE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
  ]),
  validateCreateRole,
  createRole
);

router.get(
  "/",
  checkAnyPermission([
    { resource: "ROLES", action: "READ" },
    { resource: "REGIONAL_ROLES", action: "READ" },
    { resource: "REGIONAL_ROLES", action: "MANAGE" },
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "READ" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "READ" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "READ" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "READ" },
    { resource: "PURCHASING_CENTER_ROLES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "READ" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
  ]),
  getRoles
);

router.get(
  "/:id",
  checkAnyPermission([
    { resource: "ROLES", action: "READ" },
    { resource: "REGIONAL_ROLES", action: "READ" },
    { resource: "REGIONAL_ROLES", action: "MANAGE" },
    { resource: "REGIONAL_USERS", action: "READ" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "READ" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "READ" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "COMPANY_USERS", action: "READ" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "READ" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "READ" },
    { resource: "PURCHASING_CENTER_ROLES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_USERS", action: "READ" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "READ" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
  ]),
  getRoleById
);

router.put(
  "/:id",
  checkAnyPermission([
    { resource: "ROLES", action: "UPDATE" },
    { resource: "REGIONAL_ROLES", action: "UPDATE" },
    { resource: "REGIONAL_ROLES", action: "MANAGE" },
    { resource: "REGIONAL_USERS", action: "UPDATE" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "UPDATE" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "COMPANY_USERS", action: "UPDATE" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_USERS", action: "UPDATE" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
  ]),
  validateUpdateRole,
  updateRole
);

router.delete(
  "/:id",
  checkAnyPermission([
    { resource: "ROLES", action: "DELETE" },
    { resource: "REGIONAL_ROLES", action: "DELETE" },
    { resource: "REGIONAL_ROLES", action: "MANAGE" },
    { resource: "REGIONAL_USERS", action: "MANAGE" },
    { resource: "REGIONS", action: "MANAGE" },
    { resource: "COMPANY_ROLES", action: "DELETE" },
    { resource: "COMPANY_ROLES", action: "MANAGE" },
    { resource: "COMPANY_USERS", action: "MANAGE" },
    { resource: "COMPANIES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "DELETE" },
    { resource: "PURCHASING_CENTER_ROLES", action: "MANAGE" },
    { resource: "PURCHASING_CENTER_USERS", action: "MANAGE" },
    { resource: "PURCHASING_CENTERS", action: "MANAGE" },
  ]),
  deleteRole
);

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Manage system roles and their permissions
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PermissionRef:
 *       type: object
 *       properties:
 *         permission_id:
 *           type: string
 *         resource:
 *           type: string
 *         action:
 *           type: string
 *
 *     Role:
 *       type: object
 *       properties:
 *         role_id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         is_active:
 *           type: boolean
 *         rolePermissions:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               role_permission_id:
 *                 type: string
 *               permission:
 *                 $ref: '#/components/schemas/PermissionRef'
 *
 *     CreateRoleRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         permission_ids:
 *           type: array
 *           items:
 *             type: string
 *
 *     UpdateRoleRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         permission_ids:
 *           type: array
 *           items:
 *             type: string
 */

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role with permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRoleRequest'
 *     responses:
 *       201:
 *         description: Role created successfully
 *       400:
 *         description: Invalid payload or role already exists
 *
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     parameters:
 *       - in: query
 *         name: is_active
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of roles
 */

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get a specific role by ID
 *     tags: [Roles]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role found
 *       404:
 *         description: Role not found
 *
 *   put:
 *     summary: Update a role (including its permissions)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *     responses:
 *       200:
 *         description: Updated successfully
 *
 *   delete:
 *     summary: Soft delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       400:
 *         description: Cannot delete — role in use
 */

module.exports = router;
