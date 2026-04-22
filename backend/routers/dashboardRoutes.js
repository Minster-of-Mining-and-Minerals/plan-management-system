// routers/dashboardRoutes.js
const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
// const { authenticateToken } = require("../middlewares/authMiddleware");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard statistics and summaries
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get overall dashboard statistics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: sectorNodeId
 *         schema:
 *           type: string
 *         description: Optional sector node ID to filter statistics
 *     responses:
 *       200:
 *         description: Dashboard statistics fetched successfully
 */
router.get("/stats", dashboardController.getDashboardStats);

/**
 * @swagger
 * /dashboard/stats/summary:
 *   get:
 *     summary: Get condensed dashboard summary
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard summary fetched successfully
 */
router.get("/stats/summary", dashboardController.getDashboardSummary);

module.exports = router;
