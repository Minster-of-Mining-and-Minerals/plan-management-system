const express = require("express");
const router = express.Router();
const { changePassword } = require("../../controllers/user/passwordChangeController");
const { authenticateToken } = require("../../middlewares/authMiddleware");

/**
 * @swagger
 * /api/change-password:
 *   put:
 *     summary: Change user password
 *     description: Allows an authenticated user to change their password. Requires a valid JWT token.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []    # Uses JWT Bearer token authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *               - confirm_password
 *               - confirm_change
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: OldPass123
 *               new_password:
 *                 type: string
 *                 example: NewPass456
 *               confirm_password:
 *                 type: string
 *                 example: NewPass456
 *               confirm_change:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Invalid input or confirmation not provided
 *       401:
 *         description: Access token required
 *       403:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put("/", authenticateToken, changePassword);

module.exports = router;
