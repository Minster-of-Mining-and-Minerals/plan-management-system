const express = require("express");
const router = express.Router();
const {
  requestOTP,
  verifyOTP,
  resetPassword,
} = require("../../controllers/user/forgotPasswordController");

/**
 * @swagger
 * /api/auth/forgot-password/request-otp:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP sent message
 */
router.post("/request-otp", requestOTP);

/**
 * @swagger
 * /api/auth/forgot-password/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *     responses:
 *       200:
 *         description: OTP verified
 *       400:
 *         description: Invalid/expired OTP
 */
router.post("/verify-otp", verifyOTP);

/**
 * @swagger
 * /api/auth/forgot-password/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset success
 *       400:
 *         description: Invalid/expired OTP
 */
router.post("/reset-password", resetPassword);

module.exports = router;
